const mongoose = require('mongoose');

// Suppression list: unsubscribed, bounced, complained.
// Checked on every send (immediate + scheduled). Unique per user+email.
const EmailSuppressionSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  reason: {
    type: String,
    enum: ['unsubscribed', 'bounced', 'complained', 'manual'],
    default: 'unsubscribed',
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailCampaign',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

EmailSuppressionSchema.index({ ownerUid: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('EmailSuppression', EmailSuppressionSchema);
