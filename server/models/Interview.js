const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  ownerUid: { type: String, required: true, index: true },
  candidateId: { type: String, default: null },
  candidateName: { type: String, required: true, trim: true },
  candidateEmail: { type: String, default: '', trim: true },
  role: { type: String, default: 'Candidate Interview', trim: true },
  interviewer: { type: String, default: 'Hiring Manager', trim: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 45, min: 15 },
  meetingUrl: { type: String, required: true },
  provider: { type: String, enum: ['jitsi', 'google_meet', 'custom'], default: 'jitsi' },
  status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' },
  rating: { type: Number, min: 1, max: 5, default: null },
  notes: { type: String, default: '' },
  inviteSent: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Interview', interviewSchema);
