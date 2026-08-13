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
jest.mock('../models/EmailConfig', () => ({
  findOne: jest.fn(),
}));

// Mock supabase
jest.mock('../supabaseClient', () => ({
  from: jest.fn(() => ({
    insert: jest.fn().mockResolvedValue({ error: null }),
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
});
