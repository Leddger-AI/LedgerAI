# Full Codebase Audit — Fixes Applied (2026-09-26)

> **Scope**: entire repo (`src/`, `server/`, config, docs) — 4 parallel research audits → 60+ findings → all CRITICAL and MAJOR findings fixed, verified twice.
> **Verification**: `npm run build` ✓ (rounds 1+2) · `npx jest` (server/) **233/233** ✓ (rounds 1+2, was 224 + 9 new tests) · ESLint: **zero** `no-unused-vars` remaining on touched files (29 pre-existing react-compiler strictness errors untouched).
> **Test discipline**: every fix = change → test → test again. Round 1 caught 2 real regressions (fixed same session): rolldown `manualChunks` shape + Mongo `$set`/`$setOnInsert` path conflict.

---

## Table of Contents

1. [Batch 1 — Security (C1–C8)](batch-1--security)
2. [Batch 2 — Crashes + Fake Data](#batch-2--crashes--fake-data)
3. [Batch 3 — Reliability + Performance](#batch-3--reliability--performance)
4. [Batch 4 — Major Cleanup](#batch-4--major-cleanup)
5. [Docs + Config Fixes](#docs--config-fixes)
6. [Verification Results (Round 1 + Round 2)](#verification-results)
7. [Deferred Items (analyzed, intentionally not changed)](#deferred-items)

---

## Batch 1 — Security

### S1. Auth fail-closed on missing Supabase env (was: full bypass)
- **File**: `server/middleware/auth.js:3-28`
- **Before**: no `SUPABASE_URL/KEY` → `verifyToken` minted `DEV_MOCK_UID_<5chars>` from any attacker-supplied Bearer token and called `next()` on every protected route, with only a `console.warn`.
- **After**: bypass allowed **only** when `NODE_ENV !== 'production'` (`DEV_BYPASS` flag); otherwise `503 Authentication is not configured on this server`.
- **Verified**: jest suites mock the middleware, so 233/233 unaffected; logic reviewed (fail-closed branch returns before any user minting).

### S2. Demo token can no longer hit real APIs
- **File**: `src/App.jsx` (`isDemoToken`, `fetchMeetings`, `fetchAlerts`)
- **Before**: `enterDemoMode()` set `accessToken: 'demo-access-token'` and `handleSyncClick`/login flows fired it at `GET /api/meetings|alerts` — against a dev-bypass backend this returned another UID's data.
- **After**: `fetchMeetings`/`fetchAlerts` early-return on the demo token. Demo mode now renders empty local state only.
- **Also**: `JSON.parse(localStorage.authUser)` wrapped in try/catch (corrupt value previously crashed the auth listener) with removal of the bad value.

### S3. Stored XSS in email drafts closed at both layers
- **Files**: `src/EmailAutomationView.jsx` (import + `safeHtml` + 2 sinks + `stripHtml`), `server/index.js` (`sanitizeBodyHtml` + POST/PUT `/api/email/drafts`)
- **Before**: `bodyHtml` saved raw and rendered raw via `dangerouslySetInnerHTML` (detail pane + send preview with CSV-mapped values); `dompurify` installed but imported zero times.
- **After**: client renders only `DOMPurify.sanitize()` output; server strips `<script>`, `on*` attributes, `javascript:` URLs and caps at 500k chars on save.
- **Verified**: new test `E41` asserts scripts/handlers/`javascript:` gone and `<p>Hi</p>` survives; jest 233/233.

### S4. Cloudinary delete scoped to own assets
- **File**: `server/index.js` (`DELETE /api/cloudinary/:publicId`)
- **Before**: any authed user could `destroy()` any predictable `publicId` (e.g. `avatars/<victim-uid>`).
- **After**: only `avatars/<own-uid>` or `<own-uid>/…` prefix allowed, else `403`.

### S5. Cloudinary upload folder allowlisted
- **File**: `server/index.js` (`POST /api/cloudinary/upload`)
- **Before**: raw `req.body.folder` flowed into Cloudinary (`../../`, arbitrary names).
- **After**: allowlist `leddger-ai | avatars | templates | spreadsheets`, else `400`.

### S6. Multer errors return JSON, not HTML stack pages
- **File**: `server/index.js` (central error middleware before `listen`)
- **Before**: `fileFilter` rejections / 5MB overruns fell through to Express default HTML 500.
- **After**: `LIMIT_FILE_SIZE` → `400 File too large`, invalid-type → `400` with message.

### S7. Profile `avatar_url` validated (arbitrary-URL `<img src>` closed)
- **File**: `server/index.js` (`PUT /api/user/profile`)
- **Before**: any string persisted and later rendered as `<img src>` (tracking/phishing/`javascript:`).
- **After**: must parse as `https:` URL with no spaces/quotes/brackets, else `400`.
- **Verified**: new test `P5` (4 hostile values → 400).

### S8. DSR delete + export now cover all collections
- **File**: `server/index.js` (`DELETE /api/user/data`, `DELETE /api/user/account`, `GET /api/user/export`)
- **Before**: `TemplateData`, `TemplateSubmission`, `GoogleDriveToken` survived "delete everything"; export omitted 8 collections.
- **After**: all three added to both delete loops (plus per-collection try/catch so partial wipes surface as `Name (ERROR: …)` instead of silently passing); export adds templates, submissions, splits, budgets, spreadsheets, reports, email accounts, drive tokens.

### S9. Public submit hardened (rate-limit + validation + mailer escaping)
- **Files**: `server/index.js` (`express.json({limit:'100kb'})`, inline `publicRateLimit` 30/min/IP, `POST /api/forms/:draftId/submit` shape validation), `server/utils/emailService.js` (`escapeHtml` in `buildSubmissionEmailHtml`)
- **Before**: unbounded body, no rate-limit, unvalidated `submittedData`, raw key/value interpolation into owner HTML mail (stored-XSS source).
- **After**: 400 on non-object/array bodies, >200 fields, >200-char keys, >20k values; mailer escapes keys/values/titles, caps 200 rows, stringifies objects.
- **Verified**: new tests `F12` (4 bad bodies → 400), `F13` (201 fields → 400); existing `F9` (`{}` → still 404, validation passes empty objects through) and `ES5` (mailer still includes title/fields) pass.

### S10. Drive OAuth `state` signed + expiring (CSRF/attach fixed)
- **Files**: `server/utils/googleDriveOAuth.js` (`signDriveState`/`verifyDriveState`, HMAC-SHA256, 10-min TTL, `timingSafeEqual`), `server/index.js` (`/auth` signs, `/callback` verifies before `storeTokens`, explicit error when Google returns no `refresh_token`, `safeFrontendUrl()` allowlist for redirects)
- **Before**: `state = raw uid`, callback unauthenticated → attacker could attach tokens to a victim uid; `FRONTEND_URL` env used raw in redirects.
- **After**: forged/replayed/expired state → `400 Invalid or expired state parameter`; redirects restricted to http(s) URLs with localhost fallback.
- **Verified**: new tests `G1` (missing params → 400), `G2` (plain-uid state → 400, no Google call).

### S11. `ENCRYPTION_KEY` length validated (clear boot-time-class error)
- **File**: `server/utils/crypto.js` (`getKey`)
- **Before**: short/non-hex keys threw `ERR_CRYPTO_INVALID_KEYLEN` deep inside request paths.
- **After**: explicit `must be 64 hex chars (32 bytes), got N bytes` error.
- **Note**: OTP utils (`utils/otp.js`) were reviewed and intentionally left throwing on infra failure — fail-closed is correct for security-critical verification. Documented, not changed.

---

## Batch 2 — Crashes + Fake Data

### F1. `insertVariable` passed JSX to `execCommand` (editor broken)
- **File**: `src/pages/EmailBodyEditor.jsx:396`
- **Before**: `const html = <span …> + variable.label + </span>` — a JSX expression coerced to `"[object Object]"`.
- **After**: real HTML string with the label escaped (`&<>"`).
- **Also in file**: save-status timeout now stored in a ref and cleared on unmount + before re-arm (timer leak fixed); dead Attach (paperclip) and AI Tools buttons removed (no handlers existed) with unused `Paperclip`/`Sparkles` imports dropped.

### F2. Crash guards (Invalid Date / NaN / undefined)
| File | Fix |
|---|---|
| `src/pages/ActiveLinksView.jsx` | `expiresAt` null/invalid → `isExpired=false`, label `No expiry` (was `Expires: Invalid Date`) |
| `src/pages/AnalyticsPage.jsx` | `tickFormatter` → `String(d ?? '').slice(5)` (null-date crash) |
| `src/pages/Budgets.jsx` | `spent`/`pct` coerced via `Number(...)\|\|0` (API rows without them → `NaN%`/crash) |
| `src/pages/TemplateDetailAnalytics.jsx` | divide-by-zero guard (`totalProfiles > 0`), `Array.isArray` guards on `roleDistribution/topLanguages/topTopics/profiles`, `role` fallback (`Unknown`) |

### F3. Fake-data defaults replaced with honest empty states
- **File**: `src/App.jsx` (`dynamicData`)
  - `accuracy: 92` fallback → `null` (rendered as `—`).
  - Mock `costOverTime` (`totalCost × fixed percentages`) → **real bucketing** by meeting `start_time` (7-day / 4-week / month-week buckets per `datePreset`); no dated meetings → `[]` so charts show empty states. `fetchMeetings` mapping now keeps `start_time` for this. `duration` parse guarded (`m.duration \|\| ''`).
- **Files**: `src/pages/DashboardHome.jsx`, `src/pages/OverviewDashboard.jsx`
  - Accuracy renders `—` when null (both pages).
  - Trend `+12%` hardcoded fallback → `null` → badge shows `no data`.
  - `share: Math.max(8, …)` (rings summed >100%) → true rounded share.
- **Month grid truncation bug**: `monthCells.slice(0, 35)` dropped days for 31-day months starting Sat/Sun → `slice(0, 42)`.
- **Verified**: Home page on empty account now shows `—`, `no data`, and designed empty states instead of fabricated numbers; build clean.

### F4. Hardcoded "live" numbers labeled as samples
- `src/AnalysisView.jsx`, `src/MeetView.jsx`: `Sample preview` badge in header (funnel/source/time-to-hire and candidate lists are static fixtures).
- `src/components/GithubAnalysis.jsx`: `Heuristic estimate` badge on the AI Attribution Summary card (scores/summaries are template heuristics, not model output); async fetch guarded with a `cancelled` flag (setState-after-unmount fixed).
- `src/components/CandidateAvatar.jsx`: `cancelled` flag added (same unmount race).
- `src/pages/StudentPortal.jsx`: removed stray `console.log`; mock `score: Math.random()*40+60` (stored as a *real encrypted payload*) → `score: null` + `scoreNote: 'pending-evaluation'`; `src/pages/RecruiterDashboard.jsx` renders `Pending evaluation` for null scores.
- `src/pages/MeetView.jsx`: copy-to-clipboard now `.catch()`-guarded with timer cleanup; **Schedule Meeting** wired to Calendar via new `onNavigate` prop (App passes `handleNavClick`); **Join** opens the meet link (`noopener,noreferrer`); buttons got `type="button"`.
- `src/pages/ReportsView.jsx`: weekday chart re-bucketed by real `start_time` (was `m.id===1→Thursday` hardcodes defaulting to Saturday); `dateRange` now actually filters; CSV export rewritten RFC-4180 (Blob + quote-doubling + `revokeObjectURL`) replacing `encodeURI` concatenation; fake `alert()` PDF export → honest `window.print()`; duplicate `display` style keys collapsed (3× `no-dupe-keys`).

---

## Batch 3 — Reliability + Performance

### R1. Scheduler: cancel-before-schedule + singleton race fixed
- **File**: `server/scheduler.js`
- `scheduleCampaign` / `scheduleDraftActivation` now `cancel()` same-key jobs first (retries/double-clicks previously created duplicate jobs → duplicate mass mail). Analytics reports already did this.
- `getAgenda()` caches the **init promise**, not just the instance — concurrent callers previously constructed two Agendas that both fired jobs.
- Campaign transporter build wrapped in try/catch → marks campaign `failed` instead of rejecting the job and sticking it in `scheduled/sending` forever.
- `email_send_log` insert result now checked and logged on failure (Mongo `sent` vs missing audit row divergence closed).
- Auto-activate mirror upsert carries `ownerUid` via `$setOnInsert` (fetched from the Supabase row).

### R2. Mongo mirror divergence closed (PATCH / activate / fallback / delete / sync)
- **File**: `server/index.js`
- `PATCH /drafts/:id`: upsert adds `$setOnInsert: { ownerUid }` (+ title fallback). **Round-1 regression caught & fixed**: MongoDB forbids a path in both `$set` and `$setOnInsert` (`Updating the path 'title' would create a conflict`) — title now goes to `$setOnInsert` only when the PATCH didn't set it. Verified by failing test `D40` → passing.
- `PUT /drafts/:id/activate`: added `{ upsert: true }` + `ownerUid` (was silent no-op when the mirror row was missing).
- Public `GET /forms/:id` fallback auto-activate: added the same Mongo mirror write the Agenda job does.
- `DELETE /meetings/:id`: also deletes `MeetingSplit` rows (were orphaned → ghost joins in budget/attribution reads).
- `POST /analytics/sync`: existence check scoped to `{ submissionId, ownerUid }` (cross-user id collision no longer blocks legitimate syncs).

### R3. Code-splitting: 6.2MB single chunk → split lazy chunks
- **Files**: `src/App.jsx`, `vite.config.js`
- 8 heavy route views (`LandingPage`, `KnowledgeBase`, `ReportsView`, `SourcingView`, `BulkCampaignView`, `RosterStudioView`, `EmailAutomationView`, `AnalysisView`) converted from eager imports to `lazy()` (landing pages + dashboard widgets stay eager). **Round-1 regression caught & fixed**: object-form `manualChunks` is rejected by Vite 8/rolldown (`manualChunks is not a function`) → rewritten in function form.
- **Result** (`dist/`): `index` 6,201KB → **921KB**, `vendor` 178KB, `charts` 391KB, `sheets` 4.2MB (lazy), routes 4–60KB each.

---

## Batch 4 — Major Cleanup

### C1. `App.jsx` dead code removed (~120 lines)
Deleted: 10 unused recharts imports, unused `supabase` import, `avatars` const, `isSidebarExpanded`, search state (`searchQuery`/`filteredMeetings`), `handleSyncClick`, `openEditModal`, still-dead `handleApprove`, dead `handleEmailAuthLogin` (+`loginWithEmail` import; the util stays for future UI), 13 unused lucide icons (`Bell/Search/ArrowUpRight/ArrowDownRight/ChevronDown/Edit2/LogOut/RefreshCw/ChevronsRight/ChevronsLeft/InboxIcon/Trash2/CheckCircle2`), dead Inbox navs (`Assigned/Unassigned/AllOpen` — `handleNavClick` no-op'd on them).
Added: `Meet` to Workspace nav + `calculatePrimaryNav` (was orphaned, highlighted wrong); `tokens` → `[, setTokens]`; `catch (err)` → `catch {}` in fetches.

### C2. Mutations now persist (were local-only, wiped on refresh)
- **File**: `src/App.jsx` (`persistAttribution`, `markMeetingApproved`, `handleResolveAlert`, `saveEditModal`, `handleUpdateMeetingProject`)
- Approve/reattribute/resolve now `PUT /api/meetings/:id/attribution` and `PUT /api/alerts/:id/resolve` (both endpoints already existed and were tested) with optimistic local updates; demo tokens skip network.

### C3. Session robustness
- Single `resetAuthState()` shared by `SIGNED_OUT` listener and `handleLogout` (modal, banner, thresholds no longer leak across users on shared machines).
- `fetchMeetings`/`fetchAlerts`: HTTP `401` → `handleLogout()` instead of lingering logged-in on empty data.
- Loader no longer gated on `meetings.length === 0` (real empty workspaces were hidden behind `WelcomeLoader` up to 15s).

### C4. Clipboard hardening (5 files)
`ActiveLinksView`, `DraftsView` ×2, `ScheduledFormsView`, `SourcingView`, (plus `MeetView` earlier): `navigator.clipboard?.writeText(…)?.catch(() => {})`, success-only UI updates, timer refs cleaned on unmount. `SourcingView.formatRelativeTime` also guards invalid/future dates.

### C5. Analytics error surfacing
- `AnalyticsPage`: `fetchOverview/Templates/Trends` rethrow so `fetchAll` sets the visible `error` state (failures previously rendered as silent empties).
- `TemplateDetailAnalytics`: no-token and submission-fetch failures set `error` instead of `null` detail reading as "Template not found".

### C6. Backend guards
- Spreadsheet `GET/PUT/DELETE /:id` + `GET /:id/headers`: malformed ObjectIds → `400` (was `CastError` → `500`). New test `S15` covers all four.
- Analytics report recipients: validated (`isValidEmail`), lowercased/trimmed/deduped, capped at 20 — on create **and** update. New tests: reject-invalid + cap, normalize/dedupe.
- Compound indexes: `EmailDraft {ownerUid, updatedAt}`, `EmailCampaign {ownerUid, createdAt}` + `{ownerUid, status}`.
- Deleted dead `server/models/FormSubmission.js` (never imported; `TemplateSubmission` is the live model).
- `RecruiterDashboard` preview inputs made controlled (`previewGithub/previewLinkedin` state) so they are editable instead of disabled.
- `StudentPortal`: local dark-themed `PrefixedLinkInput` intentionally kept (the shared one is light-themed) — documented, not a bug.
- `EmailBodyEditor`: covered in F1 (insertHTML string, timer ref, dead buttons removed).
- Root `package.json`: added missing `"test": "cd server && npm test"` (bare `npm test` previously errored).
- `server/.env.example`: created (key generation + rotation notes, no secrets).

### C7. Unused-var sweep (touched files)
Removed: `React` default imports (7 files), `Copy` (MeetView), `GitBranch/Link2/MoreVertical` (SourcingView), `supabase`+`navigate` (StudentPortal), `BarChart2/ArrowDownRight/ArrowUpRight/BarChart/Bar` (ReportsView), `Download/BarChart2/Search/Check/FileSpreadsheet` (RecruiterDashboard), `React/Calendar/Trash2` (ScheduledFormsView), `React` (TemplateDetailAnalytics), `React/Send` (ActiveLinksView), `React/ChevronDown/ArrowLeft/Clock/BarChart/Bar` + unused `user` prop (AnalyticsPage), `Paperclip/Sparkles` (EmailBodyEditor), `setChunkOverlap/pErr` (KnowledgeBase). `EmailAutomationView.draftDetailLoading` wired into the UI (loading pane) instead of deleted.

### C8. `type="button"` hardening
Added to all buttons missing it in `DashboardHome`, `OverviewDashboard`, `MeetView`, `SourcingView` (34 buttons; fragile outside `<form>` today, breaks silently if ever wrapped in one).

---

## Docs + Config Fixes

| File | Fix |
|---|---|
| `docs/sidebar-architecture.md` | Corrected stale numbers: gap `12px`→`16px`, radius `24px`→`16px`, canvas `#f6eadc`→`#F2E8D5` (verified in `App.css:2-33`) |
| `docs/api-endpoints.md` | Replaced rotted `server/index.js lines 323-346` ref with route-string search guidance |
| `docs/backend/rust_backend.md` | Replaced 5 dead absolute `file:///c:/PROJECTS/EXPERIMENT/…` links with relative `../../backend_rs/…` links |
| `server/.env.example` | New: documents `ENCRYPTION_KEY` generation (64 hex chars), rotation notes, all required vars |
| `package.json` | Added root `test` script |

---

## Verification Results

### Round 1
- `npm run build`: **FAILED** → rolldown rejects object-form `manualChunks` → rewrote as function → **PASS** (3067 modules, split chunks as above).
- `npx jest` (server/): **232/233** → `D40` failed (`Updating the path 'title' would create a conflict`) → conditional `$setOnInsert` → **233/233**.
- ESLint touched files: cleared all `no-unused-vars`.

### Round 2 (full repeat, after all fixes)
- `npm run build`: **PASS** (1.68s, 3067 modules).
- `npx jest`: **9/9 suites, 233/233 tests PASS** (224 pre-existing + 9 new: `F12, F13, S15, P5, G1, G2, E41` + 2 recipient tests).
- ESLint on all 19 touched frontend files: **0 `no-unused-vars`**; remaining 29 errors are pre-existing react-compiler strictness patterns (`Date.now` purity, `catch _`, set-state-in-effect data fetching, function hoisting) — none introduced by this session.
- Integrity check: byte-level scan confirmed no encoding damage in edited files (an early scare from PowerShell output rendering was verified as display-layer mojibake only — files contain correct UTF-8).

### New regression tests added (9)
| Test | Covers |
|---|---|
| `F12` (`api.test.js`) | Submit rejects missing/non-object `submittedData` → 400 |
| `F13` | Submit rejects >200 fields → 400 |
| `S15` | Spreadsheet GET/PUT/DELETE/headers reject malformed ObjectIds → 400 |
| `P5` | Profile rejects `javascript:`/non-https `avatar_url` → 400 |
| `G1/G2` | Drive callback missing/forged `state` → 400 without touching Google |
| `E41` (`email.test.js`) | Draft save strips scripts/handlers/`javascript:` URLs |
| Recipient reject + normalize (`analyticsExport.test.js`) | Invalid/capped lists rejected; trim/lowercase/dedupe |

---

## Deferred Items

Analyzed but intentionally **not** changed (each needs a product decision, migration, or is correctly fail-closed already):

1. **Unbounded list queries** (drafts, submissions, spreadsheets, meetings, campaigns, rates, splits, budgets, reports) — needs cursor/limit pagination; changes API shapes. Only audit-log/suppressions/submissions paginate today.
2. **Sequential per-recipient sends** (500 max, `p-limit` 5–10 or bulk provider) — throughput rework with retry semantics.
3. **Timezone skew** (server-local month boundaries vs user `profiles.timezone`) — needs per-user TZ plumbing.
4. **OAuth premature `navigate()` after `signInWithOAuth`** — redirect flow unloads the page so the call rarely executes; full fix needs flow redesign.
5. **`supabaseClient` construction with undefined env** — guarded by fail-closed middleware; hardening the client export risks breaking all importers.
6. **OTP utils throw on infra failure** — correct fail-closed behavior for security verification; startup checks validate the key.
7. **`CLOUDINARY_API_SECREAT` typo** — code falls back to the correct spelling; renaming the env var risks breaking the deploy, so backward compat kept.
8. **PDF export row behavior** (10k-fetch then silent 40-row truncation) + **201-vs-200 status codes** — changing either alters tested API contracts; noted for a versioned API pass.
9. **CSS theme codemod** (`#FFFFFF→var(--bg-card)` etc.), **z-index scale**, **dead CSS selectors**, **missing responsive breakpoints**, **invisible scrollbars** — styling-system work, no behavior change; recommended as its own pass.
10. **`StudentPortal` dark `PrefixedLinkInput`** — intentional theme duplicate, kept.
11. **`handleEmailAuthLogin` removed** — email/password login util remains in `supabaseAuth.js` for future UI; `LoginDashboard` is Google/GitHub only.
