const AVAILABLE_PROJECTS = [
  'Project Phoenix',
  'Client ABC Onboarding',
  'Q4 Marketing Strategy',
  'Internal Operations',
];

/**
 * Deterministic keyword-matching fallback when GEMINI_API_KEY is absent
 * or the Gemini API call fails.
 */
function fallbackClassifyMeeting(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();

  if (/\b(phoenix|database|postgres|supabase|mongodb|backend|architecture|api|migration|infra)\b/.test(text)) {
    return {
      project_name: 'Project Phoenix',
      confidence_score: 82,
      reasoning: 'Keyword heuristic matched core backend/database architecture terms.',
      source: 'heuristic',
    };
  }
  if (/\b(abc|client|onboarding|demo|customer|stakeholder|feedback|integration)\b/.test(text)) {
    return {
      project_name: 'Client ABC Onboarding',
      confidence_score: 80,
      reasoning: 'Keyword heuristic matched client onboarding and integration terms.',
      source: 'heuristic',
    };
  }
  if (/\b(marketing|q4|campaign|social|ad|growth|brand|seo|launch)\b/.test(text)) {
    return {
      project_name: 'Q4 Marketing Strategy',
      confidence_score: 78,
      reasoning: 'Keyword heuristic matched marketing and growth strategy terms.',
      source: 'heuristic',
    };
  }
  if (/\b(standup|sync|1-on-1|1:1|hr|admin|all-hands|retro|planning|weekly)\b/.test(text)) {
    return {
      project_name: 'Internal Operations',
      confidence_score: 75,
      reasoning: 'Keyword heuristic matched internal operational sync terms.',
      source: 'heuristic',
    };
  }

  return {
    project_name: 'Internal Operations',
    confidence_score: 45,
    reasoning: 'No strong project keywords detected; defaulted to Internal Operations for human review.',
    source: 'heuristic',
  };
}

/**
 * Classifies a meeting into a project code using Gemini 2.5 Flash,
 * falling back gracefully to heuristic matching if no key is configured or on error.
 *
 * @param {object} params
 * @param {string} params.title
 * @param {string} [params.description]
 * @param {number} [params.durationMinutes]
 * @param {number} [params.attendeesCount]
 * @param {string} [params.apiKey]
 * @param {string[]} [params.projects]
 * @returns {Promise<{project_name: string, confidence_score: number, reasoning: string, source: 'gemini'|'heuristic'}>}
 */
async function classifyMeeting({
  title = '',
  description = '',
  durationMinutes = 60,
  attendeesCount = 1,
  apiKey = process.env.GEMINI_API_KEY,
  projects = AVAILABLE_PROJECTS,
} = {}) {
  const key = (apiKey || '').trim();
  if (!key) {
    return fallbackClassifyMeeting(title, description);
  }

  const prompt = [
    'You are an expert HR cost intelligence agent. Analyze this calendar meeting and assign it to the most appropriate project.',
    `Available Projects: ${projects.join(', ')}`,
    'Rules:',
    '- Select exactly ONE project from the available list. If ambiguous, default to "Internal Operations" with confidence_score < 50.',
    '- Provide confidence_score as an integer between 0 and 100.',
    `Title: ${title}`,
    `Description: ${description || 'N/A'}`,
    `Duration: ${durationMinutes} minutes`,
    `Attendees Count: ${attendeesCount}`,
  ].join('\n');

  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: {
          parts: [{
            text: 'Respond strictly in JSON matching schema: {"project_name": string, "confidence_score": integer, "reasoning": string}.',
          }],
        },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      return fallbackClassifyMeeting(title, description);
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return fallbackClassifyMeeting(title, description);
    }

    const parsed = JSON.parse(rawText);
    const projectName = projects.includes(parsed.project_name)
      ? parsed.project_name
      : 'Internal Operations';
    const score = Math.max(0, Math.min(100, Math.round(Number(parsed.confidence_score) || 50)));

    return {
      project_name: projectName,
      confidence_score: score,
      reasoning: String(parsed.reasoning || 'Classified by Gemini 2.5 Flash.'),
      source: 'gemini',
    };
  } catch {
    return fallbackClassifyMeeting(title, description);
  }
}

module.exports = {
  AVAILABLE_PROJECTS,
  classifyMeeting,
  fallbackClassifyMeeting,
};
