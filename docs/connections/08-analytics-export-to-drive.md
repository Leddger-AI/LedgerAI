# 08: Analytics Export to Google Drive

## Feature Summary

User clicks "Save to Drive" on the Analytics Overview page or Template Detail page. The backend fetches analytics data from MongoDB, converts it to CSV (auto-converted to Google Sheets) or JSON, uploads it to the user's Google Drive via the Drive API, and returns a link. The frontend shows a success banner with an "Open" link to the uploaded file.

## ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (AnalyticsPage.jsx OR TemplateDetailAnalytics.jsx)    │
│                                                                   │
│  User clicks "Save to Drive" button                               │
│  └─ handleDriveExport('csv')                                     │
│     ├─ setDriveLoading(true) → button shows spinner              │
│     ├─ getAuthToken() → JWT                                      │
│     ├─ fetch POST /api/analytics/export/overview/drive          │
│     │  OR POST /api/analytics/templates/:draftId/export/drive   │
│     │  Headers: { Authorization: Bearer <jwt>,                  │
│     │             Content-Type: application/json }               │
│     │  Body: { format: 'csv', convertToSheet: true }            │
│     └─ Response: { success, id, name, webViewLink }             │
│        └─ setDriveResult({ type: 'success', message, link })    │
│           └─ Banner: "✓ Saved to Google Drive: filename"        │
│              └─ [Open →] link to Google Sheets                   │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — OVERVIEW EXPORT (server/index.js:2300)                │
│  POST /api/analytics/export/overview/drive                       │
│  ├─ verifyToken → req.user.uid                                   │
│  ├─ format = 'csv', convertToSheet = true                       │
│  │                                                                │
│  ├─ FETCH DATA (4 parallel queries):                             │
│  │  ├─ getOverviewStats(uid)     → KPIs                         │
│  │  ├─ getTemplatesWithStats(uid)→ template list                │
│  │  ├─ getSubmissionTrends(uid,30) → trend data                 │
│  │  └─ getTemplateTypeDistribution(uid) → type counts           │
│  │                                                                │
│  ├─ BUILD CSV:                                                    │
│  │  ├─ KPI rows: Total Templates, Active Links, Submissions     │
│  │  ├─ Empty separator row                                       │
│  │  └─ Template rows: DraftID, Title, Type, Status, Count, Date│
│  │                                                                │
│  └─ UPLOAD: uploadCSVToDrive(uid, csvContent, filename, true)   │
│     └─ see GOOGLE DRIVE UPLOAD section below                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — TEMPLATE DETAIL EXPORT (server/index.js:2348)         │
│  POST /api/analytics/templates/:draftId/export/drive             │
│  ├─ verifyToken → req.user.uid                                   │
│  ├─ getTemplateDetail(uid, draftId) → field stats               │
│  ├─ getTemplateSubmissions(uid, draftId, 1, 10000) → all data  │
│  │                                                                │
│  ├─ BUILD CSV:                                                    │
│  │  ├─ Collect ALL unique keys from all submissions             │
│  │  │  (fixes issue #36 — shows all fields, not just first)     │
│  │  ├─ Header: ["Submission ID", "Submitted At", field1, ...]  │
│  │  └─ Data rows: one per submission                            │
│  │                                                                │
│  └─ UPLOAD: uploadCSVToDrive(uid, csvContent, filename, true)   │
│     └─ see GOOGLE DRIVE UPLOAD section below                     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  GOOGLE DRIVE UPLOAD (googleDriveUpload.js)                      │
│                                                                   │
│  uploadToDrive(ownerUid, content, filename, 'text/csv', true)    │
│  ├─ getValidAccessToken(ownerUid) → googleDriveOAuth.js:72      │
│  │  ├─ GoogleDriveToken.findOne({ ownerUid })                   │
│  │  ├─ decrypt(refreshToken) → crypto.js                        │
│  │  ├─ decrypt(accessToken)  → crypto.js                        │
│  │  ├─ Token expired? (expiry < now + 60s)                      │
│  │  │  ├─ YES → oauth2Client.refreshAccessToken()               │
│  │  │  │         ├─ Gets new access_token from Google           │
│  │  │  │         ├─ encrypt(new_token) → save to MongoDB        │
│  │  │  │         └─ return new token                            │
│  │  │  └─ NO  → return decrypted existing token                │
│  │  └─ No token doc? → throw "Google Drive not connected..."    │
│  │                                                                │
│  ├─ getDriveClient(accessToken)                                  │
│  │  └─ google.drive({ version: 'v3', auth: oauth2Client })     │
│  │                                                                │
│  ├─ drive.files.create({                                         │
│  │    requestBody: {                                             │
│  │      name: "analytics-overview-1234567890" (no .csv ext)    │
│  │      mimeType: 'application/vnd.google-apps.spreadsheet'     │
│  │      ↑ Tells Drive to CONVERT CSV → Google Sheets            │
│  │    },                                                         │
│  │    media: {                                                   │
│  │      mimeType: 'text/csv',                                   │
│  │      body: Readable.from([csvContent]) (stream, low memory) │
│  │    },                                                         │
│  │    fields: 'id,webViewLink,name'                            │
│  │  })                                                           │
│  │                                                                │
│  └─ return { id, name, webViewLink }                            │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  GOOGLE DRIVE (external)                                          │
│                                                                   │
│  File created in user's Google Drive:                             │
│  ├─ Type: Google Sheets (converted from CSV)                    │
│  ├─ Name: "analytics-overview-1234567890"                       │
│  ├─ Accessible at: drive.google.com/...                          │
│  └─ User can open, edit, share from Drive                       │
└─────────────────────────────────────────────────────────────────┘
```

## File-by-File Trace

| Step | File | Lines | What Happens |
|------|------|-------|--------------|
| 1. Overview button | `src/pages/AnalyticsPage.jsx` | 187-194 | "Save to Drive" button |
| 2. Overview handler | `src/pages/AnalyticsPage.jsx` | 115-134 | `handleDriveExport()` |
| 3. Detail button | `src/pages/TemplateDetailAnalytics.jsx` | 180-189 | "Save to Drive" button |
| 4. Detail handler | `src/pages/TemplateDetailAnalytics.jsx` | 84-103 | `handleDriveExport()` |
| 5. Overview API | `server/index.js` | 2300-2342 | `POST /api/analytics/export/overview/drive` |
| 6. Detail API | `server/index.js` | 2348-2385 | `POST /api/analytics/templates/:draftId/export/drive` |
| 7. CSV upload | `server/utils/googleDriveUpload.js` | 40-42 | `uploadCSVToDrive()` |
| 8. JSON upload | `server/utils/googleDriveUpload.js` | 44-46 | `uploadJSONToDrive()` |
| 9. Core upload | `server/utils/googleDriveUpload.js` | 11-38 | `uploadToDrive()` |
| 10. Get token | `server/utils/googleDriveOAuth.js` | 72-104 | `getValidAccessToken()` |
| 11. Token refresh | `server/utils/googleDriveOAuth.js` | 88-100 | Auto-refresh if expired |
| 12. Encrypt | `server/utils/crypto.js` | 14-27 | `encrypt()` for new tokens |
| 13. Decrypt | `server/utils/crypto.js` | 29-39 | `decrypt()` for stored tokens |
| 14. Result banner | `src/pages/AnalyticsPage.jsx` | 212-222 | Success/error banner with "Open" link |

## Shared Dependencies

- **Google Drive API** — file creation via `googleapis` (lazy-loaded)
- **MongoDB** — `GoogleDriveToken` for token storage, `TemplateData`/`TemplateSubmission` for analytics data
- **crypto.js** — AES-256-GCM encryption for tokens
- **Supabase Auth** — JWT for API authentication
- **Google OAuth** — access/refresh tokens (see [04-google-drive-oauth-connect.md](./04-google-drive-oauth-connect.md))

## Error Paths

| Scenario | What Happens |
|----------|-------------|
| Drive not connected | `getValidAccessToken()` returns null, throws "not connected", 400 returned |
| Token expired + refresh fails | Upload throws, 500 returned, error banner shown |
| Drive API quota exceeded | Upload throws, 500 returned |
| No submissions for template | CSV with header only, uploaded as empty sheet |
| Template not found | 404 returned |

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GOOGLE_DRIVE_REDIRECT_URI` | No | OAuth callback URL |
| `ENCRYPTION_KEY` | Yes | AES-256-GCM key for token encryption |
| `MONGODB_URI` | Yes | MongoDB connection string |
