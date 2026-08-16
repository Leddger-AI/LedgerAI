# Bug Fixes & Enhancements Summary

**Date:** August 15–16, 2026
**Scope:** A systematic pass through the repo's open bug/enhancement backlog (issues #17–#33), fixing each with a dedicated branch, PR, and test coverage.
**Result:** 10 issues fixed across 10 merged PRs, 1 feature shipped, 2 issues closed as already-resolved/duplicate, 38 new backend tests added (145 → 183 passing).

---

## Summary

| # | Issue | Type | PR | Files |
|---|-------|------|----|-------|
| [#17](https://github.com/Leddger-AI/LedgerAI/issues/17) | scheduler.js used deprecated `EmailConfig` instead of `EmailAccount` | Bug | [#43](https://github.com/Leddger-AI/LedgerAI/pull/43) | `server/scheduler.js`, `server/utils/emailAccount.js` (new), `server/models/EmailCampaign.js`, `server/index.js` |
| [#18](https://github.com/Leddger-AI/LedgerAI/issues/18) | Form submission notification email used deprecated `EmailConfig` | Bug | [#44](https://github.com/Leddger-AI/LedgerAI/pull/44) | `server/index.js`, `server/utils/emailService.js` |
| [#19](https://github.com/Leddger-AI/LedgerAI/issues/19) | `emailService.js` had no decrypt step for encrypted `EmailAccount` credentials | Bug | [#45](https://github.com/Leddger-AI/LedgerAI/pull/45) | `server/utils/emailService.js`, `server/index.js` |
| [#20](https://github.com/Leddger-AI/LedgerAI/issues/20) | Debug `console.log` leaked candidate PII in `ExcelCampaignGrid.jsx` | Bug | [#46](https://github.com/Leddger-AI/LedgerAI/pull/46) | `src/ExcelCampaignGrid.jsx` |
| [#21](https://github.com/Leddger-AI/LedgerAI/issues/21) | `scheduler.test.js` mocked the wrong model | Bug | *(resolved by #43, closed manually)* | `server/tests/scheduler.test.js` |
| [#22](https://github.com/Leddger-AI/LedgerAI/issues/22) | Feature: OTP verification before Delete Data / Delete Account | Enhancement | [#47](https://github.com/Leddger-AI/LedgerAI/pull/47) | `server/utils/otp.js` (new), `server/supabase_schema.sql`, `server/utils/emailTemplates/otp.html` (new), `server/index.js`, `src/settings/SecuritySection.jsx` |
| [#23](https://github.com/Leddger-AI/LedgerAI/issues/23) | `DepartmentsSection` sent no auth header, errors silently swallowed | Bug | [#48](https://github.com/Leddger-AI/LedgerAI/pull/48) | `src/settings/DepartmentsSection.jsx` |
| [#24](https://github.com/Leddger-AI/LedgerAI/issues/24) | `ProfileSection` timezone select not saved or persisted | Bug | [#49](https://github.com/Leddger-AI/LedgerAI/pull/49) | `src/settings/ProfileSection.jsx`, `server/supabase_schema.sql`, `server/index.js` |
| [#25](https://github.com/Leddger-AI/LedgerAI/issues/25) | `SecuritySection` error banner used the wrong icon | Bug | [#50](https://github.com/Leddger-AI/LedgerAI/pull/50) | `src/settings/SecuritySection.jsx` |
| [#32](https://github.com/Leddger-AI/LedgerAI/issues/32) | `fetchGitHubRepos` returned a different shape on cache hit vs miss | Bug | [#51](https://github.com/Leddger-AI/LedgerAI/pull/51) | `server/utils/githubAnalyzer.js` |
| [#33](https://github.com/Leddger-AI/LedgerAI/issues/33) | `TemplateData` pre-save hook incompatible with Mongoose 9.x | Bug | *(already fixed in PR #29, closed)* → same pattern found in `GoogleDriveToken.js`, fixed via [#52](https://github.com/Leddger-AI/LedgerAI/pull/52) | `server/models/GoogleDriveToken.js` |

All 10 PRs above are **merged**. Every fix shipped with new or updated automated tests — none relied on manual verification alone.

---

## Issue #17 — scheduler.js used deprecated EmailConfig instead of EmailAccount

**Problem:** `server/scheduler.js`'s `"send email campaign"` Agenda job queried the old single-account `EmailConfig` model. Any user who only had an `EmailAccount` record (the multi-account model, encrypted credentials) got `No email config for user X`, and their scheduled campaign silently failed.

**Fix:** Extracted `buildTransporterFromAccount()` and a new `resolveEmailAccount()` (`isDefault` → earliest-created fallback) into a shared `server/utils/emailAccount.js`, used by both `scheduler.js` and `index.js`. Added an `accountId` field to `EmailCampaign` so an explicitly-chosen (non-default) account at schedule time is honored at send time instead of being re-guessed.

**Tests:** Rewrote `scheduler.test.js` to actually invoke the job handler body (the old tests only checked `agenda.define()`/`schedule()` call shape) — 12 tests total, 4 new. This also incidentally resolved #21.

---

## Issue #18 — Form submission email used deprecated EmailConfig

**Problem:** `POST /api/forms/:draftId/submit`'s notification email used the same deprecated `EmailConfig` lookup. Recruiters without a legacy row got a fallback env-var sender; migrated recruiters got a frozen, potentially-stale credential snapshot.

**Fix:** Routed through the `resolveEmailAccount()`/`buildTransporterFromAccount()` helpers from #17 instead of `emailService.js`'s plain-text `createTransporter()`. Extracted `buildSubmissionEmailHtml()` so the email content can't drift between the new and legacy fallback paths.

**Tests:** 2 new tests in `api.test.js` exercising the real send path (mocking only `nodemailer`).

---

## Issue #19 — emailService.js had no decrypt step for encrypted credentials

**Problem:** `createTransporter()`'s `emailConfig` branch used `appPassword`/`refreshToken`/`clientSecret` as plain strings, with no `decrypt()` — unsafe if ever handed an `EmailAccount` document (encrypted fields).

**Fix:** Traced its only caller (post-#18, always passes `null`) and found the branch had become fully unreachable dead code. Removed it rather than patching it, avoiding a second, duplicate account→transporter implementation. Simplified `sendFormSubmissionEmail`'s signature to drop the now-meaningless `recruiterEmail`/`emailConfig` parameters.

**Tests:** New `emailService.test.js` — the module's first-ever real (unmocked) test coverage, 5 tests.

---

## Issue #20 — Debug console.log leaked candidate PII

**Problem:** `console.log('Bulk campaign payload:', nonBlankRows)` in `ExcelCampaignGrid.jsx` printed the full validated candidate payload (emails, per-row variables) to the browser console on every "Launch Campaign" click.

**Fix:** Deleted the line and its explanatory comment. Pure removal, no behavior change.

---

## Issue #21 — scheduler.test.js mocked the wrong model

Resolved as a side effect of #17/PR #43 — the rewritten test file mocks `EmailAccount`, not `EmailConfig`. Closed manually with an explanatory comment since GitHub didn't auto-link it.

---

## Issue #22 — OTP verification for Delete Data / Delete Account

**Problem:** The two irreversible account actions in Security settings only required typing the account's own email — visible in the UI, so a hijacked session token alone was enough to wipe an account.

**Feature:** A one-time 6-digit code, emailed to the account owner, required before either destructive action proceeds. Implemented with several deliberate deviations from the issue's own (weaker) proposed design:

- **Storage:** A Supabase table (`otp_challenges`), not an in-memory `Map` or MongoDB. The `(user_id, action)` unique constraint means the table can never hold more than 2 rows per user, so there's no `setInterval` sweep needed — the issue's own proposed design would have added a permanent recurring timer inside the app's 512MB Render instance and lost every pending code on restart.
- **Hashing:** HMAC-SHA256 (`crypto.js#hmacHash`, new), not the existing reversible AES `encrypt()`/`decrypt()` — an OTP only ever needs comparison, never recovery.
- **Email template:** Reused and adapted `src/emailtemplate.js/OTP.html`, a fully-designed branded template that existed but was never wired up anywhere, copied into `server/utils/emailTemplates/otp.html` so the backend doesn't depend on the frontend's directory layout at runtime.
- **Frontend:** One state object per action and a single 6-digit numeric input, not six flat booleans and six separate digit boxes.
- Rate limiting (60s resend cooldown) and lockout (5 wrong attempts → 15 min) both derive from the same storage record.

**New backend surface:** `POST /api/user/send-otp`; `DELETE /api/user/data` and `DELETE /api/user/account` now require and verify `otp`.

**Tests:** New `otp.test.js`, 15 tests — the real OTP logic (hashing, rate-limit, lockout) is not mocked, only the outbound email transport is.

---

## Issue #23 — DepartmentsSection sent no auth header

**Problem:** `fetchDepartments()`/`handleSave()` called `/api/user/departments` with no `Authorization` header at all, even though the backend requires `verifyToken`. Every load and save was a silent 401 — worse than filed, since neither function even branched on `!res.ok`, so failures never surfaced anywhere.

**Fix:** Added the missing header via `getAuthToken()` (the codebase's dominant convention — the issue's own suggested `getCurrentSession()`/`access_token` approach would have sent `Bearer undefined` due to a field-name mismatch). Added a real `errorMsg` state; previously a save failure was shown inside the *success*-styled green banner.

---

## Issue #24 — ProfileSection timezone not saved or persisted

**Problem:** The timezone `<select>` used `defaultValue=""` with no state binding; `handleSave` never sent it.

**Bigger finding:** Fixing the select alone would have done nothing — **every** auth call in this file (`fetchProfile`, `handleAvatarUpload`, `handleAvatarRemove`, `handleSave`) read `session?.access_token` from `getCurrentSession()`, which actually returns `accessToken` (camelCase). `fetchProfile` silently never reached the backend at all; the other three sent `Bearer undefined`. Verified this wasn't a wider problem — `App.jsx`'s similar-looking `session.access_token` reference operates on the *raw* Supabase session shape (correctly snake_case there).

**Fix:** All four call sites switched to `getAuthToken()`. Added `timezone` state bound to the select, persisted through `fetchProfile`/`handleSave`. Backend: added a `timezone` column to the `profiles` table (`CREATE TABLE` + idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`), and `GET`/`PUT /api/user/profile` now read/write it.

**Tests:** New `Profile API` suite in `api.test.js`, 4 tests — no coverage existed for this endpoint before.

---

## Issue #25 — SecuritySection error banner used the wrong icon

**Problem:** Used `AlertTriangle` while `ProfileSection`, `EmailSection`, and `IntegrationsSection` all use `AlertCircle` for the same error-banner purpose.

**Fix:** Two-line swap. `AlertTriangle` stays imported and in place for the (unrelated, intentional) Danger Zone section title.

---

## Issue #32 — fetchGitHubRepos returned inconsistent shape (cached vs uncached)

**Problem:** `setCached()` stored the bare `simplified` repos array, but the function's fresh-fetch path returned `{ repos: simplified }`. The caller destructures `const { repos, error } = await fetchGitHubRepos(username)` — on a cache hit this destructured an array, so `repos` came back `undefined`, and every cached GitHub profile was marked `'No repos'` for the full 1-hour cache TTL after its first successful lookup. High severity, and present since Phase 3 (PR #28).

**Fix:** Cache the exact object that gets returned (`const result = { repos: simplified }; setCached(...); return result;`) so both paths are identical by construction.

**Tests:** New `fetchGitHubRepos` suite, 4 tests — `fetchGitHubRepos` was exported but had zero prior coverage (existing tests only covered the pure `classifyRole`/`extractTechStack` functions), which is exactly how this shipped unnoticed through two merged PRs. Verified the regression test actually catches the bug by reverting the fix locally and confirming it failed.

---

## Issue #33 — TemplateData pre-save hook incompatible with Mongoose 9.x

**Problem as filed:** `TemplateData.js`'s `pre('save', function (next) {...; next(); })` — Mongoose 9.x no longer passes `next` to `pre('save')` hooks, throwing `TypeError: next is not a function` on every save.

**Status:** Already fixed in PR #29 (Phase 4) before this pass began. Verified on `main` and closed the issue as resolved.

**Found while verifying it:** The identical pattern, unfixed, in `server/models/GoogleDriveToken.js`. Checked real-world impact before treating it as urgent — every call site touching this model uses `findOneAndUpdate`/`updateOne`/`findOne`/`deleteOne`, never `.save()`/`.create()`, so the hook is currently a dormant landmine rather than a live bug. Fixed it proactively with the same one-line change, since any future refactor to use `.save()` would hit it with no obvious connection to the cause.

**Tests:** New `googleDriveToken.test.js`, 4 tests — since nothing in the app calls `.save()`/`.create()` on this model, the tests do so directly to actually exercise the fixed code path. Verified they fail against the unfixed hook before confirming the fix.

---

## Test coverage growth

| Stage | Backend tests passing |
|---|---|
| Before this pass (baseline) | 145 |
| After #17 | 149 |
| After #18 | 151 |
| After #19 | 156 |
| After #22 (OTP feature) | 171 |
| After #24 | 175 |
| After #32 | 179 |
| After #33 (GoogleDriveToken) | **183** |

Every fix included baseline verification before changing anything, real (non-mocked, where practical) test coverage for the fixed logic, and — for the correctness bugs — explicit confirmation that the new test actually fails against the old code before being trusted as a valid regression guard.

## Pattern across this backlog

Five of the ten fixed issues (#17, #18, #19, #21, and the `TemplateData`/`GoogleDriveToken` pair in #33) trace back to the same root cause repeating in slightly different forms: code migrated from one data model or auth pattern to another (`EmailConfig` → `EmailAccount`, Firebase → Supabase auth, Mongoose callback-style hooks → promise-style), with a sibling file or code path missed each time. Two more (#23, #24) were a third variant of the same class — a wrapped session helper's field name assumed incorrectly. Where a fix touched shared logic, it was extracted into a reusable module (`emailAccount.js`, `otp.js`) rather than left duplicated, specifically to reduce the chance of the next migration missing a spot the same way.
