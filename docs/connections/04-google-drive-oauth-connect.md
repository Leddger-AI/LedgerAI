# 04: Google Drive OAuth Connect (Phase 7)

## Feature Summary

User connects Google Drive from Settings → Integrations. Unlike GitHub and Google Calendar (which use Supabase identity linking), Google Drive uses a **separate backend OAuth flow** with `drive.file` scope. Tokens are encrypted and stored in MongoDB. The backend can refresh tokens automatically and revoke them on disconnect.

## ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (IntegrationsSection.jsx)                              │
│                                                                   │
│  Page loads → checkDriveStatus()                                  │
│  ├─ getAuthToken() → JWT                                         │
│  ├─ fetch GET /api/google-drive/status                           │
│  │  Headers: { Authorization: Bearer <jwt> }                    │
│  └─ setDriveStatus({ connected: true, email })                  │
│                                                                   │
│  User clicks "Connect Google Drive"                               │
│  └─ handleConnectDrive()                                         │
│     ├─ getAuthToken() → JWT                                      │
│     ├─ fetch GET /api/google-drive/auth                          │
│     │  └─ Returns { authUrl }                                    │
│     └─ window.location.href = authUrl (redirect to Google)       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (server/index.js:2234)                                   │
│  GET /api/google-drive/auth                                       │
│  ├─ verifyToken → req.user.uid                                   │
│  ├─ getAuthUrl(req.user.uid) → googleDriveOAuth.js:23            │
│  │  ├─ getOAuthClient()                                          │
│  │  │  └─ new google.auth.OAuth2(GOOGLE_CLIENT_ID, SECRET, REDIRECT)│
│  │  └─ generateAuthUrl({                                         │
│  │       access_type: 'offline',                                 │
│  │       prompt: 'consent',                                      │
│  │       scope: ['drive.file'],                                  │
│  │       state: req.user.uid                                     │
│  │     })                                                        │
│  └─ res.json({ authUrl })                                        │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  GOOGLE CONSENT SCREEN (external)                                │
│                                                                   │
│  User sees: "Leddger-AI wants to manage files in your Drive"     │
│  User clicks "Allow"                                              │
│  └─ Google redirects to: /api/google-drive/callback              │
│     ?code=AUTH_CODE&state=USER_UID                               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (server/index.js:2249)                                   │
│  GET /api/google-drive/callback                                   │
│  ├─ exchangeCodeForTokens(code) → googleDriveOAuth.js:33         │
│  │  └─ oauth2Client.getToken(code) → { access_token, refresh_token }│
│  ├─ storeTokens(state, tokens) → googleDriveOAuth.js:39          │
│  │  ├─ encrypt(access_token) → crypto.js (AES-256-GCM)          │
│  │  ├─ encrypt(refresh_token) → crypto.js                       │
│  │  ├─ getUserInfo(access_token) → Google OAuth2 userinfo API   │
│  │  └─ GoogleDriveToken.findOneAndUpdate(                       │
│  │       { ownerUid: state },                                    │
│  │       { accessToken: encrypted, refreshToken: encrypted,     │
│  │         googleEmail, tokenExpiry },                           │
│  │       { upsert: true })                                       │
│  │     └─ Saves to MongoDB                                       │
│  └─ res.redirect(FRONTEND_URL/dashboard/settings/integrations   │
│                   ?drive=connected)                              │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (IntegrationsSection.jsx)                              │
│                                                                   │
│  Page loads with ?drive=connected in URL                         │
│  ├─ useEffect reads URLSearchParams                              │
│  │  └─ showSuccess("Google Drive connected successfully!")      │
│  ├─ checkDriveStatus() runs                                      │
│  │  └─ GET /api/google-drive/status                              │
│  │     └─ getDriveStatus(uid) → GoogleDriveToken.findOne()      │
│  │        └─ Returns { connected: true, email }                 │
│  ├─ Status badge: "✓ Connected"                                  │
│  ├─ Shows "Connected as user@gmail.com"                         │
│  ├─ Button changes to "Disconnect Drive"                        │
│  └─ URL cleaned via history.replaceState()                      │
└─────────────────────────────────────────────────────────────────┘
```

## Disconnect Flow

```
FRONTEND: handleDisconnectDrive()
  ├─ confirm("Disconnect Google Drive?")
  ├─ getAuthToken() → JWT
  ├─ fetch DELETE /api/google-drive/disconnect
  └─ checkDriveStatus() → UI shows "Not Connected"
      │
      ▼
