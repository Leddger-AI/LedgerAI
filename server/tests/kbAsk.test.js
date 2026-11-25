const { retrieveRelevantChunks, askKnowledgeBase } = require('../utils/kbAsk');

describe('Knowledge Base RAG Retrieval & Q&A', () => {
  const sampleDocs = [
    {
      document_id: 'doc-1',
      file_name: 'Phoenix_DB.txt',
      source_type: 'file',
      tags: ['postgres', 'tls'],
      chunks: [
        { chunk_id: 'c1', content: 'Project Phoenix database runs on PostgreSQL port 5432 with TLS 1.3 enforced.' },
        { chunk_id: 'c2', content: 'Weekly standups happen on Monday morning.' },
      ],
    },
  ];

  test('retrieveRelevantChunks ranks matching chunk highest', () => {
    const ranked = retrieveRelevantChunks(sampleDocs, 'What port does PostgreSQL use?', 3);
    expect(ranked[0].chunk_id).toBe('c1');
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  test('askKnowledgeBase returns extractive answer when no API key is set', async () => {
    const res = await askKnowledgeBase({
      ownerUid: 'u1',
      question: 'What port does PostgreSQL use?',
      apiKey: '',
      docsOverride: sampleDocs,
    });
    expect(res.source).toBe('extractive');
    expect(res.answer).toContain('5432');
    expect(res.citations).toHaveLength(1);
    expect(res.citations[0].chunk_id).toBe('c1');
  });
});
