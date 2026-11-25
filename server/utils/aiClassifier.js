const { generateGeminiText } = require('./geminiClient');

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

  try {
    const result = await generateGeminiText({
      prompt,
      systemInstruction: 'Respond strictly in JSON matching schema: {"project_name": string, "confidence_score": integer, "reasoning": string}.',
      responseMimeType: 'application/json',
      temperature: 0.1,
      apiKey: key,
    });
    if (!result?.text) {
      return fallbackClassifyMeeting(title, description);
    }

    const parsed = JSON.parse(result.text);
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
