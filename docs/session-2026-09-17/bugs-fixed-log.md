# Bugs Fixed Log — 2026-09-17

| # | Bug | Found in | Fix | Files | Verified |
|---|---|---|---|---|---|
| 1 | EmailAutomationView called dead `GET/PUT /api/email/config` — config never loaded, Send/Schedule disabled | `src/EmailAutomationView.jsx:103,188` vs backend routes | Migrated to `/api/email/accounts` (default/first), per-account test, `accountId` on send/schedule + sender picker | `src/EmailAutomationView.jsx` | grep 0 refs, build ×2, email 40/40 ×2 |
| 2 | Variable regex injection + leftover `{{}}` mailed raw | `server/index.js:1378`, `scheduler.js:71` | Shared `substituteTemplateVars` with `escapeRegExp`; backend fails recipient on leftover placeholder | `server/utils/emailTemplate.js` (new), `index.js`, `scheduler.js` | node check `company.name`, E21b test |
| 3 | No recipient validation, no cap, sync bulk timeout | `POST /send`, `/schedule` | Email format check, 500/batch cap, 2000/24h cap (`429`), `async:true` or >100 → Agenda queue (`202`) | `server/index.js` | email 41/41 ×2 |
| 4 | Invalid ObjectId → 500 | All `:id` email routes | `isValidObjectId` guards → 400 | `server/index.js` | email suite green |
| 5 | Missing `ENCRYPTION_KEY` crashed at runtime | `utils/crypto.js` | Required-list + dedicated startup check (32-byte hex) | `server/startupCheck.js` | boot log |
| 6 | No unsubscribe/bounce handling | send paths | `EmailSuppression` model, `List-Unsubscribe` headers + footer, public `POST /unsubscribe`, CRUD endpoints, scheduler skips suppressed | `models/EmailSuppression.js`, `index.js`, `scheduler.js` | suites green |
| 7 | Silent Supabase→Mongo drift | analytics sync | Kept best-effort dual-write, added `AuditLog` + `logAudit()` on drafts/email/delete | `models/AuditLog.js`, `utils/audit.js` | api 54/54 ×2 |
| 8 | No roles | profiles | `role` default `owner`, exposed in `GET /profile` (merged into existing route after catching a route-shadow regression with tests) | `server/index.js` | api 54/54 ×2 |
| 9 | Finance-grade cost + AI override + DSR missing | meetings/user | `MeetingRate` CRUD + `POST /meetings/cost`, `PUT /meetings/:id/attribution` (audit ledger), `GET /user/export`, `GET /user/retention`, delete cascades extended | `models/MeetingRate.js`, `index.js` | all suites green |
| 10 | WelcomeLoader on every tab switch | `App.jsx` SIGNED_IN handler + Supabase re-emit on focus | Fresh-login detection (gesture flag / OAuth hash / new uid), `sessionStorage` once-flag, 15s failsafe, silent mount | `src/App.jsx` | 8-case sim ×2, build ×2 |
| 11 | Remote lottie `AbortError`, blank loader | `WelcomeLoader.jsx` → `lottie.host` | Vendored `public/animations/welcome.lottie` (30,655 B verified), local src; later replaced by pure-CSS then restored vendored | `WelcomeLoader.jsx`, `public/animations/` | dist check, build ×2 |
| 12 | Intro video oversized/cropped, black bars | `SiteIntro.jsx` `cover` fullscreen | `contain` 640px, bg sampled `#f3ebd8` (pixel-measured), Skip removed, dashboard loader suppressed while intro plays, `loading` init `false` | `SiteIntro.jsx`, `App.jsx`, `index.html` preload | build ×2 |
| 13 | Avatar never displayed after upload | App read auth metadata, upload wrote `profiles` table; 0-row update silent | `upsert` on upload, `mergeProfileAvatar` on mount/sign-in, `onAvatarChange` lift to header | `server/index.js`, `App.jsx`, `SettingsView.jsx`, `ProfileSection.jsx` | ping ok, build ×2, suites green |
| 14 | Avatar quality crushed (q80→20) + stale CDN | `compressToTargetSize` | Dimensions shrink first at q90 (512→128), quality last resort (min 60); `invalidate:true`; response reports real dims | `server/index.js` | 6.6MB→45KB q90 test |
| 15 | Email editor blank space + dead History card | `EmailBodyEditor` | 3:2 grid, capped body, insight panels, History removed, sheet strip + autocomplete + counts | `EmailBodyEditor.*` | build ×3, lint clean |
| 16 | Email page required Body detour; XLSX unusable at send; raw `{{}}` sent | `EmailAutomationView` | Inline composer, shared `templateBind.js`, XLSX+CSV everywhere, preview pager, bind gate + counts | `EmailAutomationView.jsx`, `src/utils/templateBind.js` | build ×2 (incl. JSX `{{` fix), E21/E21b |
| 17 | Landing tours duplicated story, synced cursors | `EmailFlowTour`, `TemplateFlowTour` (new) | Sidebar walks, split mirrored layouts, staggered starts + jitter, Campaign-Creation cursor, site-matched titles 5/6, calendar + drum picker | `EmailFlowTour.*`, `TemplateFlowTour.*`, `LandingPage.jsx` | build ×N, lint 0 |

## Regressions Caught by Test-Twice Rule

| Incident | Caught by | Resolution |
|---|---|---|
| Duplicate `GET /user/profile` shadowed timezone route (api P1/P2 fail) | 2nd `api.test` run | Merged role into existing route |
| Unbound-placeholder guard broke E21 (empty-vars SMTP test) | 1st `email.test` run | Updated E21 + added E21b |
| JSX `` `{{` `` literal broke Vite build | 1st build | `{'{{'}` expressions |
