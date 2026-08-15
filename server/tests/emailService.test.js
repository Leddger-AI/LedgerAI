/**
 * emailService.js Tests — issue #19 regression coverage.
 *
 * createTransporter() used to accept an `emailConfig` and, if truthy,
 * build a transporter from its (potentially encrypted, for EmailAccount
 * documents) credentials directly — with no decrypt() step. That branch
 * had no live caller (form submission is the only caller, and it always
 * passed null) and has been removed rather than fixed: createTransporter()
 * now always authenticates from env vars, the only path anything uses.
 *
 * This is the first real (unmocked) coverage of this module — everywhere
 * else jest.mock()s it away entirely, which is how #18/#19 shipped
 * unnoticed.
 */

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

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
const mockCreateTransport = jest.fn(() => ({ sendMail: (...args) => mockSendMail(...args) }));
jest.mock('nodemailer', () => ({
  createTransport: (...args) => mockCreateTransport(...args),
}));

const { sendFormSubmissionEmail, buildSubmissionEmailHtml } = require('../utils/emailService');

describe('emailService (issue #19 regression)', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccessToken.mockImplementation((cb) => cb(null, 'mock-access-token'));
    mockSendMail.mockResolvedValue({ messageId: 'test' });
    process.env = {
      ...ORIGINAL_ENV,
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'client-secret',
      GOOGLE_REFRESH_TOKEN: 'refresh-token',
      GOOGLE_EMAIL: 'platform@leddger.ai',
    };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  describe('sendFormSubmissionEmail', () => {
    test('ES1: builds the transporter from env vars only — no encrypted-credential path exists anymore', async () => {
      await sendFormSubmissionEmail('Test Form', { name: 'Jane' });

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: expect.objectContaining({
            user: 'platform@leddger.ai',
            clientId: 'client-id',
            clientSecret: 'client-secret',
            refreshToken: 'refresh-token',
            accessToken: 'mock-access-token',
          }),
        })
      );
    });

    test('ES2: sends mail from and to the platform GOOGLE_EMAIL address', async () => {
      await sendFormSubmissionEmail('Test Form', { name: 'Jane' });

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'platform@leddger.ai',
          to: 'platform@leddger.ai',
          subject: 'New Form Submission: Test Form',
        })
      );
    });

    test('ES3: ignores legacy extra arguments (recruiterEmail/emailConfig no longer exist)', async () => {
      const legacyEmailConfigShape = {
        email: 'someone-else@example.com',
        authMethod: 'app_password',
        appPassword: { encrypted: 'x', iv: 'y', tag: 'z' },
      };

      await sendFormSubmissionEmail('Test Form', { name: 'Jane' }, 'ignored@example.com', legacyEmailConfigShape);

      // Still authenticates from env vars — the (now-removed) encrypted
      // credential object passed here is never touched, so it can't break
      // SMTP/OAuth2 auth the way #19 described.
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: 'platform@leddger.ai', to: 'platform@leddger.ai' })
      );
    });

    test('ES4: swallows transporter errors instead of throwing (fire-and-forget safety)', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP down'));

      await expect(sendFormSubmissionEmail('Test Form', { name: 'Jane' })).resolves.toBeUndefined();
    });
  });

  describe('buildSubmissionEmailHtml', () => {
    test('ES5: includes the form title and each submitted field', () => {
      const html = buildSubmissionEmailHtml('My Form', { name: 'Jane', role: 'Engineer' });

      expect(html).toContain('My Form');
      expect(html).toContain('<strong>name:</strong> Jane');
      expect(html).toContain('<strong>role:</strong> Engineer');
    });
  });
});
