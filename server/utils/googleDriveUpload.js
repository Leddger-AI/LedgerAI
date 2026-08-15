const { Readable } = require('stream');
const { getValidAccessToken } = require('./googleDriveOAuth');

function getDriveClient(accessToken) {
  const { google } = require('googleapis');
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

async function uploadToDrive(ownerUid, content, filename, mimeType, convertToSheet = false) {
  const accessToken = await getValidAccessToken(ownerUid);
  if (!accessToken) throw new Error('Google Drive not connected. Please connect your account in Settings.');

  const drive = getDriveClient(accessToken);

  const requestBody = {
    name: convertToSheet ? filename.replace(/\.(csv|json)$/, '') : filename,
    ...(convertToSheet && { mimeType: 'application/vnd.google-apps.spreadsheet' }),
  };

  const media = {
    mimeType: mimeType || 'text/csv',
    body: Readable.from([content]),
  };

  const file = await drive.files.create({
    requestBody,
    media,
    fields: 'id,webViewLink,name',
  });

  return {
    id: file.data.id,
    name: file.data.name,
    webViewLink: file.data.webViewLink,
  };
}

async function uploadCSVToDrive(ownerUid, csvContent, filename, convertToSheet = true) {
  return uploadToDrive(ownerUid, csvContent, filename, 'text/csv', convertToSheet);
}

async function uploadJSONToDrive(ownerUid, jsonContent, filename) {
  return uploadToDrive(ownerUid, jsonContent, filename, 'application/json', false);
}

module.exports = {
  uploadCSVToDrive,
  uploadJSONToDrive,
};
