// Read-only workflow snapshot. Every query is scoped to the authenticated owner.
// A failed source stays unavailable; it must never be displayed as an empty account.
async function getCommandCenterSnapshot({ uid, supabase, models, workerReady }) {
  const now = new Date();
  const snapshot = {
    generatedAt: now.toISOString(),
    sources: { forms: 'unavailable', campaigns: 'unavailable', worker: workerReady ? 'ready' : 'starting' },
    counts: {
      activeForms: null, submissions: null, candidates: null, candidatesToReview: null,
      upcomingMeetings: null, openAlerts: null,
      queuedCampaigns: null, scheduledCampaigns: null, campaignsToReview: null,
      senderAccounts: null, files: null,
    },
    queues: { applications: [], candidates: [], campaigns: [] },
  };

  async function count(table, configure = q => q) {
    const result = await configure(supabase.from(table).select('*', { count: 'exact', head: true }).eq('user_id', uid));
    if (result.error) throw result.error;
    return result.count ?? 0;
  }
  async function rows(table, columns, configure = q => q) {
    const result = await configure(supabase.from(table).select(columns).eq('user_id', uid));
    if (result.error) throw result.error;
    return result.data || [];
  }

  const formQueries = await Promise.allSettled([
    count('form_drafts', q => q.eq('status', 'active')),
    count('form_submissions'),
    count('candidates'),
    count('candidates', q => q.eq('status', 'needs_contact_review')),
    count('meetings', q => q.gt('start_time', now.toISOString())),
    count('alerts', q => q.eq('resolved', false)),
    rows('form_submissions', 'submission_id,draft_id,candidate_id,title,submitted_at',
      q => q.order('submitted_at', { ascending: false }).limit(5)),
    rows('candidates', 'id,name,email,status,updated_at',
      q => q.eq('status', 'needs_contact_review').order('updated_at', { ascending: false }).limit(5)),
  ]);
  const formKeys = ['activeForms', 'submissions', 'candidates', 'candidatesToReview', 'upcomingMeetings', 'openAlerts'];
  formQueries.slice(0, 6).forEach((result, index) => {
    if (result.status === 'fulfilled') snapshot.counts[formKeys[index]] = result.value;
  });
  if (formQueries[6].status === 'fulfilled') snapshot.queues.applications = formQueries[6].value.map(s => ({
    id: s.submission_id, title: s.title, candidateId: s.candidate_id, submittedAt: s.submitted_at,
  }));
  if (formQueries[7].status === 'fulfilled') snapshot.queues.candidates = formQueries[7].value.map(c => ({
    id: c.id, name: c.name, email: c.email, status: c.status, updatedAt: c.updated_at,
  }));
  if (formQueries.every(result => result.status === 'fulfilled')) snapshot.sources.forms = 'ready';

  const { EmailCampaign, EmailAccount, Spreadsheet } = models;
  const owner = { ownerUid: uid };
  const campaignQueries = await Promise.allSettled([
    EmailCampaign.countDocuments({ ...owner, status: 'queued' }),
    EmailCampaign.countDocuments({ ...owner, status: 'scheduled' }),
    EmailCampaign.countDocuments({ ...owner, status: { $in: ['partial', 'failed', 'needs_review'] } }),
    EmailAccount.countDocuments({ ...owner, isActive: true }),
    Spreadsheet.countDocuments(owner),
    EmailCampaign.find({ ...owner, status: { $in: ['queued', 'scheduled', 'sending', 'partial', 'failed', 'needs_review'] } })
      .select('name status sentCount failedCount scheduledAt createdAt')
      .sort({ createdAt: -1 }).limit(6).lean(),
  ]);
  const campaignKeys = ['queuedCampaigns', 'scheduledCampaigns', 'campaignsToReview', 'senderAccounts', 'files'];
  campaignQueries.slice(0, 5).forEach((result, index) => {
    if (result.status === 'fulfilled') snapshot.counts[campaignKeys[index]] = result.value;
  });
  if (campaignQueries[5].status === 'fulfilled') snapshot.queues.campaigns = campaignQueries[5].value.map(c => ({
    id: String(c._id), name: c.name || 'Untitled campaign', status: c.status,
    sentCount: c.sentCount || 0, failedCount: c.failedCount || 0,
    scheduledAt: c.scheduledAt, createdAt: c.createdAt,
  }));
  if (campaignQueries.every(result => result.status === 'fulfilled')) snapshot.sources.campaigns = 'ready';
  return snapshot;
}

module.exports = { getCommandCenterSnapshot };
