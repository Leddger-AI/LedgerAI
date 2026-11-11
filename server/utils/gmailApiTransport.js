// Gmail's HTTPS API works where outbound SMTP ports are unavailable.
// Nodemailer still builds the MIME message, including attachments and headers.
function createGmailApiTransport(oauth2Client) {
  const { google } = require('googleapis');
  const nodemailer = require('nodemailer');
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const mime = nodemailer.createTransport({ streamTransport: true, buffer: true });

  return {
    async sendMail(options) {
      const compiled = await mime.sendMail(options);
      try {
        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: { raw: compiled.message.toString('base64url') },
        });
        return { messageId: response.data.id, accepted: [options.to] };
      } catch (error) {
        // A lost response or server error could follow acceptance by Gmail.
        // The campaign worker must leave this recipient for manual review.
        const status = Number(error.response?.status || error.code);
        if (!status || status === 429 || status >= 500) error.code = 'EDELIVERYUNKNOWN';
        throw error;
      }
    },
  };
}

module.exports = { createGmailApiTransport };
