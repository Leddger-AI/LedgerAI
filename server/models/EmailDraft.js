const mongoose = require('mongoose');

const EmailDraftSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    index: true,
  },
  subject: {
    type: String,
    default: '',
  },
  bodyHtml: {
    type: String,
    default: '',
  },
  variables: {
    type: [{
      id: String,
      label: String,
    }],
    default: [],
  },
  dataSourceType: {
    type: String,
    enum: ['upload', 'roster_studio', 'none'],
    default: 'none',
  },
  dataSourceFile: {
    type: String,
    default: null,
  },
  dataSourceSheetId: {
    type: String,
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

// Hot path sorts by owner+recency — compound index covers it
EmailDraftSchema.index({ ownerUid: 1, updatedAt: -1 });

module.exports = mongoose.model('EmailDraft', EmailDraftSchema);
