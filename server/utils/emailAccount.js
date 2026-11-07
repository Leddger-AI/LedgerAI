const { decrypt } = require('./crypto');

async function buildTransporterFromAccount(account) {
  if (account.authMethod === 'oauth2') {
    const { google } = require('googleapis');
    const OAuth2 = google.auth.OAuth2;
    const oauth2Client = new OAuth2(
      account.clientId,
      decrypt(account.clientSecret),
      'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({ refresh_token: decrypt(account.refreshToken) });
    if (process.env.EMAIL_TRANSPORT === 'gmail_api') {
      return require('./gmailApiTransport').createGmailApiTransport(oauth2Client);
    }
    const accessToken = await new Promise((resolve, reject) => {
      oauth2Client.getAccessToken((err, token) => {
        if (err) reject(err);
        resolve(token);
      });
    });
    return require('nodemailer').createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: account.email,
        accessToken,
        clientId: account.clientId,
        clientSecret: decrypt(account.clientSecret),
        refreshToken: decrypt(account.refreshToken),
      },
    });
  } else {
    if (process.env.EMAIL_TRANSPORT === 'gmail_api') {
      throw new Error('This server requires a Gmail OAuth2 sender; app-password SMTP is unavailable');
    }
    return require('nodemailer').createTransport({
      host: account.smtpHost,
      port: account.smtpPort,
      secure: account.smtpPort === 465,
      auth: {
        user: account.email,
        pass: decrypt(account.appPassword),
      },
    });
  }
}

async function resolveEmailAccount(EmailAccount, ownerUid, accountId) {
  if (accountId) {
    return EmailAccount.findOne({ _id: accountId, ownerUid });
  }
  return await EmailAccount.findOne({ ownerUid, isDefault: true })
    || await EmailAccount.findOne({ ownerUid }).sort({ createdAt: 1 });
}

module.exports = { buildTransporterFromAccount, resolveEmailAccount };
