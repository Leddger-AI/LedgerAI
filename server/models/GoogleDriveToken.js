const mongoose = require('mongoose');

const GoogleDriveTokenSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  googleEmail: {
    type: String,
    default: null,
  },
  accessToken: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  refreshToken: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  tokenExpiry: {
    type: Date,
    default: null,
  },
  connectedAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

GoogleDriveTokenSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('GoogleDriveToken', GoogleDriveTokenSchema);
