const crypto = require('crypto');
const EmailCampaign = require('../models/EmailCampaign');
const EmailDraft = require('../models/EmailDraft');
const EmailAccount = require('../models/EmailAccount');
const EmailSuppression = require('../models/EmailSuppression');
const supabase = require('../supabaseClient');
const { resolveEmailAccount, buildTransporterFromAccount } = require('./emailAccount');
const { substituteTemplateVars, isValidEmail } = require('./emailTemplate');

const error = (status, message) => Object.assign(new Error(message), { status });
const terminal = ['sent', 'partial', 'failed', 'needs_review', 'cancelled'];
const escapeHtml = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function unsubscribeToken(campaignId, email) {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || !/^[a-f0-9]{64}$/i.test(key)) throw error(503, 'Email signing is not configured');
  const data = Buffer.from(JSON.stringify([String(campaignId), String(email).trim().toLowerCase()])).toString('base64url');
  const signature = crypto.createHmac('sha256', Buffer.from(key, 'hex')).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function parseUnsubscribeToken(token) {
  if (typeof token !== 'string' || token.length > 2048) throw error(400, 'Invalid unsubscribe link');
  const [data, signature, extra] = token.split('.');
  if (!data || !signature || extra) throw error(400, 'Invalid unsubscribe link');
  let expected;
  try { expected = unsubscribeToken(...JSON.parse(Buffer.from(data, 'base64url').toString('utf8')).slice(0, 2)).split('.')[1]; }
  catch (_) { throw error(400, 'Invalid unsubscribe link'); }
  const actual = Buffer.from(signature);
  const valid = Buffer.from(expected);
  if (actual.length !== valid.length || !crypto.timingSafeEqual(actual, valid)) throw error(400, 'Invalid unsubscribe link');
  const pair = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  if (!Array.isArray(pair) || pair.length !== 2 || !/^[a-f\d]{24}$/i.test(pair[0]) || !isValidEmail(pair[1])) throw error(400, 'Invalid unsubscribe link');
  return { campaignId: pair[0], email: pair[1] };
}

function publicApiBaseUrl() {
  const raw = process.env.PUBLIC_API_URL || process.env.RENDER_EXTERNAL_URL ||
    (process.env.NODE_ENV === 'production' ? '' : `http://localhost:${process.env.PORT || 5000}`);
  let url;
  try { url = new URL(raw); } catch (_) { throw error(503, 'Public email API URL is not configured'); }
  const local = ['localhost', '127.0.0.1'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password) {
    throw error(503, 'Public email API URL must use HTTPS');
  }
  return url.origin;
}

function validateInput(body, scheduled) {
  const { draftId, recipients, scheduledAt, accountId, requestId } = body || {};
  if (!draftId || !/^[a-f\d]{24}$/i.test(draftId)) throw error(400, 'Valid draftId is required');
  if (!Array.isArray(recipients) || !recipients.length || recipients.length > 500) throw error(400, 'Recipients must contain 1 to 500 entries');
  if (recipients.some(r => !r || !isValidEmail(r.email) || (r.variables != null && (typeof r.variables !== 'object' || Array.isArray(r.variables))))) throw error(400, 'Invalid recipient email or variables');
  if (accountId && !/^[a-f\d]{24}$/i.test(accountId)) throw error(400, 'Invalid accountId format');
  if (requestId && (typeof requestId !== 'string' || requestId.length > 100)) throw error(400, 'Invalid requestId');
  if (!scheduled) return new Date();
  if (!scheduledAt) throw error(400, 'scheduledAt is required');
  const date = new Date(scheduledAt);
  if (!Number.isFinite(date.getTime())) throw error(400, 'Invalid scheduledAt date');
  if (date <= new Date()) throw error(400, 'scheduledAt must be in the future');
  return date;
}

