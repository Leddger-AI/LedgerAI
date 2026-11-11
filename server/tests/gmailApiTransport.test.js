const mockGmailSend = jest.fn();
const mockMimeSend = jest.fn();

jest.mock('googleapis', () => ({
  google: { gmail: jest.fn(() => ({ users: { messages: { send: (...args) => mockGmailSend(...args) } } })) },
}));
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: (...args) => mockMimeSend(...args) })),
}));

const { google } = require('googleapis');
const nodemailer = require('nodemailer');
const { createGmailApiTransport } = require('../utils/gmailApiTransport');

describe('Gmail HTTPS transport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMimeSend.mockResolvedValue({ message: Buffer.from('To: recipient@example.com\r\n\r\nHello') });
    mockGmailSend.mockResolvedValue({ data: { id: 'gmail-message-id' } });
  });

  test('sends a compiled MIME message through Gmail with the account OAuth client', async () => {
    const auth = { token: 'test' };
    const mail = { from: 'owner@example.com', to: 'recipient@example.com', subject: 'Subject',
      html: '<p>Hello</p>', headers: { 'List-Unsubscribe': '<https://example.com/unsubscribe>' } };
    const result = await createGmailApiTransport(auth).sendMail(mail);
    expect(google.gmail).toHaveBeenCalledWith({ version: 'v1', auth });
    expect(nodemailer.createTransport).toHaveBeenCalledWith({ streamTransport: true, buffer: true });
    expect(mockMimeSend).toHaveBeenCalledWith(mail);
    const request = mockGmailSend.mock.calls[0][0];
    expect(request.userId).toBe('me');
    expect(Buffer.from(request.requestBody.raw, 'base64url').toString()).toContain('recipient@example.com');
    expect(result.messageId).toBe('gmail-message-id');
  });

  test('marks an uncertain Gmail response for manual review', async () => {
    const error = Object.assign(new Error('Gmail unavailable'), { response: { status: 503 } });
    mockGmailSend.mockRejectedValue(error);
    await expect(createGmailApiTransport({}).sendMail({ to: 'recipient@example.com' }))
      .rejects.toMatchObject({ code: 'EDELIVERYUNKNOWN' });
  });

  test('keeps definitive authorization rejection as a failed delivery', async () => {
    const error = Object.assign(new Error('Forbidden'), { response: { status: 403 } });
    mockGmailSend.mockRejectedValue(error);
    await expect(createGmailApiTransport({}).sendMail({ to: 'recipient@example.com' }))
      .rejects.toMatchObject({ response: { status: 403 } });
    expect(error.code).not.toBe('EDELIVERYUNKNOWN');
  });
});
