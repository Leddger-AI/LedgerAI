const mongoose = require('mongoose');

const TemplateSubmissionSchema = new mongoose.Schema({
  submissionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  draftId: {
    type: String,
    required: true,
    index: true,
  },
  ownerUid: {
    type: String,
    required: true,
    index: true,
  },
  templateType: {
    type: String,
    enum: ['student', 'employee', 'team', 'unknown'],
    default: 'unknown',
  },
  title: {
    type: String,
    required: true,
  },
  submittedData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

TemplateSubmissionSchema.index({ draftId: 1, submittedAt: -1 });

module.exports = mongoose.model('TemplateSubmission', TemplateSubmissionSchema);
