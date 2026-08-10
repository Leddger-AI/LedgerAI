# Email Automation Feature — Complete Implementation

## Overview

This document covers the full implementation of the Email Automation feature for LedgerAI. It enables users to save email drafts from the Email Body Editor, view them in a dashboard grid, configure SMTP settings (App Password or OAuth2), send test emails, and run email campaigns with variable substitution from linked spreadsheet data.

---

## Architecture

```
Email Body Editor (Body tab)
  └── Save Draft button → POST /api/email/drafts
                              ↓
Email Automation View (Email tab)
  ├── Draft Card Grid (left)
  │   ├── Shows subject + body preview (120 chars)
  │   ├── Shows data source file name + timestamp
  │   ├── Click → fetches full draft detail
  │   └── Delete button per card
  └── Right Sidebar
      ├── Email Configuration
      │   ├── Shows current config (email, auth method, status)
      │   ├── Send Test Email button
      │   └── Edit Configuration → opens modal
      │       ├── App Password tab (SMTP host, port, password)
      │       └── OAuth2 tab (Client ID, Secret, Refresh Token)
      └── Recent Campaigns (sent/failed stats)

Backend (server/index.js)
  ├── POST   /api/email/drafts        → Save draft
  ├── GET    /api/email/drafts        → List drafts (no bodyHtml)
  ├── GET    /api/email/drafts/:id    → Get full draft
  ├── PUT    /api/email/drafts/:id    → Update draft
  ├── DELETE /api/email/drafts/:id    → Delete draft
  ├── GET    /api/email/config        → Get config (masked)
  ├── PUT    /api/email/config        → Save/update config
  ├── DELETE /api/email/config        → Delete config
  ├── POST   /api/email/test          → Send test email
  ├── POST   /api/email/send          → Send campaign (with variable substitution)
  ├── GET    /api/email/campaigns     → List campaigns
  └── GET    /api/email/campaigns/:id → Get campaign detail
```

---

## Files Created

| File | Purpose |
|------|---------|
| `server/models/EmailDraft.js` | Mongoose model for saved email drafts |
| `server/models/EmailConfig.js` | Mongoose model for per-user SMTP/OAuth2 config |
| `server/models/EmailCampaign.js` | Mongoose model for email campaigns with recipient tracking |
| `src/EmailAutomationView.css` | Styling for the Email Automation dashboard view |

## Files Modified

| File | Changes |
|------|---------|
| `server/index.js` | Added 3 model imports + 11 email API endpoints |
| `src/EmailAutomationView.jsx` | Complete rewrite — replaced static mock data with real draft grid, sidebar, config modal |
| `src/pages/EmailBodyEditor.jsx` | Added Save Draft button, saving state, toast notification |
| `src/pages/EmailBodyEditor.css` | Added styles for save button and toast |

---

## MongoDB Models

### EmailDraft (`server/models/EmailDraft.js`)

```javascript
{
  ownerUid: String (required, indexed),
  subject: String (default: ''),
  bodyHtml: String (default: ''),
  variables: [{ id: String, label: String }],
  dataSourceType: String (enum: 'upload' | 'roster_studio' | 'none'),
  dataSourceFile: String,
  dataSourceSheetId: String,
  createdAt: Date,
  updatedAt: Date
}
```

### EmailConfig (`server/models/EmailConfig.js`)

