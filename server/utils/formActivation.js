const supabase = require('../supabaseClient');
const TemplateData = require('../models/TemplateData');

// The conditional update is the claim. A cancelled, rescheduled, or expired
// draft cannot be activated by an old Agenda job or a concurrent public GET.
async function activateScheduledForm(draftId, expectedGoLiveAt = null) {
  const now = new Date().toISOString();
  let query = supabase.from('form_drafts')
    .update({ status: 'active', updated_at: now })
    .eq('draft_id', draftId)
    .eq('status', 'scheduled')
    .lte('goes_live_at', now)
    .gt('expires_at', now);
  if (expectedGoLiveAt) query = query.eq('goes_live_at', new Date(expectedGoLiveAt).toISOString());
  const { data, error } = await query.select('draft_id,user_id,title,config,expires_at,status').maybeSingle();
  if (error) throw error;
  if (!data) return null;
  try {
    await TemplateData.findOneAndUpdate(
      { draftId },
      { status: 'active', expiresAt: new Date(data.expires_at), updatedAt: new Date(),
        $setOnInsert: { ownerUid: data.user_id, title: data.title } },
      { upsert: true }
    );
  } catch (mirrorError) {
    console.error(`[Scheduler] MongoDB mirror update failed for form ${draftId}:`, mirrorError);
  }
  return { ...data, status: 'active' };
}

module.exports = { activateScheduledForm };