async function createCampaign(ownerUid, body, scheduled) {
  if (body?.requestId && (typeof body.requestId !== 'string' || body.requestId.length > 100)) throw error(400, 'Invalid requestId');
  if (body?.requestId) {
    const existing = await EmailCampaign.findOne({ ownerUid, requestId: body.requestId });
    if (existing) return { campaign: existing, existing: true };
  }
  const sendAt = validateInput(body, scheduled);
  const draft = await EmailDraft.findOne({ _id: body.draftId, ownerUid });
  if (!draft) throw error(404, 'Draft not found');
  const account = await resolveEmailAccount(EmailAccount, ownerUid, body.accountId);
  if (!account) throw error(400, 'No email account configured. Please add an email account first.');
  const recipients = body.recipients.map(r => ({ email: r.email.trim(), name: r.name || '', variables: r.variables || {}, status: 'pending' }));
  let campaign;
  try {
    campaign = await EmailCampaign.create({
      ownerUid, name: body.campaignName || `Campaign ${new Date().toLocaleDateString()}`,
      draftId: draft._id, accountId: account._id, requestId: body.requestId || undefined,
      status: scheduled ? 'scheduled' : 'queued', scheduledAt: sendAt,
      snapshot: { subject: draft.subject, bodyHtml: draft.bodyHtml, senderEmail: account.email }, recipients,
    });
  } catch (err) {
    if (err.code === 11000 && body.requestId) {
      const existing = await EmailCampaign.findOne({ ownerUid, requestId: body.requestId });
      if (existing) return { campaign: existing, existing: true };
    }
    throw err;
  }
  try {
    const { scheduleCampaign } = require('../scheduler');
    await scheduleCampaign(campaign._id.toString(), sendAt);
  } catch (err) {
    campaign.status = 'failed';
    campaign.lastError = `Could not queue campaign: ${err.message}`;
    await campaign.save();
    throw error(503, campaign.lastError);
  }
  return { campaign, existing: false };
}

function renderMessage(snapshot, recipient) {
  const subject = substituteTemplateVars(snapshot.subject, recipient.variables);
  const html = substituteTemplateVars(snapshot.bodyHtml, Object.fromEntries(Object.entries(recipient.variables || {}).map(([key, value]) => [key, escapeHtml(value)])));
  const leftover = /{{[^{}]*}}/.exec(`${subject} ${html}`);
  if (leftover) throw new Error(`Unmapped variable ${leftover[0]}`);
  return { subject, html };
}

async function updateRecipient(campaignId, recipientId, status, fields = {}) {
  await EmailCampaign.updateOne({ _id: campaignId, 'recipients._id': recipientId }, {
    $set: Object.fromEntries(Object.entries({ status, ...fields }).map(([key, value]) => [`recipients.$.${key}`, value])),
  });
}

async function finishCampaign(campaignId, lastError = null) {
  const campaign = await EmailCampaign.findById(campaignId);
  const count = status => campaign.recipients.filter(r => r.status === status).length;
  campaign.sentCount = count('sent') + count('opened');
  campaign.failedCount = count('failed');
  campaign.suppressedCount = count('suppressed');
  if (count('unknown') || count('sending') || count('pending')) campaign.status = 'needs_review';
  else if (campaign.sentCount && (campaign.failedCount || campaign.suppressedCount)) campaign.status = 'partial';
  else if (campaign.sentCount) campaign.status = 'sent';
  else campaign.status = 'failed';
  campaign.lastError = lastError;
  campaign.sentAt = new Date();
  await campaign.save();
  if (!campaign.loggedAt && supabase) {
    const row = {
      user_id: campaign.ownerUid, campaign_id: campaign._id.toString(), draft_id: campaign.draftId.toString(),
      draft_title: campaign.snapshot?.subject || 'Untitled', sender_email: campaign.snapshot?.senderEmail || '',
      recipient_count: campaign.recipients.length, sent_count: campaign.sentCount,
      failed_count: campaign.failedCount, status: campaign.status, sent_at: campaign.sentAt.toISOString(),
    };
    try {
      const { error: logError } = await supabase.from('email_send_log').upsert(row, { onConflict: 'user_id,campaign_id' });
      if (logError) throw logError;
      campaign.loggedAt = new Date();
      await campaign.save();
    } catch (err) { console.error('[Scheduler] Could not write email_send_log:', err); }
  }
  return campaign;
}