```javascript
{
  ownerUid: String (required, unique),
  email: String (required),
  authMethod: String (enum: 'oauth2' | 'app_password', required),
  // App Password fields
  smtpHost: String (default: 'smtp.gmail.com'),
  smtpPort: Number (default: 587),
  appPassword: String,
  // OAuth2 fields
  refreshToken: String,
  clientId: String,
  clientSecret: String,
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### EmailCampaign (`server/models/EmailCampaign.js`)

```javascript
{
  ownerUid: String (required, indexed),
  name: String,
  draftId: ObjectId (ref: 'EmailDraft', required),
  status: String (enum: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'failed'),
  recipients: [{
    email: String,
    name: String,
    variables: Mixed,
    status: String (enum: 'pending' | 'sent' | 'failed' | 'opened'),
    error: String,
    sentAt: Date
  }],
  sentCount: Number,
  failedCount: Number,
  openCount: Number,
  replyCount: Number,
  scheduledAt: Date,
  sentAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Backend Endpoints

### Email Drafts CRUD

#### `POST /api/email/drafts`
- **Auth:** Required (verifyToken)
- **Body:** `{ subject, bodyHtml, variables, dataSourceType, dataSourceFile, dataSourceSheetId }`
- **Response:** `{ message: 'Draft saved', draft }`

#### `GET /api/email/drafts`
- **Auth:** Required
- **Response:** `{ drafts: [...] }` (excludes `bodyHtml` for performance)

#### `GET /api/email/drafts/:id`
- **Auth:** Required
- **Response:** `{ draft }` (full draft with `bodyHtml`)

#### `PUT /api/email/drafts/:id`
- **Auth:** Required
- **Body:** Any subset of draft fields
- **Response:** `{ message: 'Draft updated', draft }`

#### `DELETE /api/email/drafts/:id`
- **Auth:** Required
- **Response:** `{ message: 'Draft deleted' }`

### Email Config

#### `GET /api/email/config`
- **Auth:** Required
- **Response:** `{ config: { email, authMethod, smtpHost, smtpPort, isActive, hasAppPassword, hasRefreshToken } }` — passwords/tokens are never returned, only boolean flags

#### `PUT /api/email/config`
- **Auth:** Required
- **Body:** `{ email, authMethod, smtpHost, smtpPort, appPassword, refreshToken, clientId, clientSecret }`
- **Behavior:** Upserts config (one per user via `ownerUid`)
- **Response:** `{ message: 'Email config saved', config }` (masked)

#### `DELETE /api/email/config`
- **Auth:** Required
- **Response:** `{ message: 'Email config deleted' }`

### Email Sending

#### `POST /api/email/test`
- **Auth:** Required
- **Behavior:** Sends a test email from the user's configured email to themselves
- **Response:** `{ message: 'Test email sent successfully' }`

#### `POST /api/email/send`
- **Auth:** Required
- **Body:** `{ draftId, recipients: [{ email, name, variables }], campaignName }`
- **Behavior:**
  1. Fetches draft from MongoDB
  2. Fetches user's email config
  3. Creates an EmailCampaign record
  4. Builds Nodemailer transporter (OAuth2 or App Password)
  5. For each recipient:
     - Substitutes `{{variables}}` in subject and body
     - Sends email via Nodemailer
     - Tracks sent/failed status per recipient
  6. Updates campaign with aggregate counts
- **Response:** `{ message, campaignId, sentCount, failedCount, totalRecipients }`

### Campaigns

#### `GET /api/email/campaigns`
- **Auth:** Required
- **Response:** `{ campaigns: [...] }` (populated with draft subject + dataSourceFile)

#### `GET /api/email/campaigns/:id`
- **Auth:** Required
- **Response:** `{ campaign }` (full campaign with recipients)

---

## Frontend Changes

### Email Body Editor (`src/pages/EmailBodyEditor.jsx`)

**Added:**
- `Save` and `CheckCircle2` icon imports from lucide-react
- `saving` and `saveStatus` state variables
- `handleSaveDraft()` function — POSTs subject, bodyHtml, variables, and data source info to `/api/email/drafts`
- "Save Draft" button in the toolbar (dark button with loading spinner)
- Toast notification (fixed bottom-right) with success/error states
- CSS for `.save-draft-btn` and `.save-toast` in `EmailBodyEditor.css`

**Save flow:**
1. User writes email subject + body in the editor
2. Optionally imports variables from CSV/XLSX or Roster Studio
3. Clicks "Save Draft"
4. Frontend POSTs to backend with `subject`, `bodyHtml` (innerHTML), `variables`, `dataSourceType`, `dataSourceFile`
5. Toast shows "Draft saved successfully!" (green) or error (red)
6. Toast auto-dismisses after 3 seconds

### Email Automation View (`src/EmailAutomationView.jsx`)

**Complete rewrite** — replaced all static mock data with real API integration.

**State:**
- `drafts`, `draftsLoading`, `draftsError` — draft list
- `selectedDraft`, `draftDetail`, `draftDetailLoading` — selected draft detail
- `config`, `configLoading` — email config
- `showConfigModal`, `configForm`, `configSaving`, `configStatus` — config modal
- `testing`, `testStatus` — test email
- `campaigns`, `campaignsLoading` — campaign list

**Functions:**
- `fetchDrafts()` — GET `/api/email/drafts`
- `fetchConfig()` — GET `/api/email/config`
- `fetchCampaigns()` — GET `/api/email/campaigns`
- `fetchDraftDetail(id)` — GET `/api/email/drafts/:id`
- `handleDeleteDraft(id)` — DELETE `/api/email/drafts/:id`
- `handleSaveConfig()` — PUT `/api/email/config`
- `handleTestEmail()` — POST `/api/email/test`

**Layout:**
- **Left (main):** Header + draft card grid
  - Each card: subject (bold), body preview (120 chars, 3-line clamp), footer with file name + timestamp + delete button
  - Clicking a card opens a detail panel below with full HTML body
- **Right (sidebar, 300px):**
  - Email Configuration section — shows current config or "Setup Email" button
  - "Send Test Email" button with status feedback
  - "Edit Configuration" button → opens modal
  - Recent Campaigns section — shows last 5 campaigns with status badges
- **Config Modal (480px, centered):**
  - Sender Email input
  - Auth Method tabs: App Password | OAuth2
  - App Password: SMTP Host, SMTP Port, App Password inputs
  - OAuth2: Client ID, Client Secret, Refresh Token inputs
  - Save/Cancel buttons with loading state

### Email Automation CSS (`src/EmailAutomationView.css`)

Full styling for the new view — container layout (flex, 2 columns), draft card grid (auto-fill, minmax 280px), card hover/selected states, sidebar sections, config modal, form inputs, auth tabs, campaign badges, loading/empty states, and spin animations.

---

## Email Sending Flow

```
1. User saves draft in Email Body Editor
   → POST /api/email/drafts
   → Draft stored in MongoDB (emaildrafts collection)

2. User goes to Email Automation page
   → GET /api/email/drafts (list without bodyHtml)
   → Draft cards render in grid

3. User configures email
   → PUT /api/email/config (upsert)
   → Config stored in MongoDB (emailconfigs collection)

4. User sends test email
   → POST /api/email/test
   → Backend creates Nodemailer transporter
   → Sends email to self
   → Returns success/error

5. User sends campaign
   → POST /api/email/send { draftId, recipients, campaignName }
   → Backend:
     a. Fetch draft (subject + bodyHtml)
     b. Fetch email config
     c. Create EmailCampaign record
     d. Build Nodemailer transporter (OAuth2 or App Password)
     e. For each recipient:
        - Replace {{variable}} placeholders with row values
        - Send via Nodemailer
        - Track sent/failed
     f. Update campaign aggregate counts
   → Return campaign results

6. Campaigns visible in sidebar
   → GET /api/email/campaigns
   → Shows sent/failed counts + status badge
```

---

## Variable Substitution

When sending a campaign, the backend resolves `{{variable}}` placeholders:

```
Draft subject: "Quick question about {{company_name}}"
Draft body: "Hello {{first_name}}, I work at {{company_name}}"

Recipient variables: { company_name: "Acme Corp", first_name: "John" }

Result subject: "Quick question about Acme Corp"
Result body: "Hello John, I work at Acme Corp"
```

The substitution uses regex: `new RegExp('{{\\s*${key}\\s*}}', 'g')` to handle whitespace variations like `{{first_name}}`, `{{ first_name }}`, etc.

---

## Authentication & Security

### Per-User Scoping
All endpoints use `verifyToken` middleware which sets `req.user.uid` from the Supabase JWT. All MongoDB queries filter by `ownerUid: req.user.uid` — users can only access their own drafts, configs, and campaigns.

### Credential Handling
- **App Passwords:** Stored in MongoDB as plaintext (to be encrypted in production with AES-256)
- **OAuth2 Tokens:** Refresh tokens stored in MongoDB
- **GET /api/email/config:** Never returns passwords or tokens — only boolean flags (`hasAppPassword`, `hasRefreshToken`)
- **Frontend:** Config form uses `type="password"` for sensitive fields

### Authentication Methods (2026 Best Practice)

| Method | When | Security |
|--------|------|----------|
| **OAuth2 + Refresh Token** | User connects Gmail via OAuth2 | Best — short-lived tokens, revocable, scoped |
| **App Password (SMTP)** | User provides email + 16-char app password | Good — works with 2FA accounts, simpler setup |

Google Workspace requires OAuth2 since May 2025. Personal Gmail still supports app passwords. The dual-path approach covers both.

---

## Nodemailer Integration

The existing `server/utils/emailService.js` uses a single hardcoded OAuth2 config from `.env` for form submission notifications. The new email automation endpoints create **per-user transporters** dynamically:

```javascript
// App Password transporter
nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: config.smtpPort === 465,
  auth: { user: config.email, pass: config.appPassword }
});

// OAuth2 transporter
const oauth2Client = new OAuth2(config.clientId, config.clientSecret, redirectUrl);
oauth2Client.setCredentials({ refresh_token: config.refreshToken });
const accessToken = await getAccessToken(oauth2Client);
nodemailer.createTransport({
  service: 'gmail',
  auth: { type: 'OAuth2', user: config.email, accessToken, clientId, clientSecret, refreshToken }
});
```

---

## Testing Checklist

- [ ] Write email in Body Editor → click Save Draft → toast shows success
- [ ] Go to Email Automation page → saved draft appears as a card
- [ ] Card shows subject, body preview (truncated), file name, timestamp
- [ ] Click card → detail panel shows full HTML body
- [ ] Click trash icon → draft deleted from grid
- [ ] Click "Setup Email" → config modal opens
- [ ] Enter email + app password → save → config shows in sidebar
- [ ] Click "Send Test Email" → test email arrives in inbox
- [ ] Switch to OAuth2 tab → enter Client ID, Secret, Refresh Token → save
- [ ] No credentials returned in GET /api/email/config (only boolean flags)
- [ ] POST /api/email/send with recipients → emails sent with variable substitution
- [ ] Campaign appears in sidebar with sent/failed counts
- [ ] All endpoints return 401 without valid token
- [ ] All endpoints return 404 for other users' resources
