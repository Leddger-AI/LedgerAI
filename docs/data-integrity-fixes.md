# Data Integrity & Bug Fix Report

**Date:** August 11, 2026  
**Scope:** Frontend, backend, and database schema fixes for data integrity, correct data flow, and missing features.  
**Build Status:** All changes verified with `vite build` — passes cleanly.

---

## Summary

| # | Issue | Severity | Files Modified |
|---|-------|----------|----------------|
| 1 | Hardcoded `localhost:5000` API URLs | High | 6 frontend files |
| 2 | `dataSourceType` inferred from UI flag | Medium | `EmailBodyEditor.jsx` |
| 3 | Email drafts always POST (no update) | Medium | `EmailBodyEditor.jsx` |
| 4 | No Send Campaign UI | High | `EmailAutomationView.jsx`, `EmailAutomationView.css` |
| 5 | `form_submissions` missing `user_id` column | High | `supabase_schema.sql`, `server/index.js` |
| 7 | OAuth2 config fields empty on edit | Medium | `server/index.js`, `EmailAutomationView.jsx` |
| 8 | Activate endpoint returned partial draft | Medium | `server/index.js` |
| 9 | No submissions viewing endpoint | High | `server/index.js`, `DraftsView.jsx` |
| 10 | Hardcoded `localhost:5173` in `DraftsView` | High | `DraftsView.jsx` |
| 11 | Hardcoded `localhost:5173` in `ActiveLinksView` | High | `ActiveLinksView.jsx` |
| 12 | Form submission emails used global env vars | High | `emailService.js`, `server/index.js` |
| 13 | `SourcingView` used hardcoded mock data | High | `SourcingView.jsx` |
| 15 | Spinner CSS class mismatch | Low | `SourcingView.jsx` |

---

## Issue 1: Hardcoded `localhost:5000` API URLs

**Problem:** Six frontend files had hardcoded `http://localhost:5000` URLs instead of using an environment variable. This would break in any deployed environment.

**Fix:** Added `API_BASE_URL` constant to each file and replaced all hardcoded URLs.

**Files Changed:**
- `src/pages/DraftsView.jsx` — Lines 6-8, 84
- `src/pages/ActiveLinksView.jsx` — Lines 4-6, 104
- `src/pages/StudentTemplateBuilder.jsx` — Lines 3-6, 52
- `src/pages/EmployeeTemplateBuilder.jsx` — Lines 3-6, 52
- `src/pages/TeamTemplateBuilder.jsx` — Lines 4-6, 51, 71, 139
- `src/pages/PublicFormView.jsx` — Lines 3-5, 22, 55

