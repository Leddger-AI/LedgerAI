/**
 * OTP Verification Tests — issue #22: OTP required before destructive
 * account actions (Delete Data / Delete Account) can proceed.
 *
 * OTP challenges are stored in Supabase (otp_challenges table), not
 * MongoDB. There's no in-memory Supabase test server equivalent to
 * mongodb-memory-server, so this file backs the mocked `../supabaseClient`
 * module with a small stateful fake specifically for the otp_challenges
 * table (filter-aware select/upsert/update/delete against a plain array) —
 * every other table still goes through the existing generic mock. This
 * keeps the OTP generation/hashing/rate-limit/lockout logic itself
 * UNMOCKED and really exercised, not mocked into invisibility, which is
 * how every prior bug in this codebase's email-account family (#17, #18,
 * #19) shipped unnoticed.
 *
 * MongoDB Memory Server is still used because the delete endpoints also
 * touch several real Mongoose models (EmailAccount, EmailDraft, etc.).
 */
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');

const mockSupabaseQuery = { data: null, error: null, count: null };

function createChain() {
  return {
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
}

// --- Fake otp_challenges table ---
let otpRows = [];
let otpRowSeq = 1;

function otpChallengesChain() {
  const filters = {};
  const chain = {
    select: () => chain,
    eq: (col, val) => {
      filters[col] = val;
      return chain;
    },
    maybeSingle: async () => ({
      data: otpRows.find((r) => Object.entries(filters).every(([k, v]) => r[k] === v)) || null,
      error: null,
    }),
    upsert: async (payload) => {
      const idx = otpRows.findIndex((r) => r.user_id === payload.user_id && r.action === payload.action);
      if (idx >= 0) {
        otpRows[idx] = { ...otpRows[idx], ...payload };
      } else {
        otpRows.push({ id: `otp-${otpRowSeq++}`, ...payload });
      }
      return { data: null, error: null };
    },
    update: (payload) => ({
      eq: async (col, val) => {
        const idx = otpRows.findIndex((r) => r[col] === val);
        if (idx >= 0) otpRows[idx] = { ...otpRows[idx], ...payload };
        return { data: null, error: null };
      },
    }),
    delete: () => ({
      eq: async (col, val) => {
        otpRows = otpRows.filter((r) => r[col] !== val);
        return { data: null, error: null };
      },
    }),
  };
  return chain;
}

const mockDeleteUser = jest.fn().mockResolvedValue({ error: null });
const mockSupabase = {
  from: jest.fn((table) => (table === 'otp_challenges' ? otpChallengesChain() : createChain())),
  auth: { admin: { deleteUser: (...args) => mockDeleteUser(...args) } },
};

jest.mock('../supabaseClient', () => mockSupabase);

jest.mock('../middleware/auth', () =>
  jest.fn((req, res, next) => {
    req.user = {
      uid: req.headers['x-test-uid'] || 'test-user-uid',
      email: req.headers['x-test-email'] || 'test@leddger.ai',
    };
    next();
  })
);

jest.mock('../scheduler', () => ({
  scheduleCampaign: jest.fn(() => Promise.resolve()),
  cancelScheduledCampaign: jest.fn(() => Promise.resolve()),
  stopAgenda: jest.fn(() => Promise.resolve()),
  scheduleDraftActivation: jest.fn(() => Promise.resolve()),
  cancelDraftActivation: jest.fn(() => Promise.resolve()),
}));

jest.mock('../startupCheck', () => ({
  runStartupChecks: jest.fn(() => Promise.resolve([])),
}));

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: (...args) => mockSendMail(...args),
  })),
}));

const mockGetAccessToken = jest.fn((cb) => cb(null, 'mock-access-token'));
jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn(() => ({
        setCredentials: jest.fn(),
        getAccessToken: (...args) => mockGetAccessToken(...args),
      })),
    },
  },
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  app = require('../index.js');
  await new Promise((resolve) => setTimeout(resolve, 500));
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
  otpRows = [];
  jest.clearAllMocks();
  mockSendMail.mockResolvedValue({ messageId: 'test' });
  mockGetAccessToken.mockImplementation((cb) => cb(null, 'mock-access-token'));
  mockDeleteUser.mockResolvedValue({ error: null });
  mockSupabaseQuery.data = null;
  mockSupabaseQuery.error = null;
  mockSupabaseQuery.count = null;
});

