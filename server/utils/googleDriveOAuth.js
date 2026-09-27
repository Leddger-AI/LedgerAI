const GoogleDriveToken = require('../models/GoogleDriveToken');
const { encrypt, decrypt } = require('./crypto');

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

function getRedirectUri() {
  if (process.env.GOOGLE_DRIVE_REDIRECT_URI) {
    return process.env.GOOGLE_DRIVE_REDIRECT_URI;
  }
  const base = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${base}/api/google-drive/callback`;
}

function getOAuthClient() {
  const { google } = require('googleapis');
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
}

function getAuthUrl(state) {
  const oauth2Client = getOAuthClient();
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

// Signed, expiring OAuth `state` so the unauthenticated /callback endpoint
// can't be abused to attach tokens to someone else's uid (CSRF). Format:
// base64url(uid) + '.' + timestamp + '.' + hex HMAC.
function stateSecret() {
  return process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-only-drive-state-secret';
}

function signDriveState(uid) {
  const crypto = require('crypto');
  const ts = Date.now().toString();
  const payload = `${Buffer.from(String(uid), 'utf8').toString('base64url')}.${ts}`;
  const sig = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyDriveState(state, maxAgeMs = 10 * 60 * 1000) {
  try {
    const crypto = require('crypto');
    const parts = String(state || '').split('.');
    if (parts.length !== 3) return null;
    const [b64, ts, sig] = parts;
    const payload = `${b64}.${ts}`;
    const expected = crypto.createHmac('sha256', stateSecret()).update(payload).digest('hex');
    if (sig.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    if (Date.now() - Number(ts) > maxAgeMs || Number.isNaN(Number(ts))) return null;
    return Buffer.from(b64, 'base64url').toString('utf8') || null;
  } catch {
    return null;
  }
}

async function exchangeCodeForTokens(code) {
  const oauth2Client = getOAuthClient();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

async function storeTokens(ownerUid, tokens) {
  const encryptedAccess = encrypt(tokens.access_token);
  const encryptedRefresh = encrypt(tokens.refresh_token);

  const userInfo = await getUserInfo(tokens.access_token);

  await GoogleDriveToken.findOneAndUpdate(
    { ownerUid },
    {
      ownerUid,
      googleEmail: userInfo?.email || null,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      connectedAt: new Date(),
    },
    { upsert: true, new: true }
  );
}

async function getUserInfo(accessToken) {
  try {
    const { google } = require('googleapis');
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return data;
  } catch {
    return null;
  }
}

async function getValidAccessToken(ownerUid) {
  const tokenDoc = await GoogleDriveToken.findOne({ ownerUid });
  if (!tokenDoc) return null;

  const refreshToken = decrypt(tokenDoc.refreshToken);
  if (!refreshToken) return null;

  const oauth2Client = getOAuthClient();
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
    access_token: decrypt(tokenDoc.accessToken),
    expiry_date: tokenDoc.tokenExpiry ? tokenDoc.tokenExpiry.getTime() : null,
  });

  const isExpired = !tokenDoc.tokenExpiry || tokenDoc.tokenExpiry <= new Date(Date.now() + 60000);

  if (isExpired) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    const encryptedAccess = encrypt(credentials.access_token);

    await GoogleDriveToken.updateOne(
      { ownerUid },
      {
        accessToken: encryptedAccess,
        tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      }
    );

    return credentials.access_token;
  }

  return decrypt(tokenDoc.accessToken);
}

async function revokeTokens(ownerUid) {
  const tokenDoc = await GoogleDriveToken.findOne({ ownerUid });
  if (!tokenDoc) return;

  const accessToken = decrypt(tokenDoc.accessToken);
  if (accessToken) {
    try {
      const { google } = require('googleapis');
      const oauth2Client = getOAuthClient();
      oauth2Client.setCredentials({ access_token: accessToken });
      await oauth2Client.revokeToken(accessToken);
    } catch (err) {
      console.warn('Token revocation failed (non-fatal):', err.message);
    }
  }

  await GoogleDriveToken.deleteOne({ ownerUid });
}

async function getDriveStatus(ownerUid) {
  const tokenDoc = await GoogleDriveToken.findOne({ ownerUid }).lean();
  if (!tokenDoc) return { connected: false };
  return {
    connected: true,
    email: tokenDoc.googleEmail,
    connectedAt: tokenDoc.connectedAt,
  };
}

module.exports = {
  getAuthUrl,
  signDriveState,
  verifyDriveState,
  exchangeCodeForTokens,
  storeTokens,
  getValidAccessToken,
  revokeTokens,
  getDriveStatus,
};
