let _nodemailer = null;
let _OAuth2 = null;

function getOAuth2() {
  if (!_OAuth2) {
    const { google } = require('googleapis');
    _OAuth2 = google.auth.OAuth2;
  }
  return _OAuth2;
}

function getNodemailer() {
  if (!_nodemailer) _nodemailer = require('nodemailer');
  return _nodemailer;
}

const createTransporter = async (emailConfig = null) => {
  const OAuth2 = getOAuth2();
  const nodemailer = getNodemailer();
  if (emailConfig) {
    if (emailConfig.authMethod === 'oauth2') {
      const oauth2Client = new OAuth2(
        emailConfig.clientId,
        emailConfig.clientSecret,
        "https://developers.google.com/oauthplayground"
      );

      oauth2Client.setCredentials({
        refresh_token: emailConfig.refreshToken
      });

      const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
          if (err) {
            console.error('Failed to create access token', err);
            reject("Failed to create access token: " + err);
          }
          resolve(token);
        });
      });

      return nodemailer.createTransport({
        service: "gmail",
        auth: {
          type: "OAuth2",
          user: emailConfig.email,
          accessToken,
          clientId: emailConfig.clientId,
          clientSecret: emailConfig.clientSecret,
          refreshToken: emailConfig.refreshToken
        }
      });
    } else {
      return nodemailer.createTransport({
        host: emailConfig.smtpHost,
        port: emailConfig.smtpPort,
        secure: emailConfig.smtpPort === 465,
        auth: {
          user: emailConfig.email,
          pass: emailConfig.appPassword,
        },
      });
    }
  }

  // Fallback to env vars
  const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const accessToken = await new Promise((resolve, reject) => {
    oauth2Client.getAccessToken((err, token) => {
      if (err) {
        console.error('Failed to create access token', err);
        reject("Failed to create access token: " + err);
      }
      resolve(token);
    });
  });

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GOOGLE_EMAIL,
      accessToken,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN
    }
  });
};

const buildSubmissionEmailHtml = (formTitle, submittedData) => {
  const dataString = Object.entries(submittedData)
    .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
    .join('<br>');

  return `
    <h2>New Submission for ${formTitle}</h2>
    <p>A user has just completed your form draft.</p>
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
      ${dataString}
    </div>
  `;
};

const sendFormSubmissionEmail = async (formTitle, submittedData, recruiterEmail = null, emailConfig = null) => {
  try {
    const transporter = await createTransporter(emailConfig);

    const fromEmail = emailConfig?.email || process.env.GOOGLE_EMAIL;
    const toEmail = recruiterEmail || emailConfig?.email || process.env.GOOGLE_EMAIL;

    const mailOptions = {
      from: fromEmail,
      to: toEmail,
      subject: `New Form Submission: ${formTitle}`,
      html: buildSubmissionEmailHtml(formTitle, submittedData),
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Submission email sent!');
  } catch (err) {
    console.error('❌ Error sending email', err);
  }
};

module.exports = {
  sendFormSubmissionEmail,
  buildSubmissionEmailHtml,
};
