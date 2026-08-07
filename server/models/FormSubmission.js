const mongoose = require('mongoose');

const FormSubmissionSchema = new mongoose.Schema({
  submissionId: {
    type: String,
    required: true,
    unique: true
  },
  draftId: {
    type: String,
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true
  },
  submittedData: {
    type: Object, // The actual filled out data
    required: true
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FormSubmission', FormSubmissionSchema);