async function processCampaign(campaignId) {
  const campaign = await EmailCampaign.findOneAndUpdate(
    { _id: campaignId, status: { $in: ['queued', 'scheduled'] }, scheduledAt: { $lte: new Date() } },
    { $set: { status: 'sending', startedAt: new Date() } }, { returnDocument: 'after' }
  );
  if (!campaign) return;
  try {
    const draft = campaign.snapshot?.subject || campaign.snapshot?.bodyHtml
      ? campaign.snapshot : await EmailDraft.findById(campaign.draftId);
    if (!draft) throw new Error('Draft no longer exists');
    const account = campaign.accountId
      ? await EmailAccount.findOne({ _id: campaign.accountId, ownerUid: campaign.ownerUid })
      : await resolveEmailAccount(EmailAccount, campaign.ownerUid, null);
    if (!account) throw new Error('Sender account is unavailable');
    const transporter = await buildTransporterFromAccount(account);
    if (campaign.snapshot?.senderEmail !== account.email) {
      await EmailCampaign.updateOne({ _id: campaign._id }, { $set: { 'snapshot.senderEmail': account.email } });
    }
    for (const recipient of campaign.recipients) {
      if (recipient.status !== 'pending') continue;
      const claimed = await EmailCampaign.updateOne(
        { _id: campaign._id, status: 'sending', recipients: { $elemMatch: { _id: recipient._id, status: 'pending' } } },
        { $set: { 'recipients.$.status': 'sending' } }
      );
      if (!claimed.modifiedCount) continue;
      let smtpAccepted = false;
      try {
        const suppressed = await EmailSuppression.exists({ ownerUid: campaign.ownerUid, email: recipient.email.toLowerCase() });
        if (suppressed) { await updateRecipient(campaign._id, recipient._id, 'suppressed'); continue; }
        const recent = await EmailCampaign.aggregate([
          { $match: { ownerUid: campaign.ownerUid, $or: [
            { startedAt: { $gte: new Date(Date.now() - 86400000) } },
            { startedAt: null, createdAt: { $gte: new Date(Date.now() - 86400000) } },
          ] } },
          { $group: { _id: null, total: { $sum: '$sentCount' } } },
        ]);
        if ((recent[0]?.total || 0) >= 2000) throw new Error('Daily send limit reached');
        const { subject, html } = renderMessage(draft, recipient);
        const token = unsubscribeToken(campaign._id, recipient.email);
        const url = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')}/unsubscribe?token=${encodeURIComponent(token)}`;
        const oneClickUrl = `${publicApiBaseUrl()}/api/email/unsubscribe/one-click?token=${encodeURIComponent(token)}`;
        const bodyHtml = `${html}<br><br><p style="font-size:12px;color:#888;">Don't want these emails? <a href="${url}">Unsubscribe</a></p>`;
        await transporter.sendMail({ from: account.email, to: recipient.email, subject, html: bodyHtml,
          headers: { 'List-Unsubscribe': `<${oneClickUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
        smtpAccepted = true;
        await updateRecipient(campaign._id, recipient._id, 'sent', { sentAt: new Date(), error: null });
        await EmailCampaign.updateOne({ _id: campaign._id }, { $inc: { sentCount: 1 } });
      } catch (err) {
        // SMTP acceptance followed by a DB error, or a connection timeout,
        // has an uncertain delivery result. Never retry it automatically.
        if (smtpAccepted || ['ETIMEDOUT', 'ECONNRESET', 'ECONNABORTED'].includes(err.code)) {
          await updateRecipient(campaign._id, recipient._id, 'unknown', { error: `Delivery result uncertain: ${err.message}` });
        } else {
          await updateRecipient(campaign._id, recipient._id, 'failed', { error: err.message });
        }
      }
    }
    return await finishCampaign(campaign._id);
  } catch (err) {
    console.error(`[Scheduler] Campaign ${campaignId} stopped:`, err);
    const fresh = await EmailCampaign.findById(campaign._id);
    for (const r of fresh.recipients.filter(r => r.status === 'sending')) await updateRecipient(campaign._id, r._id, 'unknown', { error: 'Delivery result uncertain after interruption' });
    return finishCampaign(campaign._id, err.message);
  }
}

async function recoverInterruptedCampaigns() {
  const interrupted = await EmailCampaign.find({ status: 'sending' });
  for (const campaign of interrupted) {
    for (const r of campaign.recipients.filter(r => r.status === 'sending')) await updateRecipient(campaign._id, r._id, 'unknown', { error: 'Delivery result uncertain after restart' });
    await finishCampaign(campaign._id, 'Worker restarted during delivery');
  }
}

async function requeueWaitingCampaigns() {
  const { scheduleCampaign } = require('../scheduler');
  const waiting = await EmailCampaign.find({ status: { $in: ['queued', 'scheduled'] } });
  for (const campaign of waiting) await scheduleCampaign(campaign._id.toString(), campaign.scheduledAt || new Date());
}

async function reconcileCampaigns() {
  await recoverInterruptedCampaigns();
  await requeueWaitingCampaigns();
}

module.exports = { createCampaign, processCampaign, recoverInterruptedCampaigns, requeueWaitingCampaigns, reconcileCampaigns, unsubscribeToken, parseUnsubscribeToken, terminal, error };
