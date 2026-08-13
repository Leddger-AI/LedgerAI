const mongoose = require('mongoose');

const EmailAccountSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
  },
  label: {
    type: String,
    default: '',
  },
  authMethod: {
    type: String,
    enum: ['oauth2', 'app_password'],
    required: true,
  },
  smtpHost: {
    type: String,
    default: 'smtp.gmail.com',
  },
  smtpPort: {
    type: Number,
    default: 587,
  },
  appPassword: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  refreshToken: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  clientId: {
    type: String,
    default: null,
  },
  clientSecret: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  isDefault: {
    type: Boolean,
    default: false,
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

EmailAccountSchema.index({ ownerUid: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('EmailAccount', EmailAccountSchema);
