# 06 — Email Automation, Scheduling & RFC 8058 Compliance

> **Status:** Production-Ready | **Files:** [`src/pages/EmailBodyEditor.jsx`](../../src/pages/EmailBodyEditor.jsx), [`src/EmailAutomationView.jsx`](../../src/EmailAutomationView.jsx), [`src/pages/ScheduleView.jsx`](../../src/pages/ScheduleView.jsx), [`src/pages/SentView.jsx`](../../src/pages/SentView.jsx), [`server/utils/emailCampaignFlow.js`](../../server/utils/emailCampaignFlow.js), [`server/scheduler.js`](../../server/scheduler.js)

---

## 1. Research & Problem Statement
- Bulk recruiting outreach requires variable substitution (`{{first_name}}`, `{{company}}`) bound to spreadsheet/CSV columns, reliable background delivery that survives server restarts, multi-account sender support (SMTP & Gmail OAuth2), and strict RFC 8058 one-click unsubscribe compliance.

---

## 2. Architecture & Design Plan
1. **Compose & Bind (`EmailBodyEditor.jsx` + `src/utils/templateBind.js`):**
   - Rich-text HTML composer sanitized with `DOMPurify` on render sinks.
   - Extracts `{{variables}}` and auto-maps headers from uploaded CSV/XLSX or saved Roster Studio spreadsheets.
2. **Multi-Account Transport (`server/models/EmailAccount.js` & `server/utils/emailAccount.js`):**
   - Stores per-user SMTP or Gmail OAuth2 credentials encrypted with **AES-256-GCM** (`server/utils/crypto.js`).
3. **Campaign Execution & Worker Resilience (`server/utils/emailCampaignFlow.js` & `server/scheduler.js`):**
   - Freezes previewed content at queue time (`E43`), prevents duplicate sends via `requestId` idempotency (`E42`) and atomic worker claims (`E48`), and recovers interrupted campaigns on startup (`recoverInterruptedCampaigns()`).
   - Scheduled campaigns persist in MongoDB `agendaJobs` via Agenda.js.
4. **Compliance & Logging (`EmailSuppression.js`, `email_send_log`):**
   - Signs campaign-specific unsubscribe URLs and attaches RFC 8058 `List-Unsubscribe` / `List-Unsubscribe-Post` headers.
   - Records every campaign run in Supabase `email_send_log` (unique index on `(user_id, campaign_id)`).

---

## 3. API Endpoints & Testing
- **Drafts:** `POST/GET /api/email/drafts`, `GET/PUT/DELETE /api/email/drafts/:id`
- **Accounts:** `GET/POST /api/email/accounts`, `PUT/DELETE /api/email/accounts/:id`, `PUT /api/email/accounts/:id/default`, `POST /api/email/accounts/:id/test`
- **Campaigns & Scheduling:** `POST /api/email/send`, `POST /api/email/schedule`, `GET /api/email/scheduled`, `DELETE /api/email/schedule/:campaignId`, `GET /api/email/campaigns/:id`, `POST /api/email/campaigns/:id/retry`
- **Compliance & Logs:** `GET/POST/DELETE /api/email/suppressions`, `POST /api/email/unsubscribe`, `GET/POST /api/email/unsubscribe/one-click`, `GET /api/email/send-log`
- **Tests:** [`server/tests/email.test.js`](../../server/tests/email.test.js), [`server/tests/emailService.test.js`](../../server/tests/emailService.test.js), [`server/tests/emailTemplate.test.js`](../../server/tests/emailTemplate.test.js), [`server/tests/restartCampaign.integration.test.js`](../../server/tests/restartCampaign.integration.test.js).
