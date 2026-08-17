# Bug Fixes & Enhancements Summary

**Date:** August 15–16, 2026
**Scope:** A systematic pass through the repo's open bug/enhancement backlog (issues #17–#40), fixing each with a dedicated branch, PR, and test coverage.
**Result:** 14 PRs (#43–#52, #54–#56, #58) fixing 13 issues plus one bonus fix found while verifying another (#33's `GoogleDriveToken` sibling); 2 features shipped (#22, #35); 2 issues closed without new code because their fixes already existed elsewhere (#21, #33); 1 additional fix (#40) implemented on the Phase 5 branch, whose PR ([#30](https://github.com/Leddger-AI/LedgerAI/pull/30)) was closed without merging — see its row below. 54 new backend tests added in total — 145 → 188 on `main`, plus 11 more sitting on the separate, unmerged `feature/analytics-phase5` branch.

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
| [#34](https://github.com/Leddger-AI/LedgerAI/issues/34) | `getOverviewStats` internal variables named `completionRate*` but computed a field count, not a rate | Enhancement | [#54](https://github.com/Leddger-AI/LedgerAI/pull/54) | `server/utils/analyticsUtils.js` |
| [#35](https://github.com/Leddger-AI/LedgerAI/issues/35) | GitHub API calls had no auth token or rate-limit protection (60 req/hr shared across all users) | Enhancement | [#58](https://github.com/Leddger-AI/LedgerAI/pull/58) | `server/utils/githubAnalyzer.js`, `README.md`, `docs/deployment/production_deployment.md` |
| [#36](https://github.com/Leddger-AI/LedgerAI/issues/36) | Raw submissions table columns came from the first submission on the page only | Bug | [#55](https://github.com/Leddger-AI/LedgerAI/pull/55) | `src/pages/TemplateDetailAnalytics.jsx` |
| [#39](https://github.com/Leddger-AI/LedgerAI/issues/39) | `TemplateDetailAnalytics` didn't reset state when `draftId` changed | Bug | [#56](https://github.com/Leddger-AI/LedgerAI/pull/56) | `src/pages/TemplateDetailAnalytics.jsx` |
| [#40](https://github.com/Leddger-AI/LedgerAI/issues/40) | No rate limiting or size cap on analytics export endpoints (OOM risk) | Enhancement | *commit on Phase 5 branch — PR [#30](https://github.com/Leddger-AI/LedgerAI/pull/30) was closed without merging* | `server/middleware/exportRateLimit.js` (new), `server/utils/exportUtils.js` |

Every PR above is **merged** except two: #58 is open, pending your merge like the rest of this batch; #40's fix is a commit sitting on the `feature/analytics-phase5` branch whose PR (#30) was closed — not merged — after the commit was pushed, so that fix isn't heading to `main` unless #30 is reopened or a fresh PR is opened from that branch. Every fix shipped with new or updated automated tests — none relied on manual verification alone.

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

## Issue #34 — getOverviewStats' internal variables were misleadingly named

**Problem:** `getOverviewStats()` computed an average *field count* per template but named its internal variables `completionRates`/`avgCompletionRate`. The returned API field was already correctly named `avgFieldsPerTemplate`, matching the frontend's "Avg Fields/Template" label — this was purely an internal-readability issue, not a behavioral one.

**Why a rename, not a real completion-rate calculation (the issue's own alternative suggestion):** checked first — a genuine per-field completion rate already exists and is tested at the template-detail level (`getTemplateDetail`'s `completionRate`). Calculating a second one here would have duplicated that, not fixed a gap; this stat was never meant to be a completion rate.

**Fix:** Pure rename — `completionRates` → `fieldCounts`, `avgCompletionRate` → `avgFieldsPerTemplate` (now matching the return key directly). Zero behavior change; existing test coverage for this exact field continued to pass unchanged.

---

## Issue #35 — GitHub API calls had no auth token or rate-limit protection

**Problem:** `fetchGitHubRepos()` called the GitHub API unauthenticated — capped at 60 requests/hour, shared across every server IP and every user. A single recruiter analyzing a couple of templates with 30+ candidate profiles could exhaust the entire server's hourly quota for everyone else.

**A correction to this project's own docs, checked before implementing:** `docs/analytics/phase3-github-role-techstack-analysis.md` names *"the existing GitHub App integration (`GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`)"* as the intended future fix. Those env vars don't exist anywhere in the active Node backend — only `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` in the legacy, inactive Rust backend, wired to an unrelated candidate-consent OAuth flow. More fundamentally, a GitHub App's elevated rate limit is scoped to whoever installed it — it can't look up an arbitrary third party's public repos at a higher limit, which is exactly what this feature needs. A plain Personal Access Token, as the issue itself proposed, is the architecturally correct tool here.

**Fix:** Conditionally sends `Authorization: token ${GITHUB_TOKEN}` (60/hr → 5,000/hr when set); a global 1-second throttle between real outbound GitHub calls (cache hits stay instant, and it's global rather than per-user since the constraint is per-server-IP); and a rate-limit error message built from GitHub's own `Retry-After`/`X-RateLimit-Reset` response headers instead of a bare `"Rate limited"` string.

**Tests:** 5 new tests — auth header present/absent, `Retry-After`-based message, `X-RateLimit-Reset` fallback message, and throttling verified by timing two consecutive uncached calls.

---

## Issue #36 — Raw submissions table columns came from the first submission only

**Problem:** `allSubmissionKeys` was built from `Object.keys(submissions[0].submittedData)` — a column only appeared if the first submission on the current page happened to have that field filled. Optional fields filled by later submissions never got a column, and since "first submission" changes per page, the column set itself changed as users paginated.

**Fix:** Switched to `detail.enabledFields` — the template's configured field schema, already fetched by this component and already used elsewhere in it. Unlike a per-page union of keys (the issue's other suggested fix), this is independent of which submissions are on the current page, fixing both symptoms at once. One-line change; row rendering already tolerated a missing value per cell.

---

## Issue #39 — TemplateDetailAnalytics didn't reset state when draftId changed

**Problem:** The fetch effect never reset `error`, `githubData`, `githubError`, or `submissionsPage` — stale state from a previous template could show through for a new one.

**Reachability check:** traced whether this could actually happen via the live UI before fixing it. It couldn't — `TemplateDetailAnalytics`'s only caller never changes `draftId` on a mounted instance; every path between templates goes through the list view in between, which already discards all state via unmount/remount. Fixed anyway, for the same reason as #33's `GoogleDriveToken` fix: zero-risk today, but a plausible near-future "next/previous template" control would make it a live, confusing bug with no obvious link back to the cause.

**Also fixed:** `driveResult`, the same staleness class, found while checking every piece of state in the component — not mentioned in the original issue.

---

## Issue #40 — No rate limiting or size cap on analytics export endpoints

**Different from every other entry above:** this issue's code (`GET /api/analytics/export/*`, `GET /api/analytics/templates/:draftId/export.*`) doesn't exist on `main` — it's part of Phase 5 ([PR #30](https://github.com/Leddger-AI/LedgerAI/pull/30)), which is still open and was ~40 commits behind `main` when this fix was implemented. The fix landed as an additional commit directly on that branch, not a new PR, and won't reach `main` until #30 merges.

**Problem:** The 5 export endpoints fetched up to 10,000 submissions into memory and built the full CSV/JSON string before sending, with no rate limiting anywhere in the app — concurrent large exports from multiple users could spike memory on the 512MB Render instance.

**Fix (2 of the issue's 3 suggested mitigations; the third deferred):**
- **Per-user rate limit** — a lightweight in-memory 30s cooldown (`server/middleware/exportRateLimit.js`, new) across all 5 export routes. Not a new `express-rate-limit` dependency: doesn't need to survive a restart, and per-user (not per-IP) fits since these are authenticated endpoints.
- **Lowered submission cap** — 10,000 → 5,000 (`MAX_EXPORT_SUBMISSIONS`). When the true total exceeds the cap, CSV exports get an appended note and JSON exports get `truncated`/`totalAvailable` fields, so a capped export is never silently incomplete.
- **Deferred:** streaming responses instead of building the full string in memory. The issue's own math (10k rows × ~1KB ≈ 10MB) shows today's realistic ceiling is manageable even unstreamed; streaming would mean restructuring the multi-section CSV builder into a different architecture, worth doing only if real usage outgrows what the rate limit + cap can bound safely.

**Tests:** New `export.test.js`, 11 tests, on the `feature/analytics-phase5` branch — 104 → 115 passing *on that branch*, a separate count from `main`'s 183 since the branch predates most of this session's other work.

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
| After #33 (GoogleDriveToken) | 183 |
| After #34, #36, #39 | 183 *(unchanged — a pure rename and two frontend-only fixes with no new backend test surface)* |
| After #35 | **188** |

Every fix included baseline verification before changing anything, real (non-mocked, where practical) test coverage for the fixed logic, and — for the correctness bugs — explicit confirmation that the new test actually fails against the old code before being trusted as a valid regression guard.

**Separately, on the still-open `feature/analytics-phase5` branch** (issue #40 — not part of the `main`-branch progression above, since that branch predates most of this work): 104 → **115** passing after the export rate-limit/cap fix.

## Pattern across this backlog

Five of the ten early-fixed issues (#17, #18, #19, #21, and the `TemplateData`/`GoogleDriveToken` pair in #33) trace back to the same root cause repeating in slightly different forms: code migrated from one data model or auth pattern to another (`EmailConfig` → `EmailAccount`, Firebase → Supabase auth, Mongoose callback-style hooks → promise-style), with a sibling file or code path missed each time. Two more (#23, #24) were a third variant of the same class — a wrapped session helper's field name assumed incorrectly. Where a fix touched shared logic, it was extracted into a reusable module (`emailAccount.js`, `otp.js`) rather than left duplicated, specifically to reduce the chance of the next migration missing a spot the same way.

A different pattern shows up in the later issues (#36, #39, #40): each one was checked for real-world reachability or actual severity before being fixed — #36 and #39 turned out to be either fully live or currently-unreachable-but-worth-fixing-anyway, and #40's own severity assessment ("Low... not a problem for typical usage") shaped a deliberately partial fix (2 of 3 suggested mitigations) rather than over-building for a risk that isn't live yet. #40 also surfaced a process issue distinct from any code bug: it was filed against a PR (#30) that was open and significantly behind `main`, a reminder to check whether an issue's referenced code has actually shipped before assuming it needs fixing on `main`.
