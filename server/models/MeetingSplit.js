const mongoose = require('mongoose');

// Cost split of one meeting across projects (percentages must sum to 100).
// One active split per meeting per owner; re-splitting overwrites.
const MeetingSplitSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    index: true,
  },
  meetingId: {
    type: String,
    required: true,
  },
  parts: {
    type: [{
      aiProject: { type: String, required: true },
      pct: { type: Number, required: true, min: 0, max: 100 },
    }],
    required: true,
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

MeetingSplitSchema.index({ ownerUid: 1, meetingId: 1 }, { unique: true });

module.exports = mongoose.model('MeetingSplit', MeetingSplitSchema);
