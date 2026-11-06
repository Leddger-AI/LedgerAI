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

jest.mock('../utils/emailCampaignFlow', () => ({ processCampaign: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../utils/formActivation', () => ({ activateScheduledForm: jest.fn().mockResolvedValue(null) }));

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
      data: { campaignId },
    });
  });

  test('SC3: scheduleDraftActivation calls agenda.schedule with draftId', async () => {
    const draftId = 'draft-789';
    const goesLiveAt = new Date(Date.now() + 3600000);

    await scheduler.scheduleDraftActivation(draftId, goesLiveAt);

    expect(mockAgendaInstance.schedule).toHaveBeenCalledWith(
      goesLiveAt,
      'activate form draft',
      { draftId, goesLiveAt: goesLiveAt.toISOString() }
    );
  });

  test('SC4: cancelDraftActivation calls agenda.cancel with correct filter', async () => {
    const draftId = 'draft-999';

    await scheduler.cancelDraftActivation(draftId);

    expect(mockAgendaInstance.cancel).toHaveBeenCalledWith({
      name: 'activate form draft',
      data: { draftId },
    });
  });

  test('SC5: stopAgenda calls agenda.stop', async () => {
    await scheduler.stopAgenda();

    expect(mockAgendaInstance.stop).toHaveBeenCalled();
  });

  test('SC6: agenda defines "send email campaign" job handler', async () => {
    expect(mockAgendaInstance.define).toHaveBeenCalledWith(
      'send email campaign',
      expect.any(Function),
      expect.objectContaining({ priority: 'high', concurrency: 1 })
    );
  });

  test('SC7: agenda defines "activate form draft" job handler', async () => {
    expect(mockAgendaInstance.define).toHaveBeenCalledWith(
      'activate form draft',
      expect.any(Function),
      expect.objectContaining({ priority: 'high', concurrency: 1 })
    );
  });

  test('SC7a: agenda defines "send analytics report" with a processor', () => {
    expect(mockAgendaInstance.define).toHaveBeenCalledWith(
      'send analytics report',
      expect.any(Function),
      expect.objectContaining({ priority: 'normal', concurrency: 1 })
    );
  });

  test('SC8: agenda starts after initialization', async () => {
    expect(mockAgendaInstance.start).toHaveBeenCalled();
  });

  test('SC9: campaign job delegates to the shared delivery flow', async () => {
    const { processCampaign } = require('../utils/emailCampaignFlow');
    const defineCall = mockAgendaInstance.define.mock.calls.find(call => call[0] === 'send email campaign');
    await defineCall[1]({ attrs: { data: { campaignId: 'campaign-1' } } });
    expect(processCampaign).toHaveBeenCalledWith('campaign-1');
  });

  test('form activation job passes its scheduled time to the conditional claim', async () => {
    const { activateScheduledForm } = require('../utils/formActivation');
    const defineCall = mockAgendaInstance.define.mock.calls.find(call => call[0] === 'activate form draft');
    await defineCall[1]({ attrs: { data: { draftId: 'draft-1', goesLiveAt: '2026-11-01T00:00:00.000Z' } } });
    expect(activateScheduledForm).toHaveBeenCalledWith('draft-1', '2026-11-01T00:00:00.000Z');
  });
});
