// Fire-and-forget audit logger. Must never throw or break requests.
// All failures are swallowed with a console warning.

function logAudit(ownerUid, action, entity, entityId, meta) {
  try {
    if (!ownerUid || !action) return;
    const AuditLog = require('../models/AuditLog');
    AuditLog.create({
      ownerUid,
      action,
      entity: entity || null,
      entityId: entityId ? String(entityId) : null,
      meta: meta || null,
    }).catch(err => console.warn('[Audit] write failed:', err.message));
  } catch (err) {
    console.warn('[Audit] write failed:', err.message);
  }
}

module.exports = { logAudit };
