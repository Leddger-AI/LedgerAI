// First name from the normalized session user (Supabase Gmail metadata).
// normalizeUser() puts full_name/name/user_name/email into displayName,
// so take the first token; fall back to the Gmail prefix before "@".
export function getFirstName(user) {
  const raw = (user?.displayName || '').replace(/\(Demo Mode\)/gi, '').trim();
  if (raw && !raw.includes('@')) {
    const first = raw.split(/\s+/)[0];
    if (first) return first.charAt(0).toUpperCase() + first.slice(1);
  }
  const email = user?.email || raw || '';
  const prefix = email.split('@')[0].replace(/[._-]+/g, ' ').trim().split(/\s+/)[0] || '';
  if (prefix) {
    const clean = prefix.replace(/\d+$/g, '');
    return (clean || prefix).charAt(0).toUpperCase() + (clean || prefix).slice(1);
  }
  return 'there';
}
