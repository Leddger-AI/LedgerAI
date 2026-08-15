# Feature Connection Maps

End-to-end traces of every major feature loop in Leddger-AI — from frontend user action through API call, backend logic, database operations, external services, and back to the UI.

## Purpose

These docs serve as a **living architectural reference** so any developer can trace exactly how a feature works by following the chain of file references and line numbers.

## Connection Maps

| # | File | Feature | Key Flow |
|---|------|---------|----------|
| 01 | [auth-login-flow.md](./01-auth-login-flow.md) | Authentication & Login | Login → Supabase OAuth → JWT → session → route guard |
| 02 | [github-oauth-connect.md](./02-github-oauth-connect.md) | GitHub Integration | Settings → Supabase OAuth → GitHub identity link |
| 03 | [google-calendar-connect.md](./03-google-calendar-connect.md) | Google Calendar Integration | Settings → Supabase OAuth → Google identity link |
| 04 | [google-drive-oauth-connect.md](./04-google-drive-oauth-connect.md) | Google Drive Integration (Phase 7) | Settings → Backend OAuth → token storage → connect/disconnect |
| 05 | [analytics-overview-load.md](./05-analytics-overview-load.md) | Analytics Overview Page | Page load → 4 API calls → MongoDB aggregation → charts |
| 06 | [analytics-detail-load.md](./06-analytics-detail-load.md) | Template Detail Analytics | Click template → detail + submissions + GitHub analysis |
| 07 | [analytics-sync.md](./07-analytics-sync.md) | Analytics Data Sync | Sync button → Supabase → MongoDB backfill |
| 08 | [analytics-export-to-drive.md](./08-analytics-export-to-drive.md) | Export to Google Drive | Save to Drive → CSV/JSON → Google Drive upload |
| 09 | [email-campaign-schedule.md](./09-email-campaign-schedule.md) | Email Campaign Scheduling | Compose → schedule → Agenda → nodemailer → send log |
| 10 | [template-draft-lifecycle.md](./10-template-draft-lifecycle.md) | Template Draft Lifecycle | Create → schedule → activate → submit → expire |
| 11 | [account-deletion.md](./11-account-deletion.md) | Account Deletion | Delete → cascade across Supabase + MongoDB + Cloudinary |
| 12 | [avatar-upload.md](./12-avatar-upload.md) | Avatar Upload | File select → Sharp compress → Cloudinary → Supabase URL |

## How to Read Each Map

Each file follows this structure:

1. **Feature Summary** — what the user does and what happens
2. **ASCII Flow Diagram** — visual chain of the full loop
3. **File-by-File Trace** — exact file paths and line numbers
4. **Shared Dependencies** — what other systems this feature touches
5. **Error Paths** — what happens when things fail
6. **Environment Variables** — required config

## Shared Infrastructure

All features share these core systems:

```
┌─────────────────────────────────────────────────────────────────┐
│  SHARED INFRASTRUCTURE                                           │
│                                                                  │
│  Supabase (PostgreSQL)                                           │
│  ├─ Auth: JWT issuance & verification                            │
│  ├─ Tables: profiles, form_drafts, form_submissions,            │
│  │           meetings, alerts, candidates, email_send_log        │
│  └─ Admin client: server/supabaseClient.js (service role key)   │
│                                                                  │
│  MongoDB                                                         │
│  ├─ Connection: server/index.js (mongoConnectPromise)           │
│  ├─ Models: TemplateData, TemplateSubmission, EmailCampaign,    │
│  │          EmailDraft, EmailConfig, EmailAccount, Spreadsheet, │
│  │          GoogleDriveToken, User (deprecated)                  │
│  └─ Agenda: job scheduler using MongoDB as backend              │
│                                                                  │
│  Auth Middleware: server/middleware/auth.js (verifyToken)        │
│  ├─ Validates Supabase JWT on every protected API call          │
│  └─ Sets req.user.uid = Supabase user ID                        │
│                                                                  │
│  Frontend Auth: src/supabaseAuth.js                              │
│  ├─ getAuthToken() → JWT from Supabase session                  │
│  ├─ loginWithGoogleAndCalendar() / loginWithGitHub()            │
│  ├─ getUserIdentities() → linked OAuth providers                │
│  └─ unlinkProvider() → disconnect OAuth provider                │
│                                                                  │
│  Encryption: server/utils/crypto.js (AES-256-GCM)               │
│  └─ encrypt/decrypt for sensitive tokens & credentials          │
│                                                                  │
│  External Services                                               │
│  ├─ Google OAuth (login + Drive + Gmail)                        │
│  ├─ GitHub OAuth (login + identity)                             │
│  ├─ Cloudinary (image storage)                                  │
│  └─ Google Drive API (file upload via googleapis)               │
└─────────────────────────────────────────────────────────────────┘
```
