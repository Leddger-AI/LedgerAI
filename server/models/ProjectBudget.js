const mongoose = require('mongoose');

// Monthly spend cap per project. Progress is computed live from meetings
// (duration x rate x attendees, current month, grouped by ai_project).
const ProjectBudgetSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    index: true,
  },
  project: {
    type: String,
    required: true,
  },
  monthlyCap: {
    type: Number,
    required: true,
    min: 0,
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

ProjectBudgetSchema.index({ ownerUid: 1, project: 1 }, { unique: true });

module.exports = mongoose.model('ProjectBudget', ProjectBudgetSchema);
