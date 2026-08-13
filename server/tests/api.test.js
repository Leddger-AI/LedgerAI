/**
 * Main API Tests — Drafts, Forms, Submissions, Spreadsheets, Meetings, Alerts
 * Uses MongoDB Memory Server for Mongoose models and mocks Supabase
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const path = require('path');

// Mock supabase client
const mockSupabaseQuery = {
  data: null,
  error: null,
  count: null,
};

// Create a thenable chain that resolves to mockSupabaseQuery when awaited
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
    // Make the chain thenable so `await chain` resolves to mockSupabaseQuery
    then: (resolve, reject) => Promise.resolve(mockSupabaseQuery).then(resolve, reject),
  };
  return chain;
}

const mockSupabase = {
  from: jest.fn(() => createChain()),
};

jest.mock('../supabaseClient', () => mockSupabase);

// Mock auth middleware to bypass JWT verification
jest.mock('../middleware/auth', () =>
  jest.fn((req, res, next) => {
    req.user = { uid: req.headers['x-test-uid'] || 'test-user-uid', email: 'test@leddger.ai' };
    next();
  })
);

// Mock scheduler
jest.mock('../scheduler', () => ({
  scheduleCampaign: jest.fn(() => Promise.resolve()),
  cancelScheduledCampaign: jest.fn(() => Promise.resolve()),
  stopAgenda: jest.fn(() => Promise.resolve()),
  scheduleDraftActivation: jest.fn(() => Promise.resolve()),
  cancelDraftActivation: jest.fn(() => Promise.resolve()),
}));

// Mock emailService
jest.mock('../utils/emailService', () => ({
  sendFormSubmissionEmail: jest.fn(() => Promise.resolve()),
}));

// Mock startupCheck
jest.mock('../startupCheck', () => ({
  runStartupChecks: jest.fn(() => Promise.resolve([])),
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);

  // Load the app after mocks are set up
  app = require('../index.js');
  // Wait for mongoose connection promise in index.js
  await new Promise(resolve => setTimeout(resolve, 500));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

beforeEach(async () => {
  // Clear all MongoDB collections
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
  // Reset supabase mock
  jest.clearAllMocks();
  mockSupabaseQuery.data = null;
  mockSupabaseQuery.error = null;
  mockSupabaseQuery.count = null;
});

// Helper: create a spreadsheet
const Spreadsheet = require('../models/Spreadsheet');
const EmailDraft = require('../models/EmailDraft');
const EmailConfig = require('../models/EmailConfig');
const EmailCampaign = require('../models/EmailCampaign');

const createSpreadsheet = async (ownerUid = 'test-user-uid', name = 'Test Sheet', sheets = []) => {
  return Spreadsheet.create({ ownerUid, name, sheets });
};

const createEmailDraft = async (ownerUid = 'test-user-uid', overrides = {}) => {
  return EmailDraft.create({
    ownerUid,
    subject: 'Test Subject',
    bodyHtml: '<p>Hello {{name}}</p>',
    variables: [{ id: 'name', label: 'Name' }],
    dataSourceType: 'none',
    ...overrides,
  });
};

const createEmailConfig = async (ownerUid = 'test-user-uid', overrides = {}) => {
  return EmailConfig.create({
    ownerUid,
    email: 'test@gmail.com',
    authMethod: 'app_password',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    appPassword: 'testpassword',
    ...overrides,
  });
};

// ==========================================
// DRAFTS ENDPOINTS
// ==========================================

describe('Drafts API', () => {
  describe('POST /api/drafts', () => {
    test('D1: creates a draft successfully', async () => {
      mockSupabaseQuery.data = {
        draft_id: 'uuid-123',
        user_id: 'test-user-uid',
        title: 'Test Draft',
        config: { fields: ['name'] },
        template_type: 'student',
        status: 'draft',
        expires_at: null,
        created_at: new Date().toISOString(),
      };
      mockSupabaseQuery.error = null;

      const res = await request(app)
        .post('/api/drafts')
        .set('x-test-uid', 'test-user-uid')
        .send({ title: 'Test Draft', config: { fields: ['name'] }, templateType: 'student' });

      expect(res.status).toBe(200);
      expect(res.body.draftId).toBe('uuid-123');
    });

    test('D2: returns 500 on Supabase error', async () => {
      mockSupabaseQuery.data = null;
      mockSupabaseQuery.error = { message: 'DB error' };

      const res = await request(app)
        .post('/api/drafts')
        .set('x-test-uid', 'test-user-uid')
        .send({ title: 'Test Draft', config: {} });

      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/drafts', () => {
    test('D3: fetches all drafts for user', async () => {
      mockSupabaseQuery.data = [
        { draft_id: 'd1', user_id: 'test-user-uid', title: 'Draft 1', config: {}, template_type: 'student', status: 'draft', expires_at: null, created_at: new Date().toISOString() },
        { draft_id: 'd2', user_id: 'test-user-uid', title: 'Draft 2', config: {}, template_type: 'employee', status: 'active', expires_at: null, created_at: new Date().toISOString() },
      ];
      mockSupabaseQuery.error = null;

      const res = await request(app)
        .get('/api/drafts')
        .set('x-test-uid', 'test-user-uid');

      expect(res.status).toBe(200);
      expect(res.body.drafts).toHaveLength(2);
      expect(res.body.drafts[0].draftId).toBe('d1');
      expect(res.body.drafts[1].templateType).toBe('employee');
    });

    test('D4: returns empty array when no drafts', async () => {
      mockSupabaseQuery.data = [];
      mockSupabaseQuery.error = null;

      const res = await request(app)
        .get('/api/drafts')
        .set('x-test-uid', 'test-user-uid');

      expect(res.status).toBe(200);
      expect(res.body.drafts).toEqual([]);
    });
  });

  describe('DELETE /api/drafts/:draftId', () => {
    test('D5: deletes draft successfully', async () => {
      mockSupabaseQuery.data = null;
      mockSupabaseQuery.error = null;
      mockSupabaseQuery.count = 1;

      const res = await request(app)
        .delete('/api/drafts/draft-123')
        .set('x-test-uid', 'test-user-uid');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });

    test('D6: returns 404 when draft not found', async () => {
      mockSupabaseQuery.data = null;
      mockSupabaseQuery.error = null;
      mockSupabaseQuery.count = 0;

      // Override the thenable to return count=0
      const chain = createChain();
      chain.then = (resolve, reject) => Promise.resolve({ data: null, error: null, count: 0 }).then(resolve, reject);
      mockSupabase.from.mockReturnValueOnce(chain);

      const res = await request(app)
        .delete('/api/drafts/nonexistent')
        .set('x-test-uid', 'test-user-uid');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/drafts/:draftId/activate', () => {
    test('D7: activates draft with full response object', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      mockSupabaseQuery.data = {
        draft_id: 'draft-1',
        user_id: 'test-user-uid',
        title: 'My Draft',
        config: { fields: ['email'] },
        template_type: 'student',
        status: 'active',
        expires_at: futureDate,
        created_at: new Date().toISOString(),
      };
      mockSupabaseQuery.error = null;

      const res = await request(app)
        .put('/api/drafts/draft-1/activate')
        .set('x-test-uid', 'test-user-uid')
        .send({ expiresAt: futureDate });

      expect(res.status).toBe(200);
      expect(res.body.draft).toBeDefined();
      expect(res.body.draft.draftId).toBe('draft-1');
      expect(res.body.draft.config).toBeDefined();
      expect(res.body.draft.templateType).toBe('student');
      expect(res.body.draft.status).toBe('active');
      expect(res.body.draft.expiresAt).toBe(futureDate);
      expect(res.body.draft.createdAt).toBeDefined();
    });

    test('D8: returns 400 when expiresAt is missing', async () => {
      const res = await request(app)
        .put('/api/drafts/draft-1/activate')
        .set('x-test-uid', 'test-user-uid')
        .send({});

      expect(res.status).toBe(400);
    });

    test('D9: returns 404 when draft not found', async () => {
      mockSupabaseQuery.data = null;
      mockSupabaseQuery.error = { message: 'Not found' };

      const res = await request(app)
        .put('/api/drafts/nonexistent/activate')
        .set('x-test-uid', 'test-user-uid')
        .send({ expiresAt: new Date(Date.now() + 86400000).toISOString() });

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/drafts/:draftId/schedule', () => {
    test('D10: schedules draft with valid future dates', async () => {
      const goesLive = new Date(Date.now() + 3600000).toISOString();
      const expires = new Date(Date.now() + 7200000).toISOString();

      mockSupabaseQuery.data = {
        draft_id: 'draft-1',
        user_id: 'test-user-uid',
        title: 'Scheduled Draft',
        config: {},
        template_type: 'student',
        status: 'scheduled',
        goes_live_at: goesLive,
        expires_at: expires,
        created_at: new Date().toISOString(),
      };
      mockSupabaseQuery.error = null;

      const res = await request(app)
        .put('/api/drafts/draft-1/schedule')
        .set('x-test-uid', 'test-user-uid')
        .send({ goesLiveAt: goesLive, expiresAt: expires });

      expect(res.status).toBe(200);
      expect(res.body.draft.status).toBe('scheduled');
      expect(res.body.draft.goesLiveAt).toBe(goesLive);
    });

    test('D11: rejects missing goesLiveAt', async () => {
      const res = await request(app)
        .put('/api/drafts/draft-1/schedule')
        .set('x-test-uid', 'test-user-uid')
        .send({ expiresAt: new Date().toISOString() });

      expect(res.status).toBe(400);
    });

    test('D12: rejects past goesLiveAt', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const futureDate = new Date(Date.now() + 3600000).toISOString();

      const res = await request(app)
        .put('/api/drafts/draft-1/schedule')
        .set('x-test-uid', 'test-user-uid')
        .send({ goesLiveAt: pastDate, expiresAt: futureDate });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('future');
    });

    test('D13: rejects expiresAt before goesLiveAt', async () => {
      const goesLive = new Date(Date.now() + 7200000).toISOString();
      const expires = new Date(Date.now() + 3600000).toISOString();

      const res = await request(app)
        .put('/api/drafts/draft-1/schedule')
        .set('x-test-uid', 'test-user-uid')
        .send({ goesLiveAt: goesLive, expiresAt: expires });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('after');
    });
  });

  describe('DELETE /api/drafts/:draftId/schedule', () => {
    test('D14: cancels scheduled draft', async () => {
      const scheduledDraft = { draft_id: 'draft-1', user_id: 'test-user-uid', title: 'Draft', config: {}, template_type: 'student', status: 'scheduled', goes_live_at: null, expires_at: null, created_at: new Date().toISOString() };
      const cancelledDraft = { ...scheduledDraft, status: 'draft' };

      // First .single() call: find draft (status=scheduled)
      // Second .single() call: update result
      const chain1 = createChain();
      chain1.single.mockResolvedValueOnce({ data: scheduledDraft, error: null });
      const chain2 = createChain();
      chain2.single.mockResolvedValueOnce({ data: cancelledDraft, error: null });

      mockSupabase.from.mockReturnValueOnce(chain1).mockReturnValueOnce(chain2);

      const res = await request(app)
        .delete('/api/drafts/draft-1/schedule')
        .set('x-test-uid', 'test-user-uid');

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('cancelled');
    });

    test('D15: rejects cancel when draft not scheduled', async () => {
      mockSupabaseQuery.data = { draft_id: 'draft-1', user_id: 'test-user-uid', status: 'draft' };
      mockSupabaseQuery.error = null;

      const res = await request(app)
        .delete('/api/drafts/draft-1/schedule')
        .set('x-test-uid', 'test-user-uid');

      expect(res.status).toBe(400);
    });
  });
});

// ==========================================
// FORMS & SUBMISSIONS
// ==========================================

describe('Forms & Submissions API', () => {
  describe('GET /api/forms/:draftId', () => {
    test('F1: returns 404 for nonexistent form', async () => {
      mockSupabaseQuery.data = null;
      mockSupabaseQuery.error = { message: 'Not found' };

      const res = await request(app).get('/api/forms/nonexistent');

      expect(res.status).toBe(404);
    });

    test('F2: returns 403 for draft not yet active', async () => {
      mockSupabaseQuery.data = {
        draft_id: 'd1',
        title: 'Test Form',
        config: {},
        status: 'draft',
        expires_at: null,
      };
      mockSupabaseQuery.error = null;

      const res = await request(app).get('/api/forms/d1');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('not yet active');
    });

    test('F3: returns 403 for scheduled form before go-live time', async () => {
      const futureDate = new Date(Date.now() + 3600000).toISOString();
      mockSupabaseQuery.data = {
        draft_id: 'd1',
        title: 'Scheduled Form',
        config: {},
        status: 'scheduled',
        goes_live_at: futureDate,
        expires_at: new Date(Date.now() + 7200000).toISOString(),
      };
      mockSupabaseQuery.error = null;

      const res = await request(app).get('/api/forms/d1');

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('goes live');
    });

    test('F4: auto-activates scheduled form when go-live time has arrived', async () => {
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const futureExpiry = new Date(Date.now() + 3600000).toISOString();
      mockSupabaseQuery.data = {
        draft_id: 'd1',
        title: 'Auto Activate Form',
        config: { fields: ['name'] },
        status: 'scheduled',
        goes_live_at: pastDate,
        expires_at: futureExpiry,
      };
      mockSupabaseQuery.error = null;

      const res = await request(app).get('/api/forms/d1');

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Auto Activate Form');
    });

    test('F5: returns 410 for expired form', async () => {
      const pastExpiry = new Date(Date.now() - 3600000).toISOString();
      mockSupabaseQuery.data = {
        draft_id: 'd1',
        title: 'Expired Form',
        config: {},
        status: 'active',
        expires_at: pastExpiry,
      };
      mockSupabaseQuery.error = null;

      const res = await request(app).get('/api/forms/d1');

      expect(res.status).toBe(410);
      expect(res.body.error).toContain('expired');
    });

    test('F6: returns form config for active form', async () => {
      const futureExpiry = new Date(Date.now() + 86400000).toISOString();
      mockSupabaseQuery.data = {
        draft_id: 'd1',
        title: 'Active Form',
        config: { fields: ['name', 'email'] },
        status: 'active',
        expires_at: futureExpiry,
      };
      mockSupabaseQuery.error = null;

      const res = await request(app).get('/api/forms/d1');

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Active Form');
      expect(res.body.config).toBeDefined();
    });
  });

  describe('POST /api/forms/:draftId/submit', () => {
    test('F7: submits form successfully', async () => {
      const futureExpiry = new Date(Date.now() + 86400000).toISOString();
      mockSupabaseQuery.data = {
        draft_id: 'd1',
        user_id: 'test-user-uid',
        title: 'Active Form',
        status: 'active',
        expires_at: futureExpiry,
      };
      mockSupabaseQuery.error = null;

      const res = await request(app)
        .post('/api/forms/d1/submit')
        .send({ submittedData: { name: 'John', email: 'john@test.com' } });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('submitted');
    });

    test('F8: rejects submission for expired form', async () => {
      const pastExpiry = new Date(Date.now() - 3600000).toISOString();
      mockSupabaseQuery.data = {
        draft_id: 'd1',
        title: 'Expired',
        status: 'expired',
        expires_at: pastExpiry,
      };
      mockSupabaseQuery.error = null;

      const res = await request(app)
        .post('/api/forms/d1/submit')
        .send({ submittedData: { name: 'John' } });

      expect(res.status).toBe(410);
    });

    test('F9: returns 404 for nonexistent form submission', async () => {
      mockSupabaseQuery.data = null;
      mockSupabaseQuery.error = { message: 'Not found' };

      const res = await request(app)
        .post('/api/forms/nonexistent/submit')
        .send({ submittedData: {} });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/submissions', () => {
    test('F10: fetches all submissions for user', async () => {
      mockSupabaseQuery.data = [
        { submission_id: 's1', draft_id: 'd1', title: 'Form 1', submitted_data: { name: 'John' }, submitted_at: new Date().toISOString() },
        { submission_id: 's2', draft_id: 'd2', title: 'Form 2', submitted_data: { name: 'Jane' }, submitted_at: new Date().toISOString() },
      ];
      mockSupabaseQuery.error = null;

      const res = await request(app)
        .get('/api/submissions')
        .set('x-test-uid', 'test-user-uid');

      expect(res.status).toBe(200);
      expect(res.body.submissions).toHaveLength(2);
      expect(res.body.submissions[0].submissionId).toBe('s1');
      expect(res.body.submissions[0].submittedData).toEqual({ name: 'John' });
    });

    test('F11: returns empty when no submissions', async () => {
      mockSupabaseQuery.data = [];
      mockSupabaseQuery.error = null;

      const res = await request(app)
        .get('/api/submissions')
        .set('x-test-uid', 'test-user-uid');

      expect(res.status).toBe(200);
      expect(res.body.submissions).toEqual([]);
    });
  });

  describe('GET /api/submissions/:draftId', () => {
    test('F12: fetches submissions for specific draft', async () => {
      mockSupabaseQuery.data = [
        { submission_id: 's1', draft_id: 'd1', title: 'Form 1', submitted_data: { name: 'John' }, submitted_at: new Date().toISOString() },
      ];
      mockSupabaseQuery.error = null;

      const res = await request(app)
        .get('/api/submissions/d1')
        .set('x-test-uid', 'test-user-uid');

      expect(res.status).toBe(200);
      expect(res.body.submissions).toHaveLength(1);
      expect(res.body.submissions[0].draftId).toBe('d1');
    });
  });
});

// ==========================================
// SPREADSHEETS
// ==========================================

describe('Spreadsheets API', () => {
  test('S1: POST creates a new spreadsheet', async () => {
    const res = await request(app)
      .post('/api/spreadsheets')
      .set('x-test-uid', 'test-user-uid')
      .send({ name: 'My Sheet', sheets: [{ data: [['a', 'b']] }] });

    expect(res.status).toBe(200);
    expect(res.body.spreadsheet).toBeDefined();
    expect(res.body.spreadsheet.name).toBe('My Sheet');
  });

  test('S2: POST returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/spreadsheets')
      .set('x-test-uid', 'test-user-uid')
      .send({ sheets: [] });

    expect(res.status).toBe(400);
  });

  test('S3: POST updates existing spreadsheet with same name', async () => {
    await createSpreadsheet('test-user-uid', 'Dup Sheet', [{ data: [['old']] }]);

    const res = await request(app)
      .post('/api/spreadsheets')
      .set('x-test-uid', 'test-user-uid')
      .send({ name: 'Dup Sheet', sheets: [{ data: [['new']] }] });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('updated');
  });

  test('S4: GET lists all spreadsheets for user', async () => {
    await createSpreadsheet('test-user-uid', 'Sheet 1');
    await createSpreadsheet('test-user-uid', 'Sheet 2');
    await createSpreadsheet('other-user', 'Other Sheet');

    const res = await request(app)
      .get('/api/spreadsheets')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.spreadsheets).toHaveLength(2);
  });

  test('S5: GET /count returns count and limit', async () => {
    await createSpreadsheet('test-user-uid', 'Sheet 1');
    await createSpreadsheet('test-user-uid', 'Sheet 2');

    const res = await request(app)
      .get('/api/spreadsheets/count')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.limit).toBe(20);
  });

  test('S6: GET /:id returns 404 for nonexistent spreadsheet', async () => {
    const res = await request(app)
      .get('/api/spreadsheets/507f1f77bcf86cd799439011')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(404);
  });

  test('S7: GET /:id returns spreadsheet for owner', async () => {
    const sheet = await createSpreadsheet('test-user-uid', 'My Sheet', [{ data: [['a']] }]);

    const res = await request(app)
      .get(`/api/spreadsheets/${sheet._id}`)
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.spreadsheet.name).toBe('My Sheet');
  });

  test('S8: PUT updates spreadsheet', async () => {
    const sheet = await createSpreadsheet('test-user-uid', 'Original');

    const res = await request(app)
      .put(`/api/spreadsheets/${sheet._id}`)
      .set('x-test-uid', 'test-user-uid')
      .send({ name: 'Updated', sheets: [{ data: [['x']] }] });

    expect(res.status).toBe(200);
    expect(res.body.spreadsheet.name).toBe('Updated');
  });

  test('S9: DELETE removes spreadsheet', async () => {
    const sheet = await createSpreadsheet('test-user-uid', 'To Delete');

    const res = await request(app)
      .delete(`/api/spreadsheets/${sheet._id}`)
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted');
  });

  test('S10: DELETE returns 404 for other user spreadsheet', async () => {
    const sheet = await createSpreadsheet('other-user', 'Not Mine');

    const res = await request(app)
      .delete(`/api/spreadsheets/${sheet._id}`)
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(404);
  });

  test('S11: POST returns 409 when limit reached', async () => {
    // Create 20 spreadsheets
    for (let i = 0; i < 20; i++) {
      await createSpreadsheet('test-user-uid', `Sheet ${i}`);
    }

    const res = await request(app)
      .post('/api/spreadsheets')
      .set('x-test-uid', 'test-user-uid')
      .send({ name: 'Over Limit Sheet', sheets: [] });

    expect(res.status).toBe(409);
    expect(res.body.limit).toBe(20);
  });

  test('S12: GET /:id/headers extracts headers from dense data', async () => {
    const sheet = await createSpreadsheet('test-user-uid', 'Headers Sheet', [{
      data: [
        [{ m: 'Name' }, { m: 'Email' }, { m: 'Phone' }],
        ['John', 'john@test.com', '555-1234'],
      ],
    }]);

    const res = await request(app)
      .get(`/api/spreadsheets/${sheet._id}/headers`)
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.headers).toEqual(['Name', 'Email', 'Phone']);
  });

  test('S13: GET /:id/headers extracts headers from sparse celldata', async () => {
    const sheet = await createSpreadsheet('test-user-uid', 'Sparse Sheet', [{
      celldata: [
        { r: 0, c: 0, v: { m: 'First', v: 'First' } },
        { r: 0, c: 1, v: { m: 'Second', v: 'Second' } },
        { r: 1, c: 0, v: { m: 'Data', v: 'Data' } },
      ],
    }]);

    const res = await request(app)
      .get(`/api/spreadsheets/${sheet._id}/headers`)
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.headers).toEqual(['First', 'Second']);
  });

  test('S14: GET /metadata returns computed metadata', async () => {
    await createSpreadsheet('test-user-uid', 'Meta Sheet', [{
      data: [['a', 'b', 'c'], ['1', '2', '3'], ['4', '5', '6']],
    }]);

    const res = await request(app)
      .get('/api/spreadsheets/metadata')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.spreadsheets).toHaveLength(1);
    expect(res.body.spreadsheets[0].maxRows).toBe(3);
    expect(res.body.spreadsheets[0].maxCols).toBe(3);
    expect(res.body.spreadsheets[0].sheetCount).toBe(1);
  });
});

// ==========================================
// MEETINGS & ALERTS
// ==========================================

describe('Meetings API', () => {
  test('M1: GET /api/meetings returns user meetings', async () => {
    mockSupabaseQuery.data = [
      { id: 'm1', user_id: 'test-user-uid', title: 'Team Standup', start_time: null, end_time: null, duration_minutes: 30, attendees: [], ai_project: 'Project A', ai_confidence: 0.85, requires_human_review: false, created_at: new Date().toISOString() },
    ];
    mockSupabaseQuery.error = null;

    const res = await request(app)
      .get('/api/meetings')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.meetings).toHaveLength(1);
    expect(res.body.meetings[0].title).toBe('Team Standup');
  });

  test('M2: POST /api/meetings creates a meeting', async () => {
    mockSupabaseQuery.data = {
      id: 'm2',
      user_id: 'test-user-uid',
      title: 'New Meeting',
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
      duration_minutes: 45,
      attendees: ['alice', 'bob'],
      ai_project: 'Project B',
      ai_confidence: 0.9,
      requires_human_review: false,
    };
    mockSupabaseQuery.error = null;

    const res = await request(app)
      .post('/api/meetings')
      .set('x-test-uid', 'test-user-uid')
      .send({
        title: 'New Meeting',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        durationMinutes: 45,
        attendees: ['alice', 'bob'],
        aiProject: 'Project B',
        aiConfidence: 0.9,
        requiresHumanReview: false,
      });

    expect(res.status).toBe(200);
    expect(res.body.meeting).toBeDefined();
    expect(res.body.meeting.title).toBe('New Meeting');
  });

  test('M3: DELETE /api/meetings/:id deletes meeting', async () => {
    mockSupabaseQuery.data = null;
    mockSupabaseQuery.error = null;

    const res = await request(app)
      .delete('/api/meetings/m1')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted');
  });
});

describe('Alerts API', () => {
  test('AL1: GET /api/alerts returns user alerts', async () => {
    mockSupabaseQuery.data = [
      { id: 'a1', user_id: 'test-user-uid', type: 'info', title: 'Test Alert', description: 'Test desc', resolved: false, created_at: new Date().toISOString() },
    ];
    mockSupabaseQuery.error = null;

    const res = await request(app)
      .get('/api/alerts')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.alerts).toHaveLength(1);
    expect(res.body.alerts[0].title).toBe('Test Alert');
  });

  test('AL2: POST /api/alerts creates an alert', async () => {
    mockSupabaseQuery.data = {
      id: 'a2',
      user_id: 'test-user-uid',
      type: 'warning',
      title: 'Warning Alert',
      description: 'Something happened',
      resolved: false,
    };
    mockSupabaseQuery.error = null;

    const res = await request(app)
      .post('/api/alerts')
      .set('x-test-uid', 'test-user-uid')
      .send({ type: 'warning', title: 'Warning Alert', description: 'Something happened' });

    expect(res.status).toBe(200);
    expect(res.body.alert).toBeDefined();
    expect(res.body.alert.title).toBe('Warning Alert');
  });

  test('AL3: PUT /api/alerts/:id/resolve resolves alert', async () => {
    mockSupabaseQuery.data = {
      id: 'a1',
      user_id: 'test-user-uid',
      type: 'info',
      title: 'Resolved Alert',
      resolved: true,
    };
    mockSupabaseQuery.error = null;

    const res = await request(app)
      .put('/api/alerts/a1/resolve')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.alert.resolved).toBe(true);
  });

  test('AL4: DELETE /api/alerts/:id deletes alert', async () => {
    mockSupabaseQuery.data = null;
    mockSupabaseQuery.error = null;

    const res = await request(app)
      .delete('/api/alerts/a1')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted');
  });
});
