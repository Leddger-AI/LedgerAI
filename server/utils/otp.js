const supabase = require('../supabaseClient');
const { hmacHash } = require('./crypto');

const OTP_TTL_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getChallenge(ownerUid, action) {
  const { data, error } = await supabase
    .from('otp_challenges')
    .select('*')
    .eq('user_id', ownerUid)
    .eq('action', action)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Creates (or replaces) the OTP challenge for ownerUid+action and returns
// the plaintext OTP to send by email — never persisted or logged in plain
// form. Returns { rateLimited | locked, retryAfterMs } instead if the
// caller must wait before a new code can be issued.
async function createOtpChallenge(ownerUid, action) {
  const now = Date.now();
  const existing = await getChallenge(ownerUid, action);

  if (existing?.locked_until && new Date(existing.locked_until).getTime() > now) {
    return { locked: true, retryAfterMs: new Date(existing.locked_until).getTime() - now };
  }

  if (existing && now - new Date(existing.last_sent_at).getTime() < RESEND_COOLDOWN_MS) {
    return { rateLimited: true, retryAfterMs: RESEND_COOLDOWN_MS - (now - new Date(existing.last_sent_at).getTime()) };
  }

  const otp = generateOtp();

  const { error } = await supabase
    .from('otp_challenges')
    .upsert(
      {
        user_id: ownerUid,
        action,
        otp_hash: hmacHash(otp),
        attempts: 0,
        locked_until: null,
        last_sent_at: new Date(now).toISOString(),
        expires_at: new Date(now + OTP_TTL_MS).toISOString(),
      },
      { onConflict: 'user_id,action' }
    );
  if (error) throw error;

  return { otp };
}

// Verifies otp for ownerUid+action. On success, consumes (deletes) the
// challenge so it can't be replayed. On a wrong guess, increments the
// attempt counter and locks out further attempts/resends for LOCKOUT_MS
// once MAX_ATTEMPTS is reached.
async function verifyOtpChallenge(ownerUid, action, otp) {
  const now = Date.now();
  const record = await getChallenge(ownerUid, action);

  if (!record) {
    return { valid: false, reason: 'missing' };
  }

  if (record.locked_until && new Date(record.locked_until).getTime() > now) {
    return { valid: false, reason: 'locked', retryAfterMs: new Date(record.locked_until).getTime() - now };
  }

  if (new Date(record.expires_at).getTime() < now) {
    await supabase.from('otp_challenges').delete().eq('id', record.id);
    return { valid: false, reason: 'expired' };
  }

  if (!otp || hmacHash(otp) !== record.otp_hash) {
    const attempts = record.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      const lockedUntil = new Date(now + LOCKOUT_MS).toISOString();
      const { error } = await supabase
        .from('otp_challenges')
        .update({ attempts, locked_until: lockedUntil, expires_at: lockedUntil })
        .eq('id', record.id);
      if (error) throw error;
      return { valid: false, reason: 'locked', retryAfterMs: LOCKOUT_MS };
    }
    const { error } = await supabase.from('otp_challenges').update({ attempts }).eq('id', record.id);
    if (error) throw error;
    return { valid: false, reason: 'mismatch', attemptsRemaining: MAX_ATTEMPTS - attempts };
  }

  await supabase.from('otp_challenges').delete().eq('id', record.id);
  return { valid: true };
}

module.exports = {
  createOtpChallenge,
  verifyOtpChallenge,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
  LOCKOUT_MS,
};
