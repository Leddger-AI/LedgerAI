const mongoose = require('mongoose');

// Append-only audit trail. Never updated, only inserted.
// Reads are scoped by ownerUid. No user can edit/delete entries.
const AuditLogSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  entity: {
    type: String,
    default: null,
  },
  entityId: {
    type: String,
    default: null,
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
