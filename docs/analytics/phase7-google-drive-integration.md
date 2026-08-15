# Phase 7: Google Drive Integration for Analytics Exports

## Overview

This phase adds Google Drive integration so users can save analytics exports (CSV, Google Sheets, JSON) directly to their Google Drive. The integration is **separate from the login OAuth flow** — users connect Google Drive from Settings → Integrations after logging in.

## Architecture

```
User logs in (any method)
  → Settings → Integrations → "Connect Google Drive"
  → Backend generates Google OAuth URL with drive.file scope
  → User grants permission on Google consent screen
  → Google redirects to /api/google-drive/callback
  → Backend exchanges code for tokens, encrypts & stores in MongoDB
  → User redirected back to settings with "Connected" status

User goes to Analytics page
  → Clicks "Save to Drive" button
  → Backend fetches valid access token (refreshes if expired)
  → Uploads CSV/JSON to user's Google Drive via googleapis
  → Returns file link → user sees success banner with "Open" link
```

## Why Separate from Supabase OAuth?

The existing `loginWithGoogleAndCalendar()` uses `supabase.auth.signInWithOAuth` — that's a **login** flow that creates/links a Supabase session. For Google Drive, we need a **separate authorization** that:

- Doesn't touch the user's Supabase auth session
- Only requests `drive.file` scope (create/manage files your app creates)
- Returns tokens the backend can use server-side
- Can be connected/disconnected independently

## New Files

### 1. `server/models/GoogleDriveToken.js`

Mongoose model for storing encrypted Google OAuth tokens per user.

| Field | Type | Description |
|---|---|---|
| `ownerUid` | String (unique, indexed) | Supabase user ID |
| `googleEmail` | String | User's Google email (from userinfo API) |
| `accessToken` | Mixed (encrypted) | Encrypted Google access token |
| `refreshToken` | Mixed (encrypted) | Encrypted Google refresh token |
| `tokenExpiry` | Date | Access token expiration time |
| `connectedAt` | Date | When user connected Drive |

Encryption uses the existing `server/utils/crypto.js` (AES-256-GCM with `ENCRYPTION_KEY` env var).

### 2. `server/utils/googleDriveOAuth.js`

OAuth utility functions:

| Function | Description |
|---|---|
| `getAuthUrl(state)` | Generates Google OAuth URL with `drive.file` scope, `access_type: 'offline'`, `prompt: 'consent'` |
| `exchangeCodeForTokens(code)` | Exchanges authorization code for access/refresh tokens |
| `storeTokens(ownerUid, tokens)` | Encrypts and stores tokens in MongoDB, fetches user email |
| `getValidAccessToken(ownerUid)` | Returns valid access token — auto-refreshes if expired using stored refresh token |
| `revokeTokens(ownerUid)` | Revokes Google tokens server-side + deletes from MongoDB |
| `getDriveStatus(ownerUid)` | Returns `{ connected, email, connectedAt }` |

### 3. `server/utils/googleDriveUpload.js`

Drive upload utility functions:

| Function | Description |
|---|---|
| `uploadCSVToDrive(ownerUid, csvContent, filename, convertToSheet)` | Uploads CSV to Drive, optionally converts to Google Sheets format |
| `uploadJSONToDrive(ownerUid, jsonContent, filename)` | Uploads JSON file to Drive |

Uses `googleapis` drive v3 API with `Readable.from([content])` streams. For Sheets conversion, sets `mimeType: 'application/vnd.google-apps.spreadsheet'` on the file metadata.

## New API Endpoints

### OAuth Flow

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/google-drive/auth` | GET | verifyToken | Returns `{ authUrl }` — frontend redirects user to Google consent |
| `/api/google-drive/callback` | GET | None (Google redirect) | Exchanges code for tokens, stores them, redirects to frontend |
| `/api/google-drive/status` | GET | verifyToken | Returns `{ connected, email }` for current user |
| `/api/google-drive/disconnect` | DELETE | verifyToken | Revokes tokens + deletes from DB |

### Export to Drive

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/analytics/export/overview/drive` | POST | verifyToken | Uploads overview analytics as CSV (→ Google Sheets) or JSON |
| `/api/analytics/templates/:draftId/export/drive` | POST | verifyToken | Uploads template detail + submissions as CSV (→ Google Sheets) or JSON |

Request body: `{ format: 'csv' | 'json', convertToSheet: boolean }`

Response: `{ success: true, id, name, webViewLink }`

## Frontend Changes

### `src/settings/IntegrationsSection.jsx`

Added a **Google Drive** integration card (between Google Calendar and Cloudinary):

- "Connect Google Drive" button → calls `/api/google-drive/auth`, redirects to Google OAuth URL
- "Disconnect Drive" button → calls `/api/google-drive/disconnect`
- Status check via `/api/google-drive/status` on mount
- Shows connected Google email when connected

### `src/pages/AnalyticsPage.jsx`

- Added "Save to Drive" button next to "Sync Data" in the header
- `handleDriveExport()` calls `/api/analytics/export/overview/drive`
- Shows success banner with file name and "Open" link to Google Drive
- Shows error banner if Drive not connected or upload fails

### `src/pages/TemplateDetailAnalytics.jsx`

- Added "Save to Drive" button in the detail header
- `handleDriveExport()` calls `/api/analytics/templates/:draftId/export/drive`
- Same success/error banner pattern

### `src/pages/AnalyticsPage.css`

- `.analytics-drive-btn` — green-themed button matching Drive branding
- `.analytics-detail-actions` — flex container for detail header buttons
- `.analytics-drive-link` — inline link for "Open" in result banner

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | Already exists for Gmail OAuth — reused for Drive |
| `GOOGLE_CLIENT_SECRET` | Yes | Already exists for Gmail OAuth — reused for Drive |
| `GOOGLE_DRIVE_REDIRECT_URI` | No | Defaults to `{SERVER_URL}/api/google-drive/callback`. Set explicitly in production. |
| `FRONTEND_URL` | No | Defaults to `http://localhost:5173`. Set to production URL for OAuth callback redirect. |
| `ENCRYPTION_KEY` | Yes | Already exists — used for encrypting Google Drive tokens |

## Google Cloud Console Setup

1. Go to **Google Cloud Console → APIs & Services → OAuth consent screen**
2. Add scope: `https://www.googleapis.com/auth/drive.file`
3. Go to **Credentials → OAuth 2.0 Client IDs**
4. Add authorized redirect URI: `https://yourdomain.com/api/google-drive/callback`
5. Enable **Google Drive API** in the API library

## RAM Impact

- `googleapis` is already lazy-loaded (Phase 6 optimization) — no additional startup RAM
- Drive API reuses the same `googleapis` package — ~0 additional RAM
- Token storage uses existing MongoDB connection — no new connections
- Upload uses `Readable.from([content])` streams — minimal memory overhead

## Security

- Tokens encrypted with AES-256-GCM before storage
- `drive.file` scope is non-sensitive — only allows app to manage files it creates
- OAuth state parameter prevents CSRF attacks
- Token revocation on disconnect
- No tokens exposed to frontend — only auth URL and status are returned
