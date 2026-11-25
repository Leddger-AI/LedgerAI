const { classifyMeeting, fallbackClassifyMeeting } = require('../utils/aiClassifier');

describe('AI Meeting Attribution Classifier', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('heuristic classifies backend/database meetings as Project Phoenix', () => {
    const res = fallbackClassifyMeeting('Postgres Migration & API Architecture', 'Review Supabase schema');
    expect(res.project_name).toBe('Project Phoenix');
    expect(res.confidence_score).toBeGreaterThanOrEqual(75);
    expect(res.source).toBe('heuristic');
  });

  test('heuristic classifies client meetings as Client ABC Onboarding', () => {
    const res = fallbackClassifyMeeting('Client ABC Demo Call', 'Stakeholder feedback');
    expect(res.project_name).toBe('Client ABC Onboarding');
    expect(res.source).toBe('heuristic');
  });

  test('heuristic flags ambiguous meetings with low confidence (<50)', () => {
    const res = fallbackClassifyMeeting('Quick Catchup', 'Random chat');
    expect(res.project_name).toBe('Internal Operations');
    expect(res.confidence_score).toBeLessThan(50);
  });

  test('classifyMeeting calls Gemini 2.5 Flash when apiKey is provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{
          content: {
            parts: [{
              text: JSON.stringify({
                project_name: 'Q4 Marketing Strategy',
                confidence_score: 94,
                reasoning: 'Discusses Q4 ad campaign launch.',
              }),
            }],
          },
        }],
      }),
    });

    const res = await classifyMeeting({
      title: 'Q4 Ad Launch',
      description: 'Reviewing social campaign metrics',
      apiKey: 'test-gemini-key',
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(res.source).toBe('gemini');
    expect(res.project_name).toBe('Q4 Marketing Strategy');
    expect(res.confidence_score).toBe(94);
  });

  test('classifyMeeting falls back to heuristic when Gemini API fails', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const res = await classifyMeeting({
      title: 'Database Migration Sync',
      apiKey: 'test-gemini-key',
    });

    expect(res.source).toBe('heuristic');
    expect(res.project_name).toBe('Project Phoenix');
  });
});
