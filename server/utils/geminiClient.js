const DEFAULT_MODELS = ['gemini-3.8-flash', 'gemini-3.8-flash-lite', 'gemini-2.5-flash-lite'];

/**
 * Calls Google Gemini generateContent with automatic multi-model fallback
 * on transient 404/429/503 responses. Returns generated text or null.
 */
async function generateGeminiText({
  prompt,
  systemInstruction,
  responseMimeType,
  temperature = 0.2,
  apiKey = process.env.GEMINI_API_KEY,
  models = DEFAULT_MODELS,
}) {
  const key = (apiKey || '').trim();
  if (!key) return null;

  const customModel = (process.env.GEMINI_MODEL || '').trim();
  const candidates = customModel ? [customModel, ...models.filter((m) => m !== customModel)] : models;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature },
  };
  if (responseMimeType) {
    body.generationConfig.responseMimeType = responseMimeType;
  }
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  for (const model of candidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if ([404, 429, 500, 503].includes(res.status)) continue;
        return null;
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return { text, model };
    } catch {
      continue;
    }
  }

  return null;
}

module.exports = { generateGeminiText, DEFAULT_MODELS };
