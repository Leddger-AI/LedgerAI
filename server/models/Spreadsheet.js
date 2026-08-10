const mongoose = require('mongoose');

const SpreadsheetSchema = new mongoose.Schema({
  ownerUid: {
    type: String,
    required: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
  },
  sheets: {
    type: mongoose.Schema.Types.Mixed,
    default: [],
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

SpreadsheetSchema.index({ ownerUid: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Spreadsheet', SpreadsheetSchema);