**Pattern used:**
```js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

---

## Issue 2: `dataSourceType` Inferred from UI Flag

**Problem:** `EmailBodyEditor.jsx` inferred `dataSourceType` from the `showRosterModal` boolean flag. If a user opened the Roster Studio modal but then uploaded a file instead, the type would be incorrectly set to `roster_studio`.

**Fix:** Added explicit `dataSourceType` state variable that is set directly at the source of each action.

**File:** `src/pages/EmailBodyEditor.jsx`

**Changes:**
- **Line 59:** Added `const [dataSourceType, setDataSourceType] = useState('none');`
- **Line 154:** Set to `'upload'` in `handleFileUpload`
- **Line 229:** Set to `'roster_studio'` in `handleCloudFileSelect`
- **Line 257:** Used directly in save payload (replaced inference logic)

---

## Issue 3: Email Drafts Always Created New (No Update)

**Problem:** `handleSaveDraft` always sent a `POST` request to create a new draft, even when editing an existing one. This created duplicate drafts on every save.

**Fix:** Added `savedDraftId` state tracking. On first save, uses `POST` and stores the returned `_id`. On subsequent saves, uses `PUT /api/email/drafts/:id`.

**File:** `src/pages/EmailBodyEditor.jsx`

**Changes:**
- **Line 63:** Added `const [savedDraftId, setSavedDraftId] = useState(null);`
- **Lines 260-263:** Conditional method selection:
  ```js
  const url = savedDraftId
    ? `${API_BASE_URL}/api/email/drafts/${savedDraftId}`
    : `${API_BASE_URL}/api/email/drafts`;
  const method = savedDraftId ? 'PUT' : 'POST';
  ```
- **Line 274:** Stores returned draft ID: `if (data.draft?._id) setSavedDraftId(data.draft._id);`
- **Line 383:** Button label changes: "Save Draft" → "Update Draft" after first save

---

## Issue 4: No Send Campaign UI

**Problem:** The backend `POST /api/email/send` endpoint existed but there was no UI to trigger it. Users could create email drafts and configure SMTP settings but had no way to actually send campaigns.

**Fix:** Built a complete Send Campaign modal with CSV upload, manual recipient management, variable mapping, and result display.

**Files:**
- `src/EmailAutomationView.jsx` — State, handlers, and modal UI
- `src/EmailAutomationView.css` — All modal styling

**Features Added:**
- **Send button** on each draft card (paper plane icon)
- **Send Campaign modal** with:
  - Campaign name input (auto-filled from draft subject)
  - Draft info display
  - CSV upload via PapaParse — auto-detects email/name columns, imports all recipients
  - Manual recipient entry — add/remove recipients by hand
  - Variable mapping — auto-maps draft variables to CSV columns with manual override
  - Send button calling `POST /api/email/send` with draft ID, recipients, and mapped variables
  - Result screen showing sent/failed/total counts
  - Validation — blocks send if no config, no recipients, or no draft

**State Variables Added (lines 64-72):**
```js
const [showSendModal, setShowSendModal] = useState(false);
const [sendDraft, setSendDraft] = useState(null);
const [campaignName, setCampaignName] = useState('');
const [recipients, setRecipients] = useState([]);
const [csvHeaders, setCsvHeaders] = useState([]);
const [variableMapping, setVariableMapping] = useState({});
const [sending, setSending] = useState(false);
const [sendStatus, setSendStatus] = useState(null);
const [sendError, setSendError] = useState(null);
```

**Functions Added (lines 234-327):**
- `openSendModal(draft)` — Resets state and opens modal
- `handleCsvUpload(e)` — Parses CSV with PapaParse, auto-maps variables
- `addManualRecipient()` — Adds empty recipient row
- `updateManualRecipient(idx, field, value)` — Updates recipient field
- `removeRecipient(idx)` — Removes recipient
- `handleSendCampaign()` — Builds final recipients with mapped variables, calls API

---

## Issue 5: `form_submissions` Missing `user_id` Column

**Problem:** The `form_submissions` table had no `user_id` column. RLS relied on a subquery to `form_drafts` for authorization, meaning:
- Every submission query required a JOIN
- If a draft was deleted, submissions became orphaned (RLS wouldn't match)

**Fix:** Added `user_id` column to the table, updated RLS policy, and updated the backend insert to populate it.

**Files:**
- `server/supabase_schema.sql`
- `server/index.js`

**Schema Changes:**
- **Line 36:** Added `user_id UUID REFERENCES auth.users ON DELETE CASCADE`
- **Lines 102-106:** Updated RLS policy:
  ```sql
  CREATE POLICY "Users view own submissions" ON form_submissions
    FOR SELECT USING (
      user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM form_drafts WHERE form_drafts.draft_id = form_submissions.draft_id AND form_drafts.user_id = auth.uid())
    );
  ```
  Direct `user_id` check first, subquery as fallback for legacy rows.
- **Line 127:** Added index `idx_form_submissions_user_id`

**Backend Change:**
- **Line 302:** Insert now includes `user_id: draft.user_id`

**Migration Required:**
```sql
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);
```

---

## Issue 7: OAuth2 Config Fields Empty on Edit

**Problem:** `GET /api/email/config` didn't return `clientId` or `clientSecret`, so when editing OAuth2 config, the Client ID field was always empty and there was no indication a Client Secret was already saved.

**Fix:** Return `clientId` (not highly sensitive) and `hasClientSecret` boolean flag from both GET and PUT responses.

**Files:**
- `server/index.js` — Lines 864, 868 (GET), Lines 914, 918 (PUT)
- `src/EmailAutomationView.jsx` — Line 112 (populate clientId), Lines 595, 617, 626 (dynamic placeholders)

**Backend Response Now Includes:**
```json
{
  "clientId": "xxxx.apps.googleusercontent.com",
  "hasClientSecret": true
}
```

**Frontend Placeholders:**
- App Password: `•••••••• (saved — enter new to replace)` when `hasAppPassword` is true
- Client Secret: `•••••••• (saved — enter new to replace)` when `hasClientSecret` is true
- Refresh Token: `•••••••• (saved — enter new to replace)` when `hasRefreshToken` is true

---

## Issue 8: Activate Endpoint Returned Partial Draft

**Problem:** `PUT /api/drafts/:draftId/activate` returned only 4 fields (`draftId`, `title`, `status`, `expiresAt`). `DraftsView.jsx` replaced the entire draft in state with this partial object, losing `config`, `templateType`, and `createdAt`.

**Fix:** Updated the activate endpoint to return all 7 fields matching `GET /api/drafts`.

**File:** `server/index.js` — Lines 219-229

**Response now includes:**
```js
{
  draftId: updated.draft_id,
  title: updated.title,
  config: updated.config,
  templateType: updated.template_type,
  status: updated.status,
  expiresAt: updated.expires_at,
  createdAt: updated.created_at
}
```

---

## Issue 9: No Submissions Viewing Endpoint

**Problem:** Form submissions were saved to Supabase `form_submissions` but there was no API endpoint to fetch them. Users had no way to view submitted data.

**Fix:** Added two GET endpoints and a submissions viewer UI in `DraftsView`.

**Files:**
- `server/index.js` — Lines 323-376
- `src/pages/DraftsView.jsx` — Lines 127-156, 294-301, 348-385

**New Endpoints:**
- `GET /api/submissions` — All submissions for the logged-in user (scoped by `user_id`)
- `GET /api/submissions/:draftId` — Submissions for a specific draft

**Both return:**
```json
{
  "submissions": [
    {
      "submissionId": "uuid",
      "draftId": "draft-uuid",
      "title": "Form Title",
      "submittedData": { "field": "value" },
      "submittedAt": "2026-08-11T..."
    }
  ]
}
```

**Frontend Additions:**
- `fetchSubmissions(draftId)` function
- "View Submissions" button on active/expired drafts
- Submissions modal showing each submission with timestamp and all submitted data fields

---

## Issue 10: Hardcoded `localhost:5173` in `DraftsView`

**Problem:** `DraftsView.jsx` had hardcoded `Http://localhost:5173` and `http://localhost:5173` for the public form link, which would break in production.

