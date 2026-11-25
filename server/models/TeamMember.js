const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  ownerUid: { type: String, required: true, index: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, default: '', trim: true },
  role: { type: String, default: 'Member', trim: true },
  dept: { type: String, default: 'Engineering', trim: true },
  rate: { type: Number, required: true, min: 1, default: 75 },
  hours: { type: Number, min: 0, default: 0 },
  avatar: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('TeamMember', teamMemberSchema);
