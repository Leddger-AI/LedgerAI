const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  ownerUid: { type: String, required: true, index: true },
  code: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  lead: { type: String, default: '', trim: true },
  budget: { type: Number, required: true, min: 0, default: 5000 },
  status: { type: String, enum: ['Active', 'Paused', 'Archived'], default: 'Active' },
  description: { type: String, default: '' },
}, { timestamps: true });

projectSchema.index({ ownerUid: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Project', projectSchema);
