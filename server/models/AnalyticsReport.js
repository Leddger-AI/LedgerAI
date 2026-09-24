const mongoose = require('mongoose');

const ReportRunSchema = new mongoose.Schema({
  runAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['success', 'failed'], required: true },
  error: { type: String, default: null },
  recipients: { type: Number, default: 0 },
});

const AnalyticsReportSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    default: 'Analytics Report',
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true,
  },
  scope: {
    type: String,
    enum: ['overview', 'template'],
    required: true,
  },
  draftId: {
    type: String,
    default: null,
  },
  format: {
    type: String,
    enum: ['csv', 'json', 'pdf'],
    default: 'csv',
  },
  recipientEmails: {
    type: [String],
    default: [],
  },
  status: {
    type: String,
    enum: ['active', 'paused'],
    default: 'active',
  },
  lastRunAt: { type: Date, default: null },
  lastRunStatus: {
    type: String,
    enum: ['success', 'failed', null],
    default: null,
  },
  lastRunError: { type: String, default: null },
  // Capped rolling history of recent runs (most recent first).
  runs: {
    type: [ReportRunSchema],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

AnalyticsReportSchema.pre('save', function () {
  this.updatedAt = new Date();
});

// Keep only the most recent 20 runs to avoid unbounded growth.
AnalyticsReportSchema.methods.pushRun = function (run) {
  this.runs.unshift(run);
  if (this.runs.length > 20) this.runs = this.runs.slice(0, 20);
  this.lastRunAt = run.runAt;
  this.lastRunStatus = run.status;
  this.lastRunError = run.error;
  return this;
};

module.exports = mongoose.model('AnalyticsReport', AnalyticsReportSchema);
