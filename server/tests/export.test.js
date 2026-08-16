/**
 * Analytics export tests — issue #40 (no rate limiting or submission cap
 * on the export endpoints, OOM risk on large datasets).
 *
 * exportUtils.js's builder functions are unit-tested directly against a
 * mocked analyticsUtils, since they're pure formatting logic on top of
 * data analyticsUtils already provides and has its own tests. The rate
 * limit middleware is tested directly against mock req/res/next objects
 * — no Express app or real network layer needed for either.
 */

jest.mock('../utils/analyticsUtils', () => ({
  getOverviewStats: jest.fn(),
  getTemplatesWithStats: jest.fn(),
  getTemplateDetail: jest.fn(),
  getTemplateSubmissions: jest.fn(),
  getSubmissionTrends: jest.fn(),
  getTemplateTypeDistribution: jest.fn(),
}));

const { getTemplateDetail, getTemplateSubmissions } = require('../utils/analyticsUtils');
const {
  exportTemplateDetailCSV,
  exportTemplateDetailJSON,
  exportAllSubmissionsCSV,
  MAX_EXPORT_SUBMISSIONS,
} = require('../utils/exportUtils');

describe('exportUtils — submission cap and truncation (issue #40)', () => {
  const baseDetail = {
    draftId: 'd1',
    title: 'Test Template',
    templateType: 'student',
    status: 'active',
    createdAt: new Date().toISOString(),
    expiresAt: null,
    totalSubmissions: 2,
    enabledFields: ['name'],
    fieldStats: { name: { totalFilled: 2, completionRate: 100 } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getTemplateDetail.mockResolvedValue(baseDetail);
  });

  test('EX1: exportTemplateDetailCSV requests submissions capped at MAX_EXPORT_SUBMISSIONS, not the old 10000', async () => {
    getTemplateSubmissions.mockResolvedValue({ submissions: [], total: 0, page: 1, limit: MAX_EXPORT_SUBMISSIONS, totalPages: 0 });

    await exportTemplateDetailCSV('user-1', 'd1');

    expect(getTemplateSubmissions).toHaveBeenCalledWith('user-1', 'd1', 1, MAX_EXPORT_SUBMISSIONS);
    expect(MAX_EXPORT_SUBMISSIONS).toBeLessThan(10000);
  });

  test('EX2: CSV export includes a truncation note when total exceeds the cap', async () => {
    getTemplateSubmissions.mockResolvedValue({
      submissions: [{ submissionId: 's1', submittedAt: new Date().toISOString(), submittedData: { name: 'A' } }],
      total: MAX_EXPORT_SUBMISSIONS + 500,
      page: 1,
      limit: MAX_EXPORT_SUBMISSIONS,
      totalPages: 1,
    });

    const csv = await exportTemplateDetailCSV('user-1', 'd1');

    expect(csv).toMatch(/truncated/i);
    expect(csv).toContain(String(MAX_EXPORT_SUBMISSIONS));
    expect(csv).toContain(String(MAX_EXPORT_SUBMISSIONS + 500));
  });

  test('EX3: CSV export has no truncation note when under the cap', async () => {
    getTemplateSubmissions.mockResolvedValue({
      submissions: [{ submissionId: 's1', submittedAt: new Date().toISOString(), submittedData: { name: 'A' } }],
      total: 1,
      page: 1,
      limit: MAX_EXPORT_SUBMISSIONS,
      totalPages: 1,
    });

    const csv = await exportTemplateDetailCSV('user-1', 'd1');

    expect(csv).not.toMatch(/truncated/i);
  });

  test('EX4: JSON export includes truncated flag and totalAvailable', async () => {
    getTemplateSubmissions.mockResolvedValue({
      submissions: [],
      total: MAX_EXPORT_SUBMISSIONS + 1,
      page: 1,
      limit: MAX_EXPORT_SUBMISSIONS,
      totalPages: 1,
    });

    const json = JSON.parse(await exportTemplateDetailJSON('user-1', 'd1'));

    expect(json.truncated).toBe(true);
    expect(json.totalAvailable).toBe(MAX_EXPORT_SUBMISSIONS + 1);
  });

  test('EX5: JSON export reports truncated=false when under the cap', async () => {
    getTemplateSubmissions.mockResolvedValue({
      submissions: [],
      total: 3,
      page: 1,
      limit: MAX_EXPORT_SUBMISSIONS,
      totalPages: 1,
    });

    const json = JSON.parse(await exportTemplateDetailJSON('user-1', 'd1'));

    expect(json.truncated).toBe(false);
  });

  test('EX6: exportAllSubmissionsCSV also requests the capped limit and notes truncation', async () => {
    getTemplateSubmissions.mockResolvedValue({
      submissions: [{ submissionId: 's1', submittedAt: new Date().toISOString(), submittedData: { name: 'A' } }],
      total: MAX_EXPORT_SUBMISSIONS + 10,
      page: 1,
      limit: MAX_EXPORT_SUBMISSIONS,
      totalPages: 1,
    });

    const csv = await exportAllSubmissionsCSV('user-1', 'd1');

    expect(getTemplateSubmissions).toHaveBeenCalledWith('user-1', 'd1', 1, MAX_EXPORT_SUBMISSIONS);
    expect(csv).toMatch(/truncated/i);
  });
});

describe('exportRateLimit middleware (issue #40)', () => {
  const { exportRateLimit, _resetExportRateLimitForTests } = require('../middleware/exportRateLimit');

  beforeEach(() => {
    _resetExportRateLimitForTests();
  });

  function mockReqRes(uid) {
    const req = { user: uid ? { uid } : undefined };
    const res = {
      statusCode: null,
      body: null,
      headers: {},
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
      setHeader(k, v) { this.headers[k] = v; },
    };
    const next = jest.fn();
    return { req, res, next };
  }

  test('RL1: allows the first export for a user', () => {
    const { req, res, next } = mockReqRes('user-1');

    exportRateLimit(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  test('RL2: blocks a second export from the same user within the cooldown', () => {
    const first = mockReqRes('user-1');
    exportRateLimit(first.req, first.res, first.next);

    const second = mockReqRes('user-1');
    exportRateLimit(second.req, second.res, second.next);

    expect(second.next).not.toHaveBeenCalled();
    expect(second.res.statusCode).toBe(429);
    expect(second.res.body.retryAfterSeconds).toBeGreaterThan(0);
    expect(second.res.headers['Retry-After']).toBeDefined();
  });

  test('RL3: different users are not blocked by each other', () => {
    const first = mockReqRes('user-1');
    exportRateLimit(first.req, first.res, first.next);

    const other = mockReqRes('user-2');
    exportRateLimit(other.req, other.res, other.next);

    expect(other.next).toHaveBeenCalled();
    expect(other.res.statusCode).toBeNull();
  });

  test('RL4: allows another export once the cooldown window has passed', () => {
    const first = mockReqRes('user-1');
    exportRateLimit(first.req, first.res, first.next);

    // Simulate the cooldown elapsing without a real 30s wait in tests.
    _resetExportRateLimitForTests();

    const second = mockReqRes('user-1');
    exportRateLimit(second.req, second.res, second.next);

    expect(second.next).toHaveBeenCalled();
    expect(second.res.statusCode).toBeNull();
  });

  test('RL5: passes through when req.user is missing (verifyToken runs first in the real route chain)', () => {
    const { req, res, next } = mockReqRes(undefined);

    exportRateLimit(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });
});
