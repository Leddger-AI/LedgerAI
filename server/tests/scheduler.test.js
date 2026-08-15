/**
 * Scheduler Tests — Tests scheduling functions
 * scheduler.js uses require() for agenda, so standard jest.mock works
 */

const mockAgendaInstance = {
  define: jest.fn(),
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  schedule: jest.fn().mockResolvedValue(undefined),
  cancel: jest.fn().mockResolvedValue(undefined),
};

jest.mock('agenda', () => ({
  Agenda: jest.fn(() => mockAgendaInstance),
}));

jest.mock('@agendajs/mongo-backend', () => ({
  MongoBackend: jest.fn(() => ({})),
}));

// Mock models used inside job handlers
jest.mock('../models/EmailCampaign', () => ({
  findById: jest.fn(),
}));
jest.mock('../models/EmailDraft', () => ({
  findById: jest.fn(),
}));
jest.mock('../models/EmailAccount', () => ({
  findOne: jest.fn(),
}));

// Mock supabase
const mockSupabaseInsert = jest.fn().mockResolvedValue({ error: null });
jest.mock('../supabaseClient', () => ({
  from: jest.fn(() => ({
    insert: (...args) => mockSupabaseInsert(...args),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null }),
  })),
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }),
  })),
}));

// Mock googleapis
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn(() => ({
        setCredentials: jest.fn(),
        getAccessToken: jest.fn((cb) => cb(null, 'mock-token')),
      })),
    },
  },
}));

// Mock the shared email-account helpers used by both index.js and scheduler.js
const mockBuildTransporterFromAccount = jest.fn();
const mockResolveEmailAccount = jest.fn();
jest.mock('../utils/emailAccount', () => ({
  buildTransporterFromAccount: (...args) => mockBuildTransporterFromAccount(...args),
  resolveEmailAccount: (...args) => mockResolveEmailAccount(...args),
}));

