const {
  estimateTokens,
  extractTags,
  splitTextRecursively,
  formatSlackMessages,
} = require('../utils/knowledgeSplitter');

describe('Knowledge Base Splitter & Formatter', () => {
  test('estimateTokens returns proportional token count', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('hello world!')).toBe(3);
  });

  test('extractTags returns top frequent non-stopword keywords', () => {
    const tags = extractTags('PostgreSQL database security and PostgreSQL TLS performance optimization');
    expect(tags).toContain('postgresql');
    expect(tags).toContain('database');
    expect(tags).not.toContain('and');
  });

  test('splitTextRecursively splits long text into overlapping chunks', () => {
    const para = 'Project Phoenix architecture migrates legacy databases to Postgres with TLS 1.3. '.repeat(25);
    const chunks = splitTextRecursively(para, 100, 10);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 450)).toBe(true);
  });

  test('formatSlackMessages formats multi-turn Slack thread', () => {
    const formatted = formatSlackMessages([
      { user_id: 'U123', text: 'DB port?', timestamp: '1718283600' },
      { user_id: 'U456', text: '5432', timestamp: '1718283720' },
    ]);
    expect(formatted).toContain('U123: DB port?');
    expect(formatted).toContain('U456: 5432');
  });
});