BACKEND: server/index.js:2286 → revokeTokens(req.user.uid)
  ├─ googleDriveOAuth.js:106
  │  ├─ GoogleDriveToken.findOne({ ownerUid })
  │  ├─ decrypt(accessToken)
  │  ├─ oauth2Client.revokeToken(accessToken) → Google invalidates
  │  └─ GoogleDriveToken.deleteOne({ ownerUid }) → MongoDB deleted
  └─ res.json({ success: true })
```

## File-by-File Trace

| Step | File | Lines | What Happens |
|------|------|-------|--------------|
| 1. Check status | `src/settings/IntegrationsSection.jsx` | 55-70 | `checkDriveStatus()` |
| 2. Connect click | `src/settings/IntegrationsSection.jsx` | 72-91 | `handleConnectDrive()` |
| 3. Get auth URL | `server/index.js` | 2234-2243 | `GET /api/google-drive/auth` |
| 4. Generate URL | `server/utils/googleDriveOAuth.js` | 23-31 | `getAuthUrl(state)` |
| 5. OAuth callback | `server/index.js` | 2249-2266 | `GET /api/google-drive/callback` |
| 6. Exchange code | `server/utils/googleDriveOAuth.js` | 33-37 | `exchangeCodeForTokens(code)` |
| 7. Store tokens | `server/utils/googleDriveOAuth.js` | 39-57 | `storeTokens(ownerUid, tokens)` |
| 8. Encrypt | `server/utils/crypto.js` | 14-27 | `encrypt(text)` AES-256-GCM |
| 9. MongoDB model | `server/models/GoogleDriveToken.js` | 1-42 | Schema with encrypted fields |
| 10. Status check | `server/utils/googleDriveOAuth.js` | 125-133 | `getDriveStatus(ownerUid)` |
| 11. Query param | `src/settings/IntegrationsSection.jsx` | 121-130 | Reads `?drive=connected` |
| 12. Disconnect | `src/settings/IntegrationsSection.jsx` | 93-114 | `handleDisconnectDrive()` |
| 13. Revoke | `server/utils/googleDriveOAuth.js` | 106-123 | `revokeTokens(ownerUid)` |

## Shared Dependencies

- **Supabase Auth** — JWT for API authentication
- **MongoDB** — `GoogleDriveToken` collection for encrypted token storage
- **googleapis** — Google OAuth2 client + Drive API (lazy-loaded)
- **crypto.js** — AES-256-GCM encryption for tokens
- **Google Cloud Console** — OAuth consent screen, Drive API enabled

## Error Paths

| Scenario | What Happens |
|----------|-------------|
| Not connected | `getValidAccessToken()` returns null, upload throws "not connected" |
| Token expired | `getValidAccessToken()` auto-refreshes using refresh token |
| Refresh failed | Upload endpoint returns 500, user sees error banner |
| OAuth callback error | Redirects to `?drive=error`, shows error toast |
| Revoke fails | Non-fatal warning logged, MongoDB record still deleted |

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID (shared with Gmail) |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret (shared with Gmail) |
| `GOOGLE_DRIVE_REDIRECT_URI` | No | Defaults to `{SERVER_URL}/api/google-drive/callback` |
| `FRONTEND_URL` | No | Defaults to `http://localhost:5173` |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for AES-256-GCM encryption |
