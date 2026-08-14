const mongoose = require('mongoose');

const TemplateDataSchema = new mongoose.Schema({
  draftId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  ownerUid: {
    type: String,
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
  },
  templateType: {
    type: String,
    enum: ['student', 'employee', 'team', 'unknown'],
    default: 'unknown',
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'expired', 'scheduled'],
    default: 'draft',
  },
  source: {
    type: String,
    enum: ['created', 'imported'],
    default: 'created',
  },
  expiresAt: {
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

TemplateDataSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('TemplateData', TemplateDataSchema);
