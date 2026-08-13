/**
 * Email Automation API Tests
 * Tests: Email Drafts CRUD, Config CRUD, Test Send, Campaign Send,
 *        Scheduling, Send Log, Campaigns List
 * Uses MongoDB Memory Server for Mongoose models, mocks Supabase + Nodemailer
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

// Mock supabase client
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

// Mock scheduler
const mockScheduler = {
  scheduleCampaign: jest.fn(() => Promise.resolve()),
  cancelScheduledCampaign: jest.fn(() => Promise.resolve()),
  stopAgenda: jest.fn(() => Promise.resolve()),
  scheduleDraftActivation: jest.fn(() => Promise.resolve()),
  cancelDraftActivation: jest.fn(() => Promise.resolve()),
};
jest.mock('../scheduler', () => mockScheduler);

// Mock emailService
jest.mock('../utils/emailService', () => ({
  sendFormSubmissionEmail: jest.fn(() => Promise.resolve()),
}));

// Mock startupCheck
jest.mock('../startupCheck', () => ({
  runStartupChecks: jest.fn(() => Promise.resolve([])),
}));

// Mock nodemailer
const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));
jest.mock('nodemailer', () => ({
  createTransport: mockCreateTransport,
}));

// Mock googleapis
jest.mock('googleapis', () => {
  const mockGetAccessToken = jest.fn((cb) => cb(null, 'mock-access-token'));
  return {
    google: {
      auth: {
        OAuth2: jest.fn(() => ({
          setCredentials: jest.fn(),
          getAccessToken: mockGetAccessToken,
        })),
      },
    },
    __mockGetAccessToken: mockGetAccessToken,
  };
});

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
  mockSendMail.mockReset();
  mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
});

const EmailDraft = require('../models/EmailDraft');
const EmailConfig = require('../models/EmailConfig');
const EmailCampaign = require('../models/EmailCampaign');

const createDraft = async (ownerUid = 'test-user-uid', overrides = {}) => {
  return EmailDraft.create({
    ownerUid,
    subject: 'Test Subject',
    bodyHtml: '<p>Hello {{name}}</p>',
    variables: [{ id: 'name', label: 'Name' }],
    dataSourceType: 'none',
    ...overrides,
  });
};

const createConfig = async (ownerUid = 'test-user-uid', overrides = {}) => {
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
// EMAIL DRAFTS CRUD
// ==========================================

describe('Email Drafts CRUD', () => {
  test('E1: POST /api/email/drafts creates draft', async () => {
    const res = await request(app)
      .post('/api/email/drafts')
      .set('x-test-uid', 'test-user-uid')
      .send({ subject: 'My Email', bodyHtml: '<p>Content</p>', variables: [{ id: 'x', label: 'X' }] });

    expect(res.status).toBe(200);
    expect(res.body.draft).toBeDefined();
    expect(res.body.draft.subject).toBe('My Email');
    expect(res.body.draft.bodyHtml).toBe('<p>Content</p>');
  });

  test('E2: POST returns 400 when bodyHtml is missing', async () => {
    const res = await request(app)
      .post('/api/email/drafts')
      .set('x-test-uid', 'test-user-uid')
      .send({ subject: 'No Body' });

    expect(res.status).toBe(400);
  });

  test('E3: GET /api/email/drafts lists drafts without bodyHtml', async () => {
    await createDraft();
    await createDraft('test-user-uid', { subject: 'Second Draft' });

    const res = await request(app)
      .get('/api/email/drafts')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.drafts).toHaveLength(2);
    expect(res.body.drafts[0].bodyHtml).toBeUndefined();
  });

  test('E4: GET /api/email/drafts/:id returns full draft with bodyHtml', async () => {
    const draft = await createDraft();

    const res = await request(app)
      .get(`/api/email/drafts/${draft._id}`)
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.draft.bodyHtml).toBeDefined();
  });

  test('E5: GET /api/email/drafts/:id returns 404 for nonexistent', async () => {
    const res = await request(app)
      .get('/api/email/drafts/507f1f77bcf86cd799439011')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(404);
  });

  test('E6: PUT /api/email/drafts/:id updates draft fields', async () => {
    const draft = await createDraft();

    const res = await request(app)
      .put(`/api/email/drafts/${draft._id}`)
      .set('x-test-uid', 'test-user-uid')
      .send({ subject: 'Updated Subject', bodyHtml: '<p>New</p>' });

    expect(res.status).toBe(200);
    expect(res.body.draft.subject).toBe('Updated Subject');
    expect(res.body.draft.bodyHtml).toBe('<p>New</p>');
  });

  test('E7: DELETE /api/email/drafts/:id deletes draft', async () => {
    const draft = await createDraft();

    const res = await request(app)
      .delete(`/api/email/drafts/${draft._id}`)
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted');
  });

  test('E8: DELETE returns 404 for other user draft', async () => {
    const draft = await createDraft('other-user');

    const res = await request(app)
      .delete(`/api/email/drafts/${draft._id}`)
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(404);
  });
});

// ==========================================
// EMAIL CONFIG
// ==========================================

describe('Email Config', () => {
  test('E9: GET /api/email/config returns null when no config', async () => {
    const res = await request(app)
      .get('/api/email/config')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.config).toBeNull();
  });

  test('E10: GET returns config with masked fields', async () => {
    await createConfig();

    const res = await request(app)
      .get('/api/email/config')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.config).toBeDefined();
    expect(res.body.config.email).toBe('test@gmail.com');
    expect(res.body.config.authMethod).toBe('app_password');
    expect(res.body.config.hasAppPassword).toBe(true);
    expect(res.body.config.appPassword).toBeUndefined();
  });

  test('E11: GET returns clientId and hasClientSecret for OAuth2', async () => {
    await createConfig('test-user-uid', {
      authMethod: 'oauth2',
      appPassword: null,
      refreshToken: 'refresh-token-123',
      clientId: 'client-id-123',
      clientSecret: 'client-secret-123',
    });

    const res = await request(app)
      .get('/api/email/config')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.config.clientId).toBe('client-id-123');
    expect(res.body.config.hasClientSecret).toBe(true);
    expect(res.body.config.hasRefreshToken).toBe(true);
    expect(res.body.config.clientSecret).toBeUndefined();
  });

  test('E12: PUT /api/email/config upserts config', async () => {
    const res = await request(app)
      .put('/api/email/config')
      .set('x-test-uid', 'test-user-uid')
      .send({
        email: 'new@gmail.com',
        authMethod: 'app_password',
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        appPassword: 'newpassword',
      });

    expect(res.status).toBe(200);
    expect(res.body.config.email).toBe('new@gmail.com');
    expect(res.body.config.hasAppPassword).toBe(true);
  });

  test('E13: PUT returns 400 when email is missing', async () => {
    const res = await request(app)
      .put('/api/email/config')
      .set('x-test-uid', 'test-user-uid')
      .send({ authMethod: 'app_password' });

    expect(res.status).toBe(400);
  });

  test('E14: PUT returns 400 when authMethod is missing', async () => {
    const res = await request(app)
      .put('/api/email/config')
      .set('x-test-uid', 'test-user-uid')
      .send({ email: 'test@gmail.com' });

    expect(res.status).toBe(400);
  });

  test('E15: DELETE /api/email/config removes config', async () => {
    await createConfig();

    const res = await request(app)
      .delete('/api/email/config')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('deleted');

    const stillExists = await EmailConfig.findOne({ ownerUid: 'test-user-uid' });
    expect(stillExists).toBeNull();
  });
});

// ==========================================
// EMAIL SEND (CAMPAIGN)
// ==========================================

describe('Email Campaign Send', () => {
  test('E16: POST /api/email/send sends campaign with variable substitution', async () => {
    const draft = await createDraft();
    await createConfig();

    const res = await request(app)
      .post('/api/email/send')
      .set('x-test-uid', 'test-user-uid')
      .send({
        draftId: draft._id.toString(),
        recipients: [
          { email: 'alice@test.com', name: 'Alice', variables: { name: 'Alice' } },
          { email: 'bob@test.com', name: 'Bob', variables: { name: 'Bob' } },
        ],
        campaignName: 'Test Campaign',
      });

    expect(res.status).toBe(200);
    expect(res.body.sentCount).toBe(2);
    expect(res.body.failedCount).toBe(0);
    expect(res.body.totalRecipients).toBe(2);
    expect(mockSendMail).toHaveBeenCalledTimes(2);

    // Verify variable substitution was called
    const firstCallArgs = mockSendMail.mock.calls[0][0];
    expect(firstCallArgs.subject).toBe('Test Subject');
    expect(firstCallArgs.html).toContain('Alice');
  });

  test('E17: POST /api/email/send returns 400 when draftId missing', async () => {
    const res = await request(app)
      .post('/api/email/send')
      .set('x-test-uid', 'test-user-uid')
      .send({ recipients: [{ email: 'a@b.com' }] });

    expect(res.status).toBe(400);
  });

  test('E18: POST /api/email/send returns 400 when recipients empty', async () => {
    const draft = await createDraft();

    const res = await request(app)
      .post('/api/email/send')
      .set('x-test-uid', 'test-user-uid')
      .send({ draftId: draft._id.toString(), recipients: [] });

    expect(res.status).toBe(400);
  });

  test('E19: POST /api/email/send returns 404 for nonexistent draft', async () => {
    const res = await request(app)
      .post('/api/email/send')
      .set('x-test-uid', 'test-user-uid')
      .send({ draftId: '507f1f77bcf86cd799439011', recipients: [{ email: 'a@b.com' }] });

    expect(res.status).toBe(404);
  });

  test('E20: POST /api/email/send returns 400 when no email config', async () => {
    const draft = await createDraft();

    const res = await request(app)
      .post('/api/email/send')
      .set('x-test-uid', 'test-user-uid')
      .send({ draftId: draft._id.toString(), recipients: [{ email: 'a@b.com' }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('email config');
  });

  test('E21: POST /api/email/send tracks failed sends', async () => {
    const draft = await createDraft();
    await createConfig();

    mockSendMail
      .mockResolvedValueOnce({ messageId: 'ok' })
      .mockRejectedValueOnce(new Error('SMTP error'));

    const res = await request(app)
      .post('/api/email/send')
      .set('x-test-uid', 'test-user-uid')
      .send({
        draftId: draft._id.toString(),
        recipients: [
          { email: 'good@test.com', variables: {} },
          { email: 'bad@test.com', variables: {} },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.sentCount).toBe(1);
    expect(res.body.failedCount).toBe(1);
  });

  test('E22: POST /api/email/send inserts into Supabase email_send_log', async () => {
    const draft = await createDraft();
    await createConfig();

    await request(app)
      .post('/api/email/send')
      .set('x-test-uid', 'test-user-uid')
      .send({
        draftId: draft._id.toString(),
        recipients: [{ email: 'a@b.com', variables: {} }],
      });

    expect(mockSupabase.from).toHaveBeenCalledWith('email_send_log');
  });
});

// ==========================================
// EMAIL SCHEDULING
// ==========================================

describe('Email Scheduling', () => {
  test('E23: POST /api/email/schedule schedules campaign', async () => {
    const draft = await createDraft();
    await createConfig();

    const futureDate = new Date(Date.now() + 3600000).toISOString();

    const res = await request(app)
      .post('/api/email/schedule')
      .set('x-test-uid', 'test-user-uid')
      .send({
        draftId: draft._id.toString(),
        recipients: [{ email: 'a@b.com', variables: {} }],
        scheduledAt: futureDate,
        campaignName: 'Scheduled Test',
      });

    expect(res.status).toBe(200);
    expect(res.body.campaignId).toBeDefined();
    expect(res.body.scheduledAt).toBe(futureDate);
    expect(mockScheduler.scheduleCampaign).toHaveBeenCalled();
  });

  test('E24: POST /api/email/schedule rejects past date', async () => {
    const draft = await createDraft();
    await createConfig();

    const pastDate = new Date(Date.now() - 3600000).toISOString();

    const res = await request(app)
      .post('/api/email/schedule')
      .set('x-test-uid', 'test-user-uid')
      .send({
        draftId: draft._id.toString(),
        recipients: [{ email: 'a@b.com', variables: {} }],
        scheduledAt: pastDate,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('future');
  });

  test('E25: POST /api/email/schedule rejects missing scheduledAt', async () => {
    const draft = await createDraft();
    await createConfig();

    const res = await request(app)
      .post('/api/email/schedule')
      .set('x-test-uid', 'test-user-uid')
      .send({
        draftId: draft._id.toString(),
        recipients: [{ email: 'a@b.com', variables: {} }],
      });

    expect(res.status).toBe(400);
  });

  test('E26: POST /api/email/schedule rejects missing draftId', async () => {
    const res = await request(app)
      .post('/api/email/schedule')
      .set('x-test-uid', 'test-user-uid')
      .send({ recipients: [{ email: 'a@b.com' }], scheduledAt: new Date().toISOString() });

    expect(res.status).toBe(400);
  });

  test('E27: GET /api/email/scheduled lists scheduled campaigns', async () => {
    const draft = await createDraft();
    await EmailCampaign.create({
      ownerUid: 'test-user-uid',
      name: 'Scheduled 1',
      draftId: draft._id,
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 3600000),
      recipients: [{ email: 'a@b.com', status: 'pending' }],
    });

    const res = await request(app)
      .get('/api/email/scheduled')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.campaigns).toHaveLength(1);
    expect(res.body.campaigns[0].name).toBe('Scheduled 1');
  });

  test('E28: DELETE /api/email/schedule/:campaignId cancels scheduled campaign', async () => {
    const draft = await createDraft();
    const campaign = await EmailCampaign.create({
      ownerUid: 'test-user-uid',
      name: 'To Cancel',
      draftId: draft._id,
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 3600000),
      recipients: [],
    });

    const res = await request(app)
      .delete(`/api/email/schedule/${campaign._id}`)
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('cancelled');
    expect(mockScheduler.cancelScheduledCampaign).toHaveBeenCalled();

    const updated = await EmailCampaign.findById(campaign._id);
    expect(updated.status).toBe('cancelled');
  });

  test('E29: DELETE /api/email/schedule/:campaignId returns 400 for non-scheduled campaign', async () => {
    const draft = await createDraft();
    const campaign = await EmailCampaign.create({
      ownerUid: 'test-user-uid',
      name: 'Already Sent',
      draftId: draft._id,
      status: 'sent',
      recipients: [],
    });

    const res = await request(app)
      .delete(`/api/email/schedule/${campaign._id}`)
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(400);
  });

  test('E30: DELETE /api/email/schedule/:campaignId returns 404 for other user campaign', async () => {
    const draft = await createDraft('other-user');
    const campaign = await EmailCampaign.create({
      ownerUid: 'other-user',
      name: 'Not Mine',
      draftId: draft._id,
      status: 'scheduled',
      recipients: [],
    });

    const res = await request(app)
      .delete(`/api/email/schedule/${campaign._id}`)
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(404);
  });
});

// ==========================================
// EMAIL SEND LOG & CAMPAIGNS
// ==========================================

describe('Email Send Log & Campaigns', () => {
  test('E31: GET /api/email/send-log returns send history', async () => {
    mockSupabaseQuery.data = [
      { id: 'log1', user_id: 'test-user-uid', campaign_id: 'c1', draft_title: 'Email 1', sender_email: 'test@gmail.com', recipient_count: 10, sent_count: 10, failed_count: 0, status: 'sent', sent_at: new Date().toISOString() },
    ];
    mockSupabaseQuery.error = null;

    const res = await request(app)
      .get('/api/email/send-log')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.sendLog).toHaveLength(1);
    expect(res.body.sendLog[0].draft_title).toBe('Email 1');
  });

  test('E32: GET /api/email/send-log/:campaignId returns specific entry', async () => {
    mockSupabaseQuery.data = {
      id: 'log1', user_id: 'test-user-uid', campaign_id: 'c1', draft_title: 'Email 1',
    };
    mockSupabaseQuery.error = null;

    const res = await request(app)
      .get('/api/email/send-log/c1')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.entry).toBeDefined();
    expect(res.body.entry.campaign_id).toBe('c1');
  });

  test('E33: GET /api/email/campaigns lists campaigns', async () => {
    const draft = await createDraft();
    await EmailCampaign.create({
      ownerUid: 'test-user-uid',
      name: 'Campaign 1',
      draftId: draft._id,
      status: 'sent',
      recipients: [{ email: 'a@b.com', status: 'sent' }],
      sentCount: 1,
    });

    const res = await request(app)
      .get('/api/email/campaigns')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.campaigns).toHaveLength(1);
    expect(res.body.campaigns[0].name).toBe('Campaign 1');
  });

  test('E34: GET /api/email/campaigns/:id returns campaign detail', async () => {
    const draft = await createDraft();
    const campaign = await EmailCampaign.create({
      ownerUid: 'test-user-uid',
      name: 'Campaign Detail',
      draftId: draft._id,
      status: 'sent',
      recipients: [{ email: 'a@b.com', status: 'sent', sentAt: new Date() }],
      sentCount: 1,
    });

    const res = await request(app)
      .get(`/api/email/campaigns/${campaign._id}`)
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.campaign).toBeDefined();
    expect(res.body.campaign.name).toBe('Campaign Detail');
  });

  test('E35: GET /api/email/campaigns/:id returns 404 for nonexistent', async () => {
    const res = await request(app)
      .get('/api/email/campaigns/507f1f77bcf86cd799439011')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(404);
  });
});

// ==========================================
// EMAIL TEST SEND
// ==========================================

describe('Email Test Send', () => {
  test('E36: POST /api/email/test sends test email', async () => {
    await createConfig();

    const res = await request(app)
      .post('/api/email/test')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('Test email sent');
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  test('E37: POST /api/email/test returns 400 when no config', async () => {
    const res = await request(app)
      .post('/api/email/test')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('No email config');
  });
});

// ==========================================
// DEPARTMENTS
// ==========================================

describe('Departments API', () => {
  test('E38: GET /api/user/departments returns departments', async () => {
    mockSupabaseQuery.data = { id: 'test-user-uid', email: 'test@leddger.ai', departments: ['Engineering', 'Sales'] };
    mockSupabaseQuery.error = null;

    const res = await request(app)
      .get('/api/user/departments')
      .set('x-test-uid', 'test-user-uid');

    expect(res.status).toBe(200);
    expect(res.body.departments).toEqual(['Engineering', 'Sales']);
  });

  test('E39: POST /api/user/departments saves departments', async () => {
    mockSupabaseQuery.data = { id: 'test-user-uid', departments: ['Engineering'] };
    mockSupabaseQuery.error = null;

    const res = await request(app)
      .post('/api/user/departments')
      .set('x-test-uid', 'test-user-uid')
      .send({ departments: ['Engineering'] });

    expect(res.status).toBe(200);
    expect(res.body.departments).toEqual(['Engineering']);
  });

  test('E40: POST /api/user/departments returns 400 for non-array', async () => {
    const res = await request(app)
      .post('/api/user/departments')
      .set('x-test-uid', 'test-user-uid')
      .send({ departments: 'not-an-array' });

    expect(res.status).toBe(400);
  });
});
