const mongoose = require('mongoose');

// Finance-grade hourly rates per dept/level/region.
// Cost = duration_hours * hourlyRate * attendeeCount.
// Falls back to DEFAULT_HOURLY_RATE when no match.
const MeetingRateSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    index: true,
  },
  dept: {
    type: String,
    default: 'default',
  },
  level: {
    type: String,
    default: 'default',
  },
  region: {
    type: String,
    default: 'default',
  },
  hourlyRate: {
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

MeetingRateSchema.index({ ownerUid: 1, dept: 1, level: 1, region: 1 }, { unique: true });

module.exports = mongoose.model('MeetingRate', MeetingRateSchema);