const { hmacHash } = require('../utils/crypto');
const { createOtpChallenge, verifyOtpChallenge } = require('../utils/otp');

const TEST_UID = 'test-user-uid';
const TEST_EMAIL = 'test@leddger.ai';

const authedRequest = (method, url) =>
  request(app)[method](url).set('x-test-uid', TEST_UID).set('x-test-email', TEST_EMAIL);

function seedOtpChallenge({ ownerUid = TEST_UID, action, otp, expiresAt, attempts = 0, lockedUntil = null }) {
  otpRows.push({
    id: `otp-${otpRowSeq++}`,
    user_id: ownerUid,
    action,
    otp_hash: hmacHash(otp),
    attempts,
    locked_until: lockedUntil,
    last_sent_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  });
}

function findOtpRow(ownerUid, action) {
  return otpRows.find((r) => r.user_id === ownerUid && r.action === action) || null;
}

describe('POST /api/user/send-otp', () => {
  test('OTP1: sends an OTP and returns 200', async () => {
    const res = await authedRequest('post', '/api/user/send-otp').send({ action: 'delete_data' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: TEST_EMAIL, subject: expect.stringContaining('Delete All Data') })
    );

    const record = findOtpRow(TEST_UID, 'delete_data');
    expect(record).not.toBeNull();
    expect(record.attempts).toBe(0);
  });

  test('OTP2: rejects an invalid action', async () => {
    const res = await authedRequest('post', '/api/user/send-otp').send({ action: 'not_a_real_action' });

    expect(res.status).toBe(400);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  test('OTP3: never returns the OTP itself in the response body', async () => {
    const res = await authedRequest('post', '/api/user/send-otp').send({ action: 'delete_data' });

    expect(JSON.stringify(res.body)).not.toMatch(/\b\d{6}\b/);
  });

  test('OTP4: rate limits a second send within 60 seconds (429)', async () => {
    await authedRequest('post', '/api/user/send-otp').send({ action: 'delete_data' });
    const res = await authedRequest('post', '/api/user/send-otp').send({ action: 'delete_data' });

    expect(res.status).toBe(429);
    expect(res.body.retryAfterSeconds).toBeGreaterThan(0);
    expect(mockSendMail).toHaveBeenCalledTimes(1);
  });

  test('OTP5: delete_data and delete_account OTPs are independent (no cross-action rate limit)', async () => {
    await authedRequest('post', '/api/user/send-otp').send({ action: 'delete_data' });
    const res = await authedRequest('post', '/api/user/send-otp').send({ action: 'delete_account' });

    expect(res.status).toBe(200);
    expect(mockSendMail).toHaveBeenCalledTimes(2);
  });
});

describe('DELETE /api/user/data — OTP gate', () => {
  test('OTP6: rejects with 400 when no OTP is provided', async () => {
    const res = await authedRequest('delete', '/api/user/data').send({ confirmEmail: TEST_EMAIL });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid or expired OTP/);
  });

  test('OTP7: rejects with 400 for a wrong OTP and records the failed attempt', async () => {
    seedOtpChallenge({ action: 'delete_data', otp: '123456', expiresAt: new Date(Date.now() + 5 * 60 * 1000) });

    const res = await authedRequest('delete', '/api/user/data').send({ confirmEmail: TEST_EMAIL, otp: '000000' });

    expect(res.status).toBe(400);
    expect(findOtpRow(TEST_UID, 'delete_data').attempts).toBe(1);
  });

  test('OTP8: succeeds with the correct OTP and consumes it (single-use)', async () => {
    seedOtpChallenge({ action: 'delete_data', otp: '654321', expiresAt: new Date(Date.now() + 5 * 60 * 1000) });

    const res = await authedRequest('delete', '/api/user/data').send({ confirmEmail: TEST_EMAIL, otp: '654321' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(findOtpRow(TEST_UID, 'delete_data')).toBeNull();
    // issue #41: the dead server/models/User.js deleteMany({firebaseUid})
    // call is gone — no 'User (...)' entry should show up in the response.
    expect(res.body.deleted.mongodb.some((entry) => entry.startsWith('User ('))).toBe(false);

    // Replay attempt with the same (now-consumed) OTP must fail
    const replay = await authedRequest('delete', '/api/user/data').send({ confirmEmail: TEST_EMAIL, otp: '654321' });
    expect(replay.status).toBe(400);
  });

  test('OTP9: rejects an expired OTP', async () => {
    seedOtpChallenge({ action: 'delete_data', otp: '111111', expiresAt: new Date(Date.now() - 1000) });

    const res = await authedRequest('delete', '/api/user/data').send({ confirmEmail: TEST_EMAIL, otp: '111111' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid or expired OTP/);
  });

  test('OTP10: locks out after 5 wrong attempts, blocking even the correct code afterward', async () => {
    seedOtpChallenge({ action: 'delete_data', otp: '222222', expiresAt: new Date(Date.now() + 5 * 60 * 1000) });

    const statuses = [];
    for (let i = 0; i < 5; i++) {
      const attempt = await authedRequest('delete', '/api/user/data').send({ confirmEmail: TEST_EMAIL, otp: '999999' });
      statuses.push(attempt.status);
    }
    expect(statuses.slice(0, 4)).toEqual([400, 400, 400, 400]);
    expect(statuses[4]).toBe(429);

    // Even the correct OTP is now rejected while locked out
    const res = await authedRequest('delete', '/api/user/data').send({ confirmEmail: TEST_EMAIL, otp: '222222' });
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/Too many failed/);
  });

  test('OTP11: email confirmation is still checked before OTP (existing behavior preserved)', async () => {
    const res = await authedRequest('delete', '/api/user/data').send({ confirmEmail: 'wrong@example.com', otp: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Email confirmation/);
  });
});

describe('DELETE /api/user/account — OTP gate', () => {
  test('OTP12: rejects with 400 when no OTP is provided', async () => {
    const res = await authedRequest('delete', '/api/user/account').send({ confirmEmail: TEST_EMAIL });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid or expired OTP/);
  });

  test('OTP13: succeeds with the correct OTP for the delete_account action', async () => {
    seedOtpChallenge({ action: 'delete_account', otp: '777777', expiresAt: new Date(Date.now() + 5 * 60 * 1000) });

    const res = await authedRequest('delete', '/api/user/account').send({ confirmEmail: TEST_EMAIL, otp: '777777' });

    expect(res.status).toBe(200);
    expect(res.body.accountDeleted).toBe(true);
    // issue #41: same dead User.deleteMany call removed from this endpoint too
    expect(res.body.deleted.mongodb.some((entry) => entry.startsWith('User ('))).toBe(false);
  });

  test('OTP14: a delete_data OTP cannot authorize delete_account (actions are isolated)', async () => {
    seedOtpChallenge({ action: 'delete_data', otp: '888888', expiresAt: new Date(Date.now() + 5 * 60 * 1000) });

    const res = await authedRequest('delete', '/api/user/account').send({ confirmEmail: TEST_EMAIL, otp: '888888' });

    expect(res.status).toBe(400);
  });
});

describe('utils/otp.js (unit)', () => {
  test('OTP15: resending while locked out returns locked, not rateLimited', async () => {
    await createOtpChallenge(TEST_UID, 'delete_data');
    for (let i = 0; i < 5; i++) {
      await verifyOtpChallenge(TEST_UID, 'delete_data', 'wrong-code');
    }

    const resendResult = await createOtpChallenge(TEST_UID, 'delete_data');

    expect(resendResult.locked).toBe(true);
    expect(resendResult.retryAfterMs).toBeGreaterThan(0);
  });
});
