# Email Feature Audit (morning)

Question: "test the email feature how good it is working, deep research, bugs?"

## Coverage

Backend `server/index.js:1029-1588` (drafts, accounts, send, schedule,
campaigns, send-log, suppressions), `utils/emailService.js`,
`utils/emailAccount.js`, `utils/crypto.js`, `scheduler.js` Agenda job,
frontend `EmailAutomationView.jsx` (925 lines), `EmailBodyEditor.jsx`,
`settings/EmailSection.jsx`, tests `email.test.js` (40), `emailService.test.js` (5).

## Verdict at Audit Time

Mocked tests 40/40 pass, real-world ~6/10: 1 critical UI break + 6 medium
backend issues (full table in chat; fixes in `email-hardening.md`).

## Bug Classes Found

1. **Dead API**: UI `GET/PUT /api/email/config` vs backend `/api/email/accounts`.
2. **Regex injection**: `new RegExp('{{\\s*'+key+'\\s*}}')` unsanitized; leftovers mailed raw.
3. **No validation/limits**: any `r.email` accepted; sequential await loop blocks HTTP (Render timeout); Gmail 500/day throttle ignored.
4. **Multi-account dead**: `accountId` never sent from Automation UI.
5. **CastError 500s**: malformed ObjectIds on all `:id` routes.
6. **Crypto**: `ENCRYPTION_KEY` missing → 500; `decrypt null` → obscure Nodemailer fail; `clientId` plaintext.
7. **OAuth**: hardcoded `oauthplayground` redirect; deprecated `getAccessToken(cb)`.
8. **Notifications**: `sendFormSubmissionEmail` fire-and-forget to self only; raw HTML interpolation (XSS).
9. **Legacy dual system**: `EmailConfig` plaintext vs `EmailAccount` encrypted + racy migration.
10. **Preview bug**: list excludes `bodyHtml` but grid preview reads it → always "No content".
11. **Mapping loss**: header mismatch → empty vars → raw `{{}}` sent, no warning.
12. **Tests mock everything**: SMTP/OAuth/Agenda/RLS untested in reality.
