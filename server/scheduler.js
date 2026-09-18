let agenda = null;
let initialized = false;

async function getAgenda() {
  if (agenda) return agenda;

  const { Agenda } = require('agenda');
  const { MongoBackend } = require('@agendajs/mongo-backend');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/leddgerai';

  agenda = new Agenda({
    backend: new MongoBackend({ address: mongoUri, collection: 'agendaJobs' }),
    processEvery: '30 seconds',
    maxConcurrency: 5,
    defaultConcurrency: 1,
  });

  // Define the send campaign job
  agenda.define('send email campaign', { priority: 'high', concurrency: 1 }, async (job) => {
    const { campaignId } = job.attrs.data;
    const EmailCampaign = require('./models/EmailCampaign');
    const EmailDraft = require('./models/EmailDraft');
    const EmailAccount = require('./models/EmailAccount');
    const { buildTransporterFromAccount, resolveEmailAccount } = require('./utils/emailAccount');
    const { substituteTemplateVars } = require('./utils/emailTemplate');
    const supabase = require('./supabaseClient');

    const campaign = await EmailCampaign.findById(campaignId);
    if (!campaign) {
      console.error(`[Scheduler] Campaign ${campaignId} not found`);
      return;
    }

    if (campaign.status === 'sent' || campaign.status === 'cancelled') {
      console.log(`[Scheduler] Campaign ${campaignId} already ${campaign.status}, skipping`);
      return;
    }

    const draft = await EmailDraft.findById(campaign.draftId);
    if (!draft) {
      console.error(`[Scheduler] Draft not found for campaign ${campaignId}`);
      campaign.status = 'failed';
      await campaign.save();
      return;
    }

    const account = campaign.accountId
      ? await EmailAccount.findOne({ _id: campaign.accountId, ownerUid: campaign.ownerUid })
      : await resolveEmailAccount(EmailAccount, campaign.ownerUid, null);
    if (!account) {
      console.error(`[Scheduler] No email account for user ${campaign.ownerUid}`);
      campaign.status = 'failed';
      await campaign.save();
      return;
    }

    // Build transporter
    const transporter = await buildTransporterFromAccount(account);

    // Suppression filter (shared with immediate send)
    let suppressedSet = new Set();
    try {
      const EmailSuppression = require('./models/EmailSuppression');
      const docs = await EmailSuppression.find({ ownerUid: campaign.ownerUid }).select('email').lean();
      suppressedSet = new Set((docs || []).map(d => String(d.email).toLowerCase()));
    } catch (_) { /* suppression optional — send anyway */ }

    // Send emails
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of campaign.recipients) {
      if (recipient.status === 'sent') continue;
      if (suppressedSet.has(String(recipient.email).toLowerCase())) {
        recipient.status = 'failed';
        recipient.error = 'suppressed (unsubscribed/bounced)';
        failedCount++;
        continue;
      }
      try {
        const subject = substituteTemplateVars(draft.subject, recipient.variables);
        let bodyHtml = substituteTemplateVars(draft.bodyHtml, recipient.variables);
        const leftover = /{{\s*[A-Za-z0-9_. ]+?\s*}}/.exec(subject + ' ' + bodyHtml);
        if (leftover) {
          throw new Error(`Unmapped variable ${leftover[0]} — bind every {{pill}} to a column before sending`);
        }
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        const unsubUrl = `${frontendUrl}/unsubscribe?campaign=${campaign._id}&email=${encodeURIComponent(recipient.email)}`;
        if (bodyHtml && !bodyHtml.includes('unsubscribe')) {
          bodyHtml += `<br><br><p style="font-size:12px;color:#888;">Don't want these emails? <a href="${unsubUrl}">Unsubscribe</a></p>`;
        }

        await transporter.sendMail({
          from: account.email,
          to: recipient.email,
          subject,
          html: bodyHtml,
          headers: {
            'List-Unsubscribe': `<${unsubUrl}>, <mailto:${account.email}?subject=unsubscribe>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        });

        recipient.status = 'sent';
        recipient.sentAt = new Date();
        sentCount++;
      } catch (err) {
        recipient.status = 'failed';
        recipient.error = err.message;
        failedCount++;
      }
    }

    campaign.sentCount = sentCount;
    campaign.failedCount = failedCount;
    campaign.status = sentCount > 0 ? 'sent' : 'failed';
    campaign.sentAt = new Date();
    await campaign.save();

    // Insert into Supabase email_send_log
    await supabase.from('email_send_log').insert({
      user_id: campaign.ownerUid,
      campaign_id: campaign._id.toString(),
      draft_id: campaign.draftId.toString(),
      draft_title: draft.subject || 'Untitled',
      sender_email: account.email,
      recipient_count: campaign.recipients.length,
      sent_count: sentCount,
      failed_count: failedCount,
      status: campaign.status,
      sent_at: new Date().toISOString()
    });

    console.log(`[Scheduler] Campaign ${campaignId} sent: ${sentCount} sent, ${failedCount} failed`);
  });

  // Define the activate form draft job
  agenda.define('activate form draft', { priority: 'high', concurrency: 1 }, async (job) => {
    const { draftId } = job.attrs.data;
    const supabase = require('./supabaseClient');

    const { error } = await supabase
      .from('form_drafts')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('draft_id', draftId);

    if (error) {
      console.error(`[Scheduler] Failed to activate draft ${draftId}:`, error.message);
    } else {
      console.log(`[Scheduler] Draft ${draftId} activated (link is now live)`);
    }
  });

  // Define the send analytics report job (Phase 5)
  agenda.define('send analytics report', { priority: 'normal', concurrency: 1 }, async (job) => {
    const { reportId } = job.attrs.data;
    const AnalyticsReport = require('./models/AnalyticsReport');
    const EmailAccount = require('./models/EmailAccount');
    const { buildTransporterFromAccount, resolveEmailAccount } = require('./utils/emailAccount');
    const {
      buildOverviewContent,
      buildTemplateContent,
    } = require('./utils/analyticsExport');

    const report = await AnalyticsReport.findById(reportId);
    if (!report) {
      console.error(`[Scheduler] Analytics report ${reportId} not found`);
      return;
    }
    if (report.status !== 'active') {
      console.log(`[Scheduler] Analytics report ${reportId} is ${report.status}, skipping run`);
      return;
    }

    const run = { runAt: new Date(), status: 'success', error: null, recipients: report.recipientEmails.length };
    try {
      // Build the report file content.
      let content, mimeType, ext, baseName;
      if (report.scope === 'template') {
        const result = await buildTemplateContent(report.ownerUid, report.draftId, report.format);
        if (!result) throw new Error('Template not found for scheduled report');
        ({ content, mimeType, ext, baseName } = result);
      } else {
        const result = await buildOverviewContent(report.ownerUid, report.format);
        ({ content, mimeType, ext } = result);
        baseName = 'analytics-overview';
      }

      const filename = `${baseName}-${new Date().toISOString().slice(0, 10)}.${ext}`;

      // Resolve a transporter: prefer the user's configured email account,
      // fall back to the global Gmail OAuth2 transporter.
      let transporter;
      let fromEmail;
      const account = await resolveEmailAccount(EmailAccount, report.ownerUid, null);
      if (account) {
        transporter = await buildTransporterFromAccount(account);
        fromEmail = account.email;
      } else {
        const { createTransporter } = require('./utils/emailService');
        transporter = await createTransporter();
        fromEmail = process.env.GOOGLE_EMAIL;
      }

      const subject = `Leddger-AI Analytics Report: ${report.name}`;
      const html = `
        <h2>${report.name}</h2>
        <p>Your scheduled <strong>${report.frequency}</strong> analytics report is attached.</p>
        <p>Scope: ${report.scope}${report.scope === 'template' ? ` (${report.draftId})` : ''} &middot; Format: ${report.format.toUpperCase()}</p>
        <p style="color:#64748b;font-size:12px;">Generated ${new Date().toLocaleString()} by Leddger-AI</p>
      `;

      const attachments = [{
        filename,
        content: Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8'),
      }];

      for (const to of report.recipientEmails) {
        await transporter.sendMail({ from: fromEmail, to, subject, html, attachments });
      }

      console.log(`[Scheduler] Analytics report ${reportId} sent to ${report.recipientEmails.length} recipient(s)`);
    } catch (err) {
      run.status = 'failed';
      run.error = err.message;
      console.error(`[Scheduler] Analytics report ${reportId} failed:`, err.message);
    }

    report.pushRun(run);
    await report.save();
  });

  await agenda.start();
  initialized = true;
  console.log('✅ Agenda scheduler started');

  return agenda;
}

async function scheduleCampaign(campaignId, sendAt) {
  const a = await getAgenda();
  await a.schedule(sendAt, 'send email campaign', { campaignId });
  console.log(`[Scheduler] Campaign ${campaignId} scheduled for ${sendAt}`);
}

async function cancelScheduledCampaign(campaignId) {
  const a = await getAgenda();
  await a.cancel({ name: 'send email campaign', 'data.campaignId': campaignId });
  console.log(`[Scheduler] Campaign ${campaignId} cancelled`);
}

async function scheduleDraftActivation(draftId, goesLiveAt) {
  const a = await getAgenda();
  await a.schedule(goesLiveAt, 'activate form draft', { draftId });
  console.log(`[Scheduler] Draft ${draftId} scheduled to go live at ${goesLiveAt}`);
}

async function cancelDraftActivation(draftId) {
  const a = await getAgenda();
  await a.cancel({ name: 'activate form draft', 'data.draftId': draftId });
  console.log(`[Scheduler] Draft ${draftId} activation cancelled`);
}

// --- Analytics scheduled reports (Phase 5) ---

const REPORT_INTERVALS = {
  daily: '1 day',
  weekly: '1 week',
  monthly: '1 month',
};

async function scheduleAnalyticsReport(reportId, frequency) {
  const interval = REPORT_INTERVALS[frequency] || REPORT_INTERVALS.daily;
  const a = await getAgenda();
  // Cancel any prior instance for this report before (re)scheduling.
  await a.cancel({ name: 'send analytics report', 'data.reportId': reportId });
  await a.every(interval, 'send analytics report', { reportId });
  console.log(`[Scheduler] Analytics report ${reportId} scheduled ${frequency}`);
}

async function cancelAnalyticsReport(reportId) {
  const a = await getAgenda();
  await a.cancel({ name: 'send analytics report', 'data.reportId': reportId });
  console.log(`[Scheduler] Analytics report ${reportId} cancelled`);
}

async function stopAgenda() {
  if (agenda) {
    await agenda.stop();
    console.log('✅ Agenda scheduler stopped');
  }
}

module.exports = {
  getAgenda,
  scheduleCampaign,
  cancelScheduledCampaign,
  stopAgenda,
  scheduleDraftActivation,
  cancelDraftActivation,
  scheduleAnalyticsReport,
  cancelAnalyticsReport,
};
