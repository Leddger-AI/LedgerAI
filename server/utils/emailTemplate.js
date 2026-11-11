// Shared email template helpers — used by index.js (immediate send)
// and scheduler.js (scheduled send) so both paths behave identically.

function normalizeVariableKey(key) {
  return String(key || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function substituteTemplateVars(template, variables) {
  const values = Object.fromEntries(Object.entries(variables || {}).map(([key, value]) => [normalizeVariableKey(key), value]));
  return String(template || '').replace(/{{\s*([^{}]+?)\s*}}/g, (match, label) => {
    const key = normalizeVariableKey(label);
    return Object.hasOwn(values, key) ? String(values[key] ?? '') : match;
  });
}

function canonicalizeTemplate(template) {
  return String(template || '').replace(/{{\s*([^{}]+?)\s*}}/g, (match, label) => {
    const key = normalizeVariableKey(label);
    return key ? `{{${key}}}` : match;
  });
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const t = email.trim();
  if (t.length === 0 || t.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

module.exports = { normalizeVariableKey, substituteTemplateVars, canonicalizeTemplate, isValidEmail };
