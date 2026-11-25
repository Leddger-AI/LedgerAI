const KnowledgeDocument = require('../models/KnowledgeDocument');
const { generateGeminiText } = require('./geminiClient');

/**
 * Ranks chunks against a natural-language query using keyword/TF overlap.
 */
function retrieveRelevantChunks(docs = [], query = '', topK = 5) {
  const terms = String(query || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  const scored = [];
  for (const doc of docs) {
    for (const chunk of doc.chunks || []) {
      const text = `${doc.file_name || ''} ${(doc.tags || []).join(' ')} ${chunk.content || ''}`.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (text.includes(term)) score += 1;
      }
      if (score > 0 || terms.length === 0) {
        scored.push({
          document_id: doc.document_id,
          file_name: doc.file_name,
          source_type: doc.source_type,
          chunk_id: chunk.chunk_id,
          content: chunk.content,
          score,
        });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

/**
 * Answers a question grounded in the user's Knowledge Base documents
 * using Gemini 3.8 Flash, falling back to extractive snippet summary if
 * no GEMINI_API_KEY is configured or the request fails.
 */
async function askKnowledgeBase({
  ownerUid,
  question,
  apiKey = process.env.GEMINI_API_KEY,
  docsOverride = null,
}) {
  const docs = docsOverride || await KnowledgeDocument.find({ ownerUid }).lean();
  if (!docs || docs.length === 0) {
    return {
      answer: 'Your Knowledge Base is currently empty. Upload a document or ingest a Slack thread first.',
      citations: [],
      source: 'empty',
    };
  }

  const topChunks = retrieveRelevantChunks(docs, question, 5);
  if (topChunks.length === 0) {
    return {
      answer: 'No matching passages were found in your Knowledge Base for that question.',
      citations: [],
      source: 'extractive',
    };
  }

  const contextBlock = topChunks
    .map((c, idx) => `[Source ${idx + 1}: ${c.file_name}]\n${c.content}`)
    .join('\n\n---\n\n');

  const key = (apiKey || '').trim();
  if (key) {
    const res = await generateGeminiText({
      prompt: `Answer the user's question concisely using ONLY the Knowledge Base context below. Cite source file names when relevant.\n\nContext:\n${contextBlock}\n\nQuestion: ${question}`,
      temperature: 0.2,
      apiKey: key,
    });
    if (res?.text) {
      return {
        answer: res.text.trim(),
        citations: topChunks.map((c) => ({
          document_id: c.document_id,
          file_name: c.file_name,
          chunk_id: c.chunk_id,
          excerpt: c.content.slice(0, 180),
        })),
        source: 'gemini',
      };
    }
  }

  return {
    answer: `Top matching passage from ${topChunks[0].file_name}:\n\n${topChunks[0].content.slice(0, 500)}`,
    citations: topChunks.map((c) => ({
      document_id: c.document_id,
      file_name: c.file_name,
      chunk_id: c.chunk_id,
      excerpt: c.content.slice(0, 180),
    })),
    source: 'extractive',
  };
}

module.exports = {
  retrieveRelevantChunks,
  askKnowledgeBase,
};
