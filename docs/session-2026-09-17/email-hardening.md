# Email Hardening (P0-1, P0-2, P1a)

## P0-1 — Dead config API (`src/EmailAutomationView.jsx`)

`GET/PUT /api/email/config` → `/api/email/accounts` (default/first);
per-account test URL; `accountId` on send/schedule; sender `<select>`;
`openSendModal` backfills default. Settings `EmailSection.jsx` was the
correct reference implementation.

## P0-2 — Send hardening (`server/`)

- New `utils/emailTemplate.js`: `escapeRegExp`, `substituteTemplateVars`,
  `isValidEmail` (shared by `index.js` + `scheduler.js`).
- `POST /send`, `/schedule`: ObjectId checks, email validation, 500/batch
  cap, `accountId` format check.
- All email `:id` routes: invalid id → 400 (was CastError 500).
- `startupCheck.js`: `ENCRYPTION_KEY` required + 32-byte-hex validator.

## P1a — Queue, limits, suppression

- `async:true` or >100 recipients → Agenda now, `202 queued`.
- Daily cap 2000/24h per user → `429` (matches Workspace ceiling).
- `EmailSuppression` (unique owner+email; unsubscribed/bounced/complained/
  manual); filtered pre-create with `suppressedCount`; scheduler skips with
  `failed/suppressed` status.
- `List-Unsubscribe` + `List-Unsubscribe-Post` headers and footer link;
  public `POST /unsubscribe` (campaignId → owner); CRUD endpoints;
  delete-cascade extended.
