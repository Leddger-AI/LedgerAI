const mongoose = require('mongoose');

const EmailCampaignSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    default: '',
  },
  draftId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmailDraft',
    required: true,
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'failed'],
    default: 'draft',
  },
  recipients: {
    type: [{
      email: String,
      name: String,
      variables: mongoose.Schema.Types.Mixed,
      status: {
        type: String,
        enum: ['pending', 'sent', 'failed', 'opened'],
        default: 'pending',
      },
      error: { type: String, default: null },
      sentAt: { type: Date, default: null },
    }],
    default: [],
  },
  sentCount: {
    type: Number,
    default: 0,
  },
  failedCount: {
    type: Number,
    default: 0,
  },
  openCount: {
    type: Number,
    default: 0,
  },
  replyCount: {
    type: Number,
    default: 0,
  },
  scheduledAt: {
    type: Date,
    default: null,
  },
  sentAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('EmailCampaign', EmailCampaignSchema);
