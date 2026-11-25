const mongoose = require('mongoose');

const knowledgeChunkSchema = new mongoose.Schema({
  chunk_id: { type: String, required: true },
  content: { type: String, required: true },
  tokens_count: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { _id: false });

const knowledgeDocumentSchema = new mongoose.Schema({
  ownerUid: { type: String, required: true, index: true },
  document_id: { type: String, required: true, unique: true, index: true },
  source_type: { type: String, enum: ['file', 'slack'], required: true },
  file_name: { type: String, required: true },
  scope: { type: String, default: 'team' },
  owner_id: { type: String, default: '' },
  team_id: { type: String, default: '' },
  tags: { type: [String], default: [] },
  total_chunks: { type: Number, default: 0 },
  chunks: { type: [knowledgeChunkSchema], default: [] },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model('KnowledgeDocument', knowledgeDocumentSchema);
