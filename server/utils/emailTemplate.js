// Shared email template helpers — used by index.js (immediate send)
// and scheduler.js (scheduled send) so both paths behave identically.

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function substituteTemplateVars(template, variables) {
  let out = template || '';
  for (const [key, value] of Object.entries(variables || {})) {
    const placeholder = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, 'g');
    out = out.replace(placeholder, value == null ? '' : String(value));
  }
  return out;
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const t = email.trim();
  if (t.length === 0 || t.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

module.exports = { escapeRegExp, substituteTemplateVars, isValidEmail };
