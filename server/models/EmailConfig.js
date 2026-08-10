const mongoose = require('mongoose');

const EmailConfigSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
  },
  authMethod: {
    type: String,
    enum: ['oauth2', 'app_password'],
    required: true,
  },
  // For app_password method
  smtpHost: {
    type: String,
    default: 'smtp.gmail.com',
  },
  smtpPort: {
    type: Number,
    default: 587,
  },
  appPassword: {
    type: String,
    default: null,
  },
  // For oauth2 method
  refreshToken: {
    type: String,
    default: null,
  },
  clientId: {
    type: String,
    default: null,
  },
  clientSecret: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
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

module.exports = mongoose.model('EmailConfig', EmailConfigSchema);
