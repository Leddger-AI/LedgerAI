const fs = require('fs');
const path = require('path');

let _nodemailer = null;
let _OAuth2 = null;
let _otpTemplate = null;

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

const createTransporter = async () => {
  const OAuth2 = getOAuth2();
  const nodemailer = getNodemailer();

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

const sendFormSubmissionEmail = async (formTitle, submittedData) => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: process.env.GOOGLE_EMAIL,
      to: process.env.GOOGLE_EMAIL,
      subject: `New Form Submission: ${formTitle}`,
      html: buildSubmissionEmailHtml(formTitle, submittedData),
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Submission email sent!');
  } catch (err) {
    console.error('❌ Error sending email', err);
  }
};

function getOtpTemplate() {
  if (!_otpTemplate) {
    _otpTemplate = fs.readFileSync(path.join(__dirname, 'emailTemplates', 'otp.html'), 'utf8');
  }
  return _otpTemplate;
}

// Unlike sendFormSubmissionEmail (fire-and-forget), this throws on failure —
// the send-otp endpoint needs to know the send failed so it can report an
// error instead of claiming success for a code the user will never receive.
const sendOtpEmail = async (toEmail, otpCode, actionLabel) => {
  const transporter = await createTransporter();

  const html = getOtpTemplate()
    .replaceAll('{{OTP_CODE}}', otpCode)
    .replaceAll('{{ACTION_LABEL}}', actionLabel);

  await transporter.sendMail({
    from: process.env.GOOGLE_EMAIL,
    to: toEmail,
    subject: `Leddger-AI Security Verification — ${actionLabel}`,
    html,
  });
};

module.exports = {
  sendFormSubmissionEmail,
  buildSubmissionEmailHtml,
  sendOtpEmail,
};
