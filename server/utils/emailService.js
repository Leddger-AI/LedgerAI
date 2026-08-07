const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
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

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAuth2",
      user: process.env.GOOGLE_EMAIL, // Should be added to .env
      accessToken,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN
    }
  });

  return transporter;
};

const sendFormSubmissionEmail = async (formTitle, submittedData, recruiterEmail) => {
  try {
    const transporter = await createTransporter();

    const dataString = Object.entries(submittedData)
      .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
      .join('<br>');

    const mailOptions = {
      from: process.env.GOOGLE_EMAIL,
      to: recruiterEmail || process.env.GOOGLE_EMAIL, // Send to recruiter, fallback to self
      subject: `New Form Submission: ${formTitle}`,
      html: `
        <h2>New Submission for ${formTitle}</h2>
        <p>A user has just completed your form draft.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          ${dataString}
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Submission email sent!');
  } catch (err) {
    console.error('❌ Error sending email', err);
  }
};

module.exports = {
  sendFormSubmissionEmail
};
