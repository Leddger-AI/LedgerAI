const mongoose = require('mongoose');

const collaboratorSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, default: '' },
  avatarUrl: { type: String, required: true },
  profileUrl: { type: String, required: true },
  bio: { type: String, default: '' },
  publicRepos: { type: Number, default: 0 },
  followers: { type: Number, default: 0 },
  topLanguages: { type: [String], default: [] },
  joinedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Collaborator', collaboratorSchema);
