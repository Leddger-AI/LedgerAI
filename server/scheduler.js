let agenda = null;
let initialized = false;
let agendaInitPromise = null;

async function getAgenda() {
  if (initialized && agenda) return agenda;
  // Cache the init promise (not just the instance) so concurrent callers
  // can't construct two Agendas that both start and double-fire jobs.
  if (agendaInitPromise) return agendaInitPromise;
  agendaInitPromise = initAgenda().catch((err) => {
    agendaInitPromise = null;
    agenda = null;
    initialized = false;
    throw err;
  });
  return agendaInitPromise;
}

async function initAgenda() {
  const { Agenda } = require('agenda');
  const { MongoBackend } = require('@agendajs/mongo-backend');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/leddgerai';

  agenda = new Agenda({
    backend: new MongoBackend({ address: mongoUri, collection: 'agendaJobs' }),
    processEvery: process.env.AGENDA_PROCESS_EVERY || '30 seconds',
    maxConcurrency: 5,
    defaultConcurrency: 1,
  });

  // Define the send campaign job
  agenda.define('send email campaign', async (job) => {
    const { processCampaign } = require('./utils/emailCampaignFlow');
    await processCampaign(job.attrs.data.campaignId);
  }, { priority: 'high', concurrency: 1 });

  // Define the activate form draft job
  agenda.define('activate form draft', async (job) => {
    const { draftId, goesLiveAt } = job.attrs.data;
    const { activateScheduledForm } = require('./utils/formActivation');
    const activated = await activateScheduledForm(draftId, goesLiveAt);
    if (activated) console.log(`[Scheduler] Draft ${draftId} activated (link is now live)`);
  }, { priority: 'high', concurrency: 1 });

  // Define the send analytics report job (Phase 5)
  agenda.define('send analytics report', async (job) => {
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
  }, { priority: 'normal', concurrency: 1 });

  await agenda.start();
  initialized = true;
  console.log('✅ Agenda scheduler started');

  return agenda;
}

async function scheduleCampaign(campaignId, sendAt) {
  const a = await getAgenda();
  // Cancel any prior job for this campaign first — rescheduling (retry,
  // double-click) must not create duplicate jobs that mass-mail twice.
  await a.cancel({ name: 'send email campaign', data: { campaignId } });
  await a.schedule(sendAt, 'send email campaign', { campaignId });
  console.log(`[Scheduler] Campaign ${campaignId} scheduled for ${sendAt}`);
}

async function cancelScheduledCampaign(campaignId) {
  const a = await getAgenda();
  await a.cancel({ name: 'send email campaign', data: { campaignId } });
  console.log(`[Scheduler] Campaign ${campaignId} cancelled`);
}

async function scheduleDraftActivation(draftId, goesLiveAt) {
  const a = await getAgenda();
  // Cancel any prior activation job for this draft before (re)scheduling.
  await a.cancel({ name: 'activate form draft', data: { draftId } });
  await a.schedule(goesLiveAt, 'activate form draft', { draftId, goesLiveAt: new Date(goesLiveAt).toISOString() });
  console.log(`[Scheduler] Draft ${draftId} scheduled to go live at ${goesLiveAt}`);
}

async function cancelDraftActivation(draftId) {
  const a = await getAgenda();
  await a.cancel({ name: 'activate form draft', data: { draftId } });
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
  await a.cancel({ name: 'send analytics report', data: { reportId } });
  await a.every(interval, 'send analytics report', { reportId });
  console.log(`[Scheduler] Analytics report ${reportId} scheduled ${frequency}`);
}

async function cancelAnalyticsReport(reportId) {
  const a = await getAgenda();
  await a.cancel({ name: 'send analytics report', data: { reportId } });
  console.log(`[Scheduler] Analytics report ${reportId} cancelled`);
}

async function stopAgenda() {
  if (agenda) {
    await agenda.stop();
    initialized = false;
    agenda = null;
    agendaInitPromise = null;
    console.log('✅ Agenda scheduler stopped');
  }
}

function isAgendaReady() {
  return !!(initialized && agenda &&
    ['send email campaign', 'activate form draft', 'send analytics report']
      .every(name => typeof agenda.definitions?.[name]?.fn === 'function'));
}

module.exports = {
  getAgenda,
  isAgendaReady,
  scheduleCampaign,
  cancelScheduledCampaign,
  stopAgenda,
  scheduleDraftActivation,
  cancelDraftActivation,
  scheduleAnalyticsReport,
  cancelAnalyticsReport,
};
