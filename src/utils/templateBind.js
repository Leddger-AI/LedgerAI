// Shared template<->sheet binding engine — used by BOTH the Body page
// (create body) and the Email page (set template + send).
// Single source of truth so variables auto-change exactly the same way.

export function extractVars(...texts) {
  const ids = new Set();
  const re = /{{\s*([^{}]+?)\s*}}/g;
  for (const t of texts) {
    if (!t) continue;
    let m;
    while ((m = re.exec(t)) !== null) {
      const id = normHeader(m[1]);
      if (id) ids.add(id);
    }
  }
  return [...ids];
}

export function normHeader(h) {
  return String(h || '').toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export function canonicalizeTemplate(template) {
  return String(template || '').replace(/{{\s*([^{}]+?)\s*}}/g, (match, label) => {
    const id = normHeader(label);
    return id ? `{{${id}}}` : match;
  });
}

export function autoMapVariables(varIds, headers) {
  const mapping = {};
  const normMap = {};
  (headers || []).forEach((h) => { normMap[normHeader(h)] = h; });
  (varIds || []).forEach((id) => {
    const key = normHeader(id);
    if (normMap[key]) {
      mapping[id] = normMap[key];
      return;
    }
    const hit = (headers || []).find((h) => {
      const n = normHeader(h);
      return n.includes(key) || (key.length >= 3 && n.includes(key.replace(/_/g, '')));
    });
    if (hit) mapping[id] = hit;
  });
  return mapping;
}

export function findUnmapped(varIds, mapping) {
  return (varIds || []).filter((id) => !mapping || !mapping[id]);
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function substitutePreview(template, variables, escapeValues = true) {
  const values = Object.fromEntries(Object.entries(variables || {}).map(([key, value]) => [normHeader(key), value]));
  return String(template || '').replace(/{{\s*([^{}]+?)\s*}}/g, (match, label) => {
    const key = normHeader(label);
    if (!Object.hasOwn(values, key)) return match;
    return escapeValues ? escapeHtml(values[key]) : String(values[key] ?? '');
  });
}

export function hasUnboundPlaceholders(text) {
  return /{{[^{}]*}}/.test(text || '');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function splitRecipients(rows, emailCol) {
  const valid = [];
  const invalid = [];
  for (const r of rows || []) {
    const email = emailCol ? String(r[emailCol] ?? '').trim() : '';
    if (EMAIL_RE.test(email)) valid.push(r);
    else invalid.push(r);
  }
  return { valid, invalid };
}
