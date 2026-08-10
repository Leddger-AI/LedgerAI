let agenda = null;
let initialized = false;

async function getAgenda() {
  if (agenda) return agenda;

  const { Agenda } = await import('agenda');
  const { MongoBackend } = await import('@agendajs/mongo-backend');

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
    const EmailConfig = require('./models/EmailConfig');
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

    const config = await EmailConfig.findOne({ ownerUid: campaign.ownerUid });
    if (!config) {
      console.error(`[Scheduler] No email config for user ${campaign.ownerUid}`);
      campaign.status = 'failed';
      await campaign.save();
      return;
    }

    // Build transporter
    const nodemailer = require('nodemailer');
    let transporter;

    if (config.authMethod === 'oauth2') {
      const { google } = require('googleapis');
      const OAuth2 = google.auth.OAuth2;
      const oauth2Client = new OAuth2(
        config.clientId,
        config.clientSecret,
        'https://developers.google.com/oauthplayground'
      );
      oauth2Client.setCredentials({ refresh_token: config.refreshToken });

      const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
          if (err) reject(err);
          resolve(token);
        });
      });

      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: config.email,
          accessToken,
          clientId: config.clientId,
          clientSecret: config.clientSecret,
          refreshToken: config.refreshToken,
        },
      });
    } else {
      transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.email,
          pass: config.appPassword,
        },
      });
    }

    // Send emails
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of campaign.recipients) {
      if (recipient.status === 'sent') continue;
      try {
        let subject = draft.subject || '';
        let bodyHtml = draft.bodyHtml || '';

        for (const [key, value] of Object.entries(recipient.variables || {})) {
          const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
          subject = subject.replace(placeholder, value || '');
          bodyHtml = bodyHtml.replace(placeholder, value || '');
        }

        await transporter.sendMail({
          from: config.email,
          to: recipient.email,
          subject,
          html: bodyHtml,
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
      sender_email: config.email,
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

async function stopAgenda() {
  if (agenda) {
    await agenda.stop();
    console.log('✅ Agenda scheduler stopped');
  }
}

module.exports = { getAgenda, scheduleCampaign, cancelScheduledCampaign, stopAgenda, scheduleDraftActivation, cancelDraftActivation };
