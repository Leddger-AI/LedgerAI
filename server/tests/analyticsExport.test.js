/**
 * Analytics Phase 5 Tests — Local Download Exports + Scheduled Reports
 *
 * Covers:
 *  - GET /api/analytics/export/overview?format=csv|json|pdf
 *  - GET /api/analytics/export/templates/:draftId?format=csv|json|pdf
 *  - POST/GET/PUT/DELETE /api/analytics/reports
 *  - AnalyticsReport model (pushRun cap, schema validation)
 *  - analyticsExport utility builders (CSV/JSON/PDF shape)
 *
 * Uses MongoDB Memory Server for Mongoose models and mocks Supabase,
 * the scheduler, and emailService so no real I/O happens.
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

// --- Supabase mock (same shape as analytics.test.js) ---
const mockSupabaseQuery = { data: null, error: null, count: null };

function createChain() {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(mockSupabaseQuery),
    count: jest.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(mockSupabaseQuery).then(resolve, reject),
  };
  return chain;
}

const mockSupabase = { from: jest.fn(() => createChain()) };
jest.mock('../supabaseClient', () => mockSupabase);

// Mock auth middleware
jest.mock('../middleware/auth', () =>
  jest.fn((req, res, next) => {
    req.user = { uid: req.headers['x-test-uid'] || 'test-user-uid', email: 'test@leddger.ai' };
    next();
  })
);

// Mock scheduler — capture scheduleAnalyticsReport / cancelAnalyticsReport calls.
// Jest requires the variable referenced by the factory to be prefixed with `mock`.
const mockScheduler = {
  scheduleCampaign: jest.fn(() => Promise.resolve()),
  cancelScheduledCampaign: jest.fn(() => Promise.resolve()),
  stopAgenda: jest.fn(() => Promise.resolve()),
  scheduleDraftActivation: jest.fn(() => Promise.resolve()),
  cancelDraftActivation: jest.fn(() => Promise.resolve()),
  scheduleAnalyticsReport: jest.fn(() => Promise.resolve()),
  cancelAnalyticsReport: jest.fn(() => Promise.resolve()),
};
jest.mock('../scheduler', () => mockScheduler);

// Mock emailService
jest.mock('../utils/emailService', () => ({
  createTransporter: jest.fn(),
  sendFormSubmissionEmail: jest.fn(() => Promise.resolve()),
  buildSubmissionEmailHtml: jest.fn(),
  sendOtpEmail: jest.fn(() => Promise.resolve()),
}));

// Mock startupCheck
jest.mock('../startupCheck', () => ({
  runStartupChecks: jest.fn(() => Promise.resolve([])),
}));

// Mock crypto
jest.mock('../utils/crypto', () => ({
  encrypt: jest.fn((val) => `encrypted:${val}`),
  decrypt: jest.fn((val) => String(val).replace('encrypted:', '')),
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  app = require('../index.js');
  await new Promise(resolve => setTimeout(resolve, 500));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  jest.clearAllMocks();
  mockSupabaseQuery.data = null;
  mockSupabaseQuery.error = null;
  mockSupabaseQuery.count = null;
});

// --- Helpers ---
const TemplateData = require('../models/TemplateData');
const TemplateSubmission = require('../models/TemplateSubmission');
const AnalyticsReport = require('../models/AnalyticsReport');

const createTemplate = async (overrides = {}) => {
  return TemplateData.create({
    draftId: overrides.draftId || 'draft-001',
    ownerUid: overrides.ownerUid || 'test-user-uid',
    title: overrides.title || 'Test Template',
    templateType: overrides.templateType || 'student',
    config: overrides.config || { toggles: { name: true, experience: true, githubUsername: true } },
    status: overrides.status || 'active',
    source: overrides.source || 'created',
    ...overrides,
  });
};

const createSubmission = async (overrides = {}) => {
  return TemplateSubmission.create({
    submissionId: overrides.submissionId || 'sub-001',
    draftId: overrides.draftId || 'draft-001',
    ownerUid: overrides.ownerUid || 'test-user-uid',
    templateType: overrides.templateType || 'student',
    title: overrides.title || 'Test Template',
    submittedData: overrides.submittedData || {
      name: 'John Doe',
      experience: 4,
      githubUsername: 'johndoe',
    },
    ...overrides,
  });
};

// =====================
// MODEL TESTS
// =====================

describe('AnalyticsReport Model', () => {
  test('should create a valid report with defaults', async () => {
    const report = await AnalyticsReport.create({
      ownerUid: 'test-user-uid',
      frequency: 'weekly',
      scope: 'overview',
      recipientEmails: ['a@example.com'],
    });
    expect(report.format).toBe('csv');
    expect(report.status).toBe('active');
    expect(report.name).toBe('Analytics Report');
    expect(report.runs).toEqual([]);
    expect(report.lastRunAt).toBeNull();
  });

  test('should reject invalid frequency', async () => {
    await expect(AnalyticsReport.create({
      ownerUid: 'u1', frequency: 'hourly', scope: 'overview', recipientEmails: ['a@x.com'],
    })).rejects.toThrow();
  });

  test('should reject invalid scope', async () => {
    await expect(AnalyticsReport.create({
      ownerUid: 'u1', frequency: 'daily', scope: 'universe', recipientEmails: ['a@x.com'],
    })).rejects.toThrow();
  });

  test('should reject invalid format', async () => {
    await expect(AnalyticsReport.create({
      ownerUid: 'u1', frequency: 'daily', scope: 'overview', format: 'xml', recipientEmails: ['a@x.com'],
    })).rejects.toThrow();
  });

  test('pushRun caps history at 20 entries and updates lastRun fields', async () => {
    const report = await AnalyticsReport.create({
      ownerUid: 'u1', frequency: 'daily', scope: 'overview', recipientEmails: ['a@x.com'],
    });
    for (let i = 0; i < 25; i++) {
      report.pushRun({ runAt: new Date(), status: i % 2 === 0 ? 'success' : 'failed', error: i % 2 === 0 ? null : 'boom', recipients: 1 });
    }
    expect(report.runs.length).toBe(20);
    // 25th run (i=24) is even → 'success', with no error
    expect(report.lastRunStatus).toBe('success');
    expect(report.lastRunError).toBeNull();
    await report.save();
    const reloaded = await AnalyticsReport.findById(report._id);
    expect(reloaded.runs.length).toBe(20);
  });
});

// =====================
// EXPORT UTILITY TESTS
// =====================

describe('analyticsExport utilities', () => {
  const {
    overviewToCsv,
    overviewToJson,
    templateToCsv,
    templateToJson,
    slugify,
    rowsToCsv,
  } = require('../utils/analyticsExport');

  test('rowsToCsv quotes cells and escapes embedded quotes', () => {
    const csv = rowsToCsv([['a', 'b"c'], ['1', '2']]);
    expect(csv).toBe('"a","b""c"\n"1","2"');
  });

  test('slugify strips non-alphanumeric', () => {
    expect(slugify('Q4 Marketing / Strategy!')).toBe('Q4_Marketing_Strategy');
    expect(slugify('')).toBe('report');
  });

  test('overviewToCsv contains KPI labels and template rows', () => {
    const data = {
      overview: { totalTemplates: 3, activeLinks: 2, totalSubmissions: 10, avgFieldsPerTemplate: 4 },
      templates: [{ draftId: 'd1', title: 'T1', templateType: 'student', status: 'active', submissionCount: 5, lastSubmissionAt: null }],
      trends: [],
      typeDistribution: [],
    };
    const csv = overviewToCsv(data);
    expect(csv).toContain('Total Templates');
    expect(csv).toContain('"3"');
    expect(csv).toContain('T1');
  });

  test('overviewToJson returns parseable JSON', () => {
    const data = { overview: { totalTemplates: 1 }, templates: [], trends: [], typeDistribution: [] };
    const json = overviewToJson(data);
    expect(JSON.parse(json).overview.totalTemplates).toBe(1);
  });

  test('templateToCsv builds header from submission keys', () => {
    const data = {
      detail: { title: 'T', templateType: 'student', status: 'active', totalSubmissions: 1, enabledFields: ['name'], fieldStats: {} },
      submissions: [{ submissionId: 's1', submittedAt: new Date('2026-01-01'), submittedData: { name: 'Jane' } }],
    };
    const csv = templateToCsv(data);
    expect(csv).toContain('Submission ID');
    expect(csv).toContain('Jane');
  });

  test('templateToJson includes detail and submissions', () => {
    const data = { detail: { title: 'T' }, submissions: [{ submissionId: 's1' }] };
    const parsed = JSON.parse(templateToJson(data));
    expect(parsed.detail.title).toBe('T');
    expect(parsed.submissions).toHaveLength(1);
  });
});

// =====================
// DOWNLOAD ENDPOINT TESTS
// =====================

describe('GET /api/analytics/export/overview', () => {
  test('returns CSV with text/csv content-type', async () => {
    await createTemplate();
    const res = await request(app)
      .get('/api/analytics/export/overview?format=csv')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.text).toContain('Total Templates');
  });

  test('returns JSON with application/json content-type', async () => {
    await createTemplate();
    const res = await request(app)
      .get('/api/analytics/export/overview?format=json')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/json');
    const parsed = JSON.parse(res.text);
    expect(parsed.overview).toBeDefined();
    expect(parsed.templates).toBeDefined();
  });

  test('returns PDF with application/pdf content-type', async () => {
    await createTemplate();
    const res = await request(app)
      .get('/api/analytics/export/overview?format=pdf')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    // PDF magic bytes: %PDF
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });

  test('falls back to CSV for unknown format', async () => {
    await createTemplate();
    const res = await request(app)
      .get('/api/analytics/export/overview?format=xml')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
  });

  test('returns 200 with empty data when no templates exist', async () => {
    const res = await request(app)
      .get('/api/analytics/export/overview?format=csv')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Total Templates');
    expect(res.text).toContain('"0"');
  });
});

describe('GET /api/analytics/export/templates/:draftId', () => {
  test('returns CSV for an existing template', async () => {
    await createTemplate({ draftId: 'exp-1' });
    await createSubmission({ draftId: 'exp-1', submissionId: 'exp-s1', submittedData: { name: 'Alice' } });

    const res = await request(app)
      .get('/api/analytics/export/templates/exp-1?format=csv')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Alice');
  });

  test('returns PDF for an existing template', async () => {
    await createTemplate({ draftId: 'exp-2', title: 'PDF Template' });
    await createSubmission({ draftId: 'exp-2', submissionId: 'exp-s2' });

    const res = await request(app)
      .get('/api/analytics/export/templates/exp-2?format=pdf')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });

  test('returns 404 for non-existent template', async () => {
    const res = await request(app)
      .get('/api/analytics/export/templates/does-not-exist?format=csv')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Template not found');
  });

  test('does not leak templates owned by another user', async () => {
    await createTemplate({ draftId: 'other-user', ownerUid: 'someone-else' });
    const res = await request(app)
      .get('/api/analytics/export/templates/other-user?format=csv')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(404);
  });
});

// =====================
// SCHEDULED REPORT CRUD TESTS
// =====================

describe('POST /api/analytics/reports', () => {
  test('creates an overview report and schedules it', async () => {
    const res = await request(app)
      .post('/api/analytics/reports')
      .set('x-test-uid', 'test-user-uid')
      .send({
        name: 'Weekly Digest',
        frequency: 'weekly',
        scope: 'overview',
        format: 'pdf',
        recipientEmails: ['alice@example.com', 'bob@example.com'],
      });
    expect(res.status).toBe(200);
    expect(res.body.report.name).toBe('Weekly Digest');
    expect(res.body.report.frequency).toBe('weekly');
    expect(res.body.report.format).toBe('pdf');
    expect(res.body.report.recipientEmails).toHaveLength(2);
    expect(res.body.report.status).toBe('active');
    expect(mockScheduler.scheduleAnalyticsReport).toHaveBeenCalledTimes(1);
    expect(mockScheduler.scheduleAnalyticsReport.mock.calls[0][1]).toBe('weekly');
  });

  test('rejects invalid frequency', async () => {
    const res = await request(app)
      .post('/api/analytics/reports')
      .set('x-test-uid', 'test-user-uid')
      .send({ frequency: 'hourly', scope: 'overview', recipientEmails: ['a@x.com'] });
    expect(res.status).toBe(400);
  });

  test('rejects template scope without draftId', async () => {
    const res = await request(app)
      .post('/api/analytics/reports')
      .set('x-test-uid', 'test-user-uid')
      .send({ frequency: 'daily', scope: 'template', recipientEmails: ['a@x.com'] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/draftId/);
  });

  test('rejects template scope with non-existent draftId', async () => {
    const res = await request(app)
      .post('/api/analytics/reports')
      .set('x-test-uid', 'test-user-uid')
      .send({ frequency: 'daily', scope: 'template', draftId: 'nope', recipientEmails: ['a@x.com'] });
    expect(res.status).toBe(404);
  });

  test('rejects empty recipientEmails', async () => {
    const res = await request(app)
      .post('/api/analytics/reports')
      .set('x-test-uid', 'test-user-uid')
      .send({ frequency: 'daily', scope: 'overview', recipientEmails: [] });
    expect(res.status).toBe(400);
  });

  test('rejects invalid recipientEmails and caps the list at 20', async () => {
    const bad = await request(app)
      .post('/api/analytics/reports')
      .set('x-test-uid', 'test-user-uid')
      .send({ frequency: 'daily', scope: 'overview', recipientEmails: ['not-an-email', 'also bad'] });
    expect(bad.status).toBe(400);

    const many = Array.from({ length: 21 }, (_, i) => `u${i}@x.com`);
    const capped = await request(app)
      .post('/api/analytics/reports')
      .set('x-test-uid', 'test-user-uid')
      .send({ frequency: 'daily', scope: 'overview', recipientEmails: many });
    expect(capped.status).toBe(400);
  });

  test('normalizes recipientEmails (trim, lowercase, dedupe)', async () => {
    const res = await request(app)
      .post('/api/analytics/reports')
      .set('x-test-uid', 'test-user-uid')
      .send({ frequency: 'daily', scope: 'overview', recipientEmails: ['  Alice@X.com ', 'alice@x.com', 'bob@x.com'] });
    expect(res.status).toBe(200);
    expect(res.body.report.recipientEmails).toEqual(['alice@x.com', 'bob@x.com']);
  });

  test('defaults format to csv when omitted', async () => {
    const res = await request(app)
      .post('/api/analytics/reports')
      .set('x-test-uid', 'test-user-uid')
      .send({ frequency: 'daily', scope: 'overview', recipientEmails: ['a@x.com'] });
    expect(res.status).toBe(200);
    expect(res.body.report.format).toBe('csv');
  });
});

describe('GET /api/analytics/reports', () => {
  test('lists only the current user reports, newest first', async () => {
    await AnalyticsReport.create({ ownerUid: 'test-user-uid', frequency: 'daily', scope: 'overview', recipientEmails: ['a@x.com'], name: 'R1' });
    await AnalyticsReport.create({ ownerUid: 'test-user-uid', frequency: 'weekly', scope: 'overview', recipientEmails: ['a@x.com'], name: 'R2' });
    await AnalyticsReport.create({ ownerUid: 'other-user', frequency: 'daily', scope: 'overview', recipientEmails: ['a@x.com'], name: 'Other' });

    const res = await request(app)
      .get('/api/analytics/reports')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.reports).toHaveLength(2);
    expect(res.body.reports.map(r => r.name)).not.toContain('Other');
  });

  test('returns empty array when none exist', async () => {
    const res = await request(app)
      .get('/api/analytics/reports')
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(res.body.reports).toEqual([]);
  });
});

describe('PUT /api/analytics/reports/:id', () => {
  test('pauses an active report and cancels its agenda job', async () => {
    const report = await AnalyticsReport.create({ ownerUid: 'test-user-uid', frequency: 'daily', scope: 'overview', recipientEmails: ['a@x.com'] });

    const res = await request(app)
      .put(`/api/analytics/reports/${report._id}`)
      .set('x-test-uid', 'test-user-uid')
      .send({ status: 'paused' });
    expect(res.status).toBe(200);
    expect(res.body.report.status).toBe('paused');
    // Pause cancels the existing job and does NOT reschedule (status !== active)
    expect(mockScheduler.cancelAnalyticsReport).toHaveBeenCalledTimes(1);
    expect(mockScheduler.scheduleAnalyticsReport).not.toHaveBeenCalled();
  });

  test('reschedules when frequency changes and report stays active', async () => {
    const report = await AnalyticsReport.create({ ownerUid: 'test-user-uid', frequency: 'daily', scope: 'overview', recipientEmails: ['a@x.com'] });

    const res = await request(app)
      .put(`/api/analytics/reports/${report._id}`)
      .set('x-test-uid', 'test-user-uid')
      .send({ frequency: 'monthly' });
    expect(res.status).toBe(200);
    expect(res.body.report.frequency).toBe('monthly');
    expect(mockScheduler.cancelAnalyticsReport).toHaveBeenCalledTimes(1);
    expect(mockScheduler.scheduleAnalyticsReport).toHaveBeenCalledTimes(1);
    expect(mockScheduler.scheduleAnalyticsReport.mock.calls[0][1]).toBe('monthly');
  });

  test('updates name, format, and recipients', async () => {
    const report = await AnalyticsReport.create({ ownerUid: 'test-user-uid', frequency: 'daily', scope: 'overview', recipientEmails: ['a@x.com'] });

    const res = await request(app)
      .put(`/api/analytics/reports/${report._id}`)
      .set('x-test-uid', 'test-user-uid')
      .send({ name: 'Renamed', format: 'pdf', recipientEmails: ['x@x.com', 'y@x.com', 'z@x.com'] });
    expect(res.status).toBe(200);
    expect(res.body.report.name).toBe('Renamed');
    expect(res.body.report.format).toBe('pdf');
    expect(res.body.report.recipientEmails).toHaveLength(3);
  });

  test('returns 404 for another user report', async () => {
    const report = await AnalyticsReport.create({ ownerUid: 'other-user', frequency: 'daily', scope: 'overview', recipientEmails: ['a@x.com'] });
    const res = await request(app)
      .put(`/api/analytics/reports/${report._id}`)
      .set('x-test-uid', 'test-user-uid')
      .send({ name: 'Hijack' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/analytics/reports/:id', () => {
  test('deletes the report and cancels its agenda job', async () => {
    const report = await AnalyticsReport.create({ ownerUid: 'test-user-uid', frequency: 'daily', scope: 'overview', recipientEmails: ['a@x.com'] });

    const res = await request(app)
      .delete(`/api/analytics/reports/${report._id}`)
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(200);
    expect(mockScheduler.cancelAnalyticsReport).toHaveBeenCalledTimes(1);
    const found = await AnalyticsReport.findById(report._id);
    expect(found).toBeNull();
  });

  test('returns 404 for another user report', async () => {
    const report = await AnalyticsReport.create({ ownerUid: 'other-user', frequency: 'daily', scope: 'overview', recipientEmails: ['a@x.com'] });
    const res = await request(app)
      .delete(`/api/analytics/reports/${report._id}`)
      .set('x-test-uid', 'test-user-uid');
    expect(res.status).toBe(404);
  });
});

