const STOP_WORDS = new Set([
  'the', 'and', 'for', 'that', 'this', 'with', 'from', 'are', 'was', 'were',
  'have', 'has', 'had', 'not', 'but', 'what', 'all', 'when', 'can', 'will',
  'your', 'our', 'about', 'into', 'than', 'then', 'them', 'they', 'their',
  'there', 'been', 'being', 'some', 'more', 'also', 'just', 'like', 'how',
]);

/**
 * Rough token count (~4 chars per token, matching standard GPT/Gemini heuristics).
 */
function estimateTokens(text = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 0;
  return Math.max(1, Math.ceil(trimmed.length / 4));
}

/**
 * Extracts top keyword tags from text.
 */
function extractTags(text = '', maxTags = 6) {
  const counts = new Map();
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s_-]/g, ' ')
    .split(/\s+/);

  for (const word of words) {
    if (word.length < 3 || STOP_WORDS.has(word) || /^\d+$/.test(word)) continue;
    counts.set(word, (counts.get(word) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxTags)
    .map(([w]) => w);
}

/**
 * Token-aware recursive text splitter. Splits by paragraph -> sentence -> word
 * to keep chunks under `chunkSizeChars` while preserving `overlapChars`.
 */
function splitTextRecursively(text = '', chunkSizeTokens = 750, overlapTokens = 75) {
  const clean = String(text || '').replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  const maxChars = Math.max(200, Number(chunkSizeTokens) * 4);
  const overlapChars = Math.min(Math.floor(maxChars / 2), Math.max(0, Number(overlapTokens) * 4));

  if (clean.length <= maxChars) {
    return [clean];
  }

  const paragraphs = clean.split(/\n{2,}/);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).trim().length <= maxChars) {
      current = current ? `${current}\n\n${para}` : para;
      continue;
    }

    if (current) {
      chunks.push(current.trim());
      const tail = overlapChars > 0 ? current.slice(-overlapChars) : '';
      current = tail ? `${tail}\n\n${para}` : para;
    } else {
      current = para;
    }

    // Hard-split oversized single paragraph by sentences/words
    while (current.length > maxChars) {
      let splitAt = current.lastIndexOf('. ', maxChars);
      if (splitAt < maxChars * 0.4) {
        splitAt = current.lastIndexOf(' ', maxChars);
      }
      if (splitAt <= 0) splitAt = maxChars;

      const slice = current.slice(0, splitAt).trim();
      if (slice) chunks.push(slice);

      const nextStart = Math.max(1, splitAt - overlapChars);
      current = current.slice(nextStart).trim();
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

/**
 * Formats an array of Slack thread messages into a readable transcript.
 */
function formatSlackMessages(messages = []) {
  if (!Array.isArray(messages)) return '';
  return messages
    .map((m) => {
      const user = m.user_id || m.user || 'unknown';
      const tsNum = Number(m.timestamp || m.ts);
      const time = Number.isFinite(tsNum) && tsNum > 0
        ? new Date(tsNum * 1000).toISOString()
        : String(m.timestamp || '');
      return `[${time}] ${user}: ${m.text || ''}`;
    })
    .join('\n');
}

module.exports = {
  estimateTokens,
  extractTags,
  splitTextRecursively,
  formatSlackMessages,
};
