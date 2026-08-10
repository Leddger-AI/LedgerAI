const mongoose = require('mongoose');

const FormDraftSchema = new mongoose.Schema({
  draftId: {
    type: String,
    required: true,
    unique: true
  },
  recruiterId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  config: {
    type: Object, // Stores all the toggle states, inputs, etc.
    required: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'expired'],
    default: 'draft'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('FormDraft', FormDraftSchema);