describe('Scheduler', () => {
  let scheduler;

  beforeAll(async () => {
    scheduler = require('../scheduler');
    // Trigger getAgenda() initialization so define/start are called
    await scheduler.scheduleCampaign('init', new Date(Date.now() + 3600000));
  });

  beforeEach(() => {
    // Only clear schedule/cancel/stop calls, preserve define/start from init
    mockAgendaInstance.schedule.mockClear();
    mockAgendaInstance.cancel.mockClear();
    mockAgendaInstance.stop.mockClear();
  });

  test('SC1: scheduleCampaign calls agenda.schedule with campaignId and date', async () => {
    const campaignId = 'campaign-123';
    const sendAt = new Date(Date.now() + 3600000);

    await scheduler.scheduleCampaign(campaignId, sendAt);

    expect(mockAgendaInstance.schedule).toHaveBeenCalledWith(
      sendAt,
      'send email campaign',
      { campaignId }
    );
  });

  test('SC2: cancelScheduledCampaign calls agenda.cancel with correct filter', async () => {
    const campaignId = 'campaign-456';

    await scheduler.cancelScheduledCampaign(campaignId);

    expect(mockAgendaInstance.cancel).toHaveBeenCalledWith({
      name: 'send email campaign',
      'data.campaignId': campaignId,
    });
  });

  test('SC3: scheduleDraftActivation calls agenda.schedule with draftId', async () => {
    const draftId = 'draft-789';
    const goesLiveAt = new Date(Date.now() + 3600000);

    await scheduler.scheduleDraftActivation(draftId, goesLiveAt);

    expect(mockAgendaInstance.schedule).toHaveBeenCalledWith(
      goesLiveAt,
      'activate form draft',
      { draftId }
    );
  });

  test('SC4: cancelDraftActivation calls agenda.cancel with correct filter', async () => {
    const draftId = 'draft-999';

    await scheduler.cancelDraftActivation(draftId);

    expect(mockAgendaInstance.cancel).toHaveBeenCalledWith({
      name: 'activate form draft',
      'data.draftId': draftId,
    });
  });

  test('SC5: stopAgenda calls agenda.stop', async () => {
    await scheduler.stopAgenda();

    expect(mockAgendaInstance.stop).toHaveBeenCalled();
  });

  test('SC6: agenda defines "send email campaign" job handler', async () => {
    expect(mockAgendaInstance.define).toHaveBeenCalledWith(
      'send email campaign',
      expect.objectContaining({ priority: 'high', concurrency: 1 }),
      expect.any(Function)
    );
  });

  test('SC7: agenda defines "activate form draft" job handler', async () => {
    expect(mockAgendaInstance.define).toHaveBeenCalledWith(
      'activate form draft',
      expect.objectContaining({ priority: 'high', concurrency: 1 }),
      expect.any(Function)
    );
  });

  test('SC8: agenda starts after initialization', async () => {
    expect(mockAgendaInstance.start).toHaveBeenCalled();
  });

  describe('"send email campaign" job handler (issue #17 regression)', () => {
    let EmailCampaign, EmailDraft, EmailAccount;
    let runJob;
    let mockTransporter;

    beforeAll(() => {
      EmailCampaign = require('../models/EmailCampaign');
      EmailDraft = require('../models/EmailDraft');
      EmailAccount = require('../models/EmailAccount');

      const defineCall = mockAgendaInstance.define.mock.calls.find(
        (call) => call[0] === 'send email campaign'
      );
      const handler = defineCall[2];
      runJob = (campaignId) => handler({ attrs: { data: { campaignId } } });
    });

    const baseCampaign = (overrides = {}) => ({
      _id: { toString: () => 'campaign-1' },
      ownerUid: 'user-1',
      draftId: { toString: () => 'draft-1' },
      accountId: null,
      status: 'scheduled',
      recipients: [{ email: 'a@example.com', variables: {}, status: 'pending' }],
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    });

    const baseDraft = { subject: 'Hi', bodyHtml: '<p>Hi</p>' };

    beforeEach(() => {
      jest.clearAllMocks();
      mockTransporter = { sendMail: jest.fn().mockResolvedValue({ messageId: 'test' }) };
      mockBuildTransporterFromAccount.mockResolvedValue(mockTransporter);
      EmailDraft.findById.mockResolvedValue(baseDraft);
    });

    test('does not reference the deprecated EmailConfig model', () => {
      const source = require('fs').readFileSync(require.resolve('../scheduler'), 'utf8');
      expect(source).not.toMatch(/EmailConfig/);
    });

    test('uses EmailAccount directly by campaign.accountId when set, bypassing default/earliest resolution', async () => {
      const account = { _id: 'acct-1', email: 'chosen@example.com', authMethod: 'app_password' };
      const campaign = baseCampaign({ accountId: 'acct-1' });
      EmailCampaign.findById.mockResolvedValue(campaign);
      EmailAccount.findOne.mockResolvedValue(account);

      await runJob('campaign-1');

      expect(EmailAccount.findOne).toHaveBeenCalledWith({ _id: 'acct-1', ownerUid: 'user-1' });
      expect(mockResolveEmailAccount).not.toHaveBeenCalled();
      expect(mockBuildTransporterFromAccount).toHaveBeenCalledWith(account);
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'chosen@example.com', to: 'a@example.com' })
      );
      expect(campaign.status).toBe('sent');
      expect(campaign.save).toHaveBeenCalled();
      expect(mockSupabaseInsert).toHaveBeenCalledWith(
        expect.objectContaining({ sender_email: 'chosen@example.com', status: 'sent' })
      );
    });

    test('falls back to resolveEmailAccount (default/earliest EmailAccount) when campaign.accountId is absent', async () => {
      const account = { _id: 'acct-2', email: 'default@example.com', authMethod: 'oauth2' };
      const campaign = baseCampaign({ accountId: null });
      EmailCampaign.findById.mockResolvedValue(campaign);
      mockResolveEmailAccount.mockResolvedValue(account);

      await runJob('campaign-1');

      expect(mockResolveEmailAccount).toHaveBeenCalledWith(EmailAccount, 'user-1', null);
      expect(EmailAccount.findOne).not.toHaveBeenCalled();
      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'default@example.com' })
      );
      expect(campaign.status).toBe('sent');
    });

    test('marks campaign failed (not a crash) when the user has no EmailAccount at all', async () => {
      const campaign = baseCampaign({ accountId: null });
      EmailCampaign.findById.mockResolvedValue(campaign);
      mockResolveEmailAccount.mockResolvedValue(null);

      await runJob('campaign-1');

      expect(campaign.status).toBe('failed');
      expect(campaign.save).toHaveBeenCalled();
      expect(mockBuildTransporterFromAccount).not.toHaveBeenCalled();
      expect(mockSupabaseInsert).not.toHaveBeenCalled();
    });
  });
});