**Fix:** Replaced with `window.location.origin`.

**File:** `src/pages/DraftsView.jsx` — Lines 284, 289

```js
// Before:
value={`Http://localhost:5173/form/${encodeURIComponent(selectedDraft.title)}/${selectedDraft.draftId}`}

// After:
value={`${window.location.origin}/form/${encodeURIComponent(selectedDraft.title)}/${selectedDraft.draftId}`}
```

---

## Issue 11: Hardcoded `localhost:5173` in `ActiveLinksView`

**Problem:** `ActiveLinksView.jsx` had the same hardcoded `localhost:5173` URL for live form links.

**Fix:** Replaced with `window.location.origin`.

**File:** `src/pages/ActiveLinksView.jsx` — Line 22

```js
// Before:
const liveLink = `http://localhost:5173/form/${encodeURIComponent(title)}/${draftId}`;

// After:
const liveLink = `${window.location.origin}/form/${encodeURIComponent(title)}/${draftId}`;
```

---

## Issue 12: Form Submission Emails Used Global Env Vars

**Problem:** `sendFormSubmissionEmail` always used `process.env.GOOGLE_*` environment variables to create the email transporter. It didn't use the per-user `EmailConfig` saved in MongoDB. If a recruiter configured their email via the UI, form submission notifications still tried to use server-level env vars (which may not exist).

**Fix:** Updated `emailService.js` to accept an optional `emailConfig` parameter and use the user's OAuth2 or App Password config. Updated the call site to look up the draft owner's `EmailConfig`.

**Files:**
- `server/utils/emailService.js` — Full rewrite of `createTransporter` and `sendFormSubmissionEmail`
- `server/index.js` — Line 310-311

**`createTransporter` now:**
1. If `emailConfig` provided and `authMethod === 'oauth2'`: uses user's OAuth2 credentials
2. If `emailConfig` provided and `authMethod === 'app_password'`: uses user's SMTP settings
3. Falls back to env vars if no config provided

**Call site update:**
```js
const ownerConfig = await EmailConfig.findOne({ ownerUid: draft.user_id }).catch(() => null);
sendFormSubmissionEmail(draft.title, submittedData, ownerConfig?.email || null, ownerConfig);
```

---

## Issue 13: `SourcingView` Used Hardcoded Mock Data

**Problem:** The entire `SourcingView.jsx` component used hardcoded arrays (`initialTemplates` with 3 fake templates, `talentPool` with 4 fake candidates). No real API calls were made — KPIs, template cards, and the talent pool table all showed fake data.

**Fix:** Replaced all mock data with real API calls to `GET /api/drafts` and `GET /api/submissions`.

**File:** `src/SourcingView.jsx`

**Changes:**
- Removed `initialTemplates` and `talentPool` hardcoded arrays
- Added `fetchData()` that calls both endpoints in parallel using `Promise.all`
- Template cards now render real drafts with actual status, fields (parsed from `config`), and real submission counts per draft
- "Talent Pool" table replaced with "Recent Submissions" showing real submission data
- KPIs compute from real data: `activeCount`, `totalSubmissions`, `submissions.length`
- Added loading spinner and empty states
- Copy link uses `window.location.origin` instead of hardcoded `ledgerai.app`

**Helper Functions Added:**
- `getDraftFields(draft)` — Parses draft config to extract enabled field labels
- `getSubmissionCount(draftId)` — Counts submissions for a specific draft
- `formatRelativeTime(dateStr)` — Formats timestamps as relative strings

---

## Issue 15: Spinner CSS Class Mismatch

**Problem:** `SourcingView.jsx` used `className="spin"` on the `Loader2` icon, but `SourcingView` doesn't import any CSS file that defines a `.spin` animation. `App.css` (imported by `App.jsx`) defines `.animate-spin`, not `.spin`.

**Fix:** Changed `className="spin"` to `className="animate-spin"`.

**File:** `src/SourcingView.jsx` — Line 142

---

## Deferred Issues

### Issue 6: `candidates` Table Has No API Endpoints
The `candidates` table in Supabase has RLS and indexes defined but no API endpoints in `server/index.js`. This is planned for a future phase to build `/api/candidates` CRUD endpoints and a frontend view for tracking sourcing candidates.

---

## Verification

All changes were verified with:
```bash
npx vite build
```

Result: **Build passes cleanly** with no errors. Only standard chunk size warning present.
