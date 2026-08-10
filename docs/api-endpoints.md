# API Endpoints — New & Modified

**Date:** August 11, 2026  
**Scope:** Endpoints added or modified during the data integrity fix pass.

---

## New Endpoints

### `GET /api/submissions`

Fetch all form submissions for the authenticated user.

**Auth:** `verifyToken` (Bearer JWT)

**Query Params:** None

**Response (200):**
```json
{
  "submissions": [
    {
      "submissionId": "uuid-string",
      "draftId": "draft-uuid",
      "title": "Senior Frontend Engineer Form",
      "submittedData": {
        "fullName": "Jane Doe",
        "email": "jane@example.com",
        "github": "janedoe"
      },
      "submittedAt": "2026-08-11T01:23:45.000Z"
    }
  ]
}
```

**Implementation:** `server/index.js` lines 323-346  
**Supabase query:** `form_submissions` filtered by `user_id = req.user.uid`, ordered by `submitted_at DESC`

---

### `GET /api/submissions/:draftId`

Fetch all submissions for a specific draft.

**Auth:** `verifyToken` (Bearer JWT)

**URL Params:**
- `draftId` — The draft's UUID

**Response (200):**
```json
{
  "submissions": [
    {
      "submissionId": "uuid-string",
      "draftId": "draft-uuid",
      "title": "Form Title",
      "submittedData": { ... },
      "submittedAt": "2026-08-11T..."
    }
  ]
}
```

**Implementation:** `server/index.js` lines 352-376  
**Supabase query:** `form_submissions` filtered by `draft_id` AND `user_id`, ordered by `submitted_at DESC`

---

## Modified Endpoints

### `PUT /api/drafts/:draftId/activate`

**Change:** Now returns the full draft object (7 fields) instead of a partial object (4 fields).

**Before:**
```json
{
  "draft": {
    "draftId": "...",
    "title": "...",
    "status": "active",
    "expiresAt": "..."
  }
}
```

**After:**
```json
{
  "draft": {
    "draftId": "...",
    "title": "...",
    "config": { ... },
    "templateType": "student",
    "status": "active",
    "expiresAt": "...",
    "createdAt": "..."
  }
}
```

**Implementation:** `server/index.js` lines 219-229

---

### `GET /api/email/config`

**Change:** Now returns `clientId` (actual value) and `hasClientSecret` boolean.

**Response (200):**
```json
{
  "config": {
    "email": "user@gmail.com",
    "authMethod": "oauth2",
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "clientId": "xxxx.apps.googleusercontent.com",
    "isActive": true,
    "hasAppPassword": false,
    "hasRefreshToken": true,
    "hasClientSecret": true
  }
}
```

**Implementation:** `server/index.js` lines 858-870

---

### `PUT /api/email/config`

**Change:** Response now matches the updated GET response — includes `clientId` and `hasClientSecret`.

**Implementation:** `server/index.js` lines 907-919

---

### `POST /api/forms/:draftId/submit`

**Change:** Insert now includes `user_id` from the draft owner. Also passes the owner's `EmailConfig` to `sendFormSubmissionEmail`.

**Before:**
```js
.insert({
  submission_id: submissionId,
  draft_id: draft.draft_id,
  title: draft.title,
  submitted_data: submittedData
});
sendFormSubmissionEmail(draft.title, submittedData, null);
```

**After:**
```js
.insert({
  submission_id: submissionId,
  draft_id: draft.draft_id,
  user_id: draft.user_id,
  title: draft.title,
  submitted_data: submittedData
});
const ownerConfig = await EmailConfig.findOne({ ownerUid: draft.user_id }).catch(() => null);
sendFormSubmissionEmail(draft.title, submittedData, ownerConfig?.email || null, ownerConfig);
```

**Implementation:** `server/index.js` lines 297-311

---

## Existing Endpoints (Unchanged but Referenced)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/email/send` | POST | verifyToken | Send email campaign |
| `/api/email/drafts` | GET | verifyToken | List email drafts |
| `/api/email/drafts` | POST | verifyToken | Create email draft |
| `/api/email/drafts/:id` | GET | verifyToken | Get single email draft |
| `/api/email/drafts/:id` | PUT | verifyToken | Update email draft |
| `/api/email/drafts/:id` | DELETE | verifyToken | Delete email draft |
| `/api/email/config` | GET | verifyToken | Get email config |
| `/api/email/config` | PUT | verifyToken | Save email config |
| `/api/email/config` | DELETE | verifyToken | Delete email config |
| `/api/email/test` | POST | verifyToken | Send test email |
| `/api/email/campaigns` | GET | verifyToken | List campaigns |
| `/api/email/campaigns/:id` | GET | verifyToken | Get single campaign |
| `/api/drafts` | GET | verifyToken | List form drafts |
| `/api/drafts` | POST | verifyToken | Create form draft |
| `/api/drafts/:draftId` | DELETE | verifyToken | Delete form draft |
| `/api/drafts/:draftId/activate` | PUT | verifyToken | Activate form draft |
| `/api/forms/:draftId` | GET | None | Public form view |
| `/api/forms/:draftId/submit` | POST | None | Public form submission |
| `/api/submissions` | GET | verifyToken | **NEW** — All user submissions |
| `/api/submissions/:draftId` | GET | verifyToken | **NEW** — Draft-specific submissions |
