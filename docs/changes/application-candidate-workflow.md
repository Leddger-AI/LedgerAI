# Application → candidate implementation record

Updated: 8 November 2026. Branch: `codex/email-mobile-release`, implementation commit `f06d45e`. This document separates code completed locally from database, browser, and production verification still required.

## Changes made

| Area | Previous behavior | New local behavior |
|---|---|---|
| Public form | Rendered only selected team toggles even for student/employee drafts | Resolves saved blocks or legacy toggles by template type; controlled text, email, URL, date, textarea, choice, checkbox, and rating inputs; uses saved theme and field order |
| Public page shell | Landing navigation and intro also appeared above public forms | Public form route now opens directly to the application without those landing elements |
| Public API | Returned `title` and `config`; accepted any JSON object within size limits | Adds `templateType`; rejects unknown fields, missing required values and invalid common types before storage |
| Submission storage | Inserted a Supabase submission with no candidate link | Calls a service-role PostgreSQL function that saves submission and candidate link atomically for student applications |
| Candidate identity | Existing table had no application relationship | Adds normalized email and a nullable submission foreign key; same-owner/email applications reuse one candidate; missing or ambiguous identities need review |
| Candidate workspace | Sourcing treated submission count as candidate count | Separate counts, candidate search, detail with all linked applications, and persisted status selection |
| Publication | Required upload controls could be published although the public form did not upload | Activation and scheduling reject required file/photo fields; optional upload fields are visibly unavailable and cannot submit fake values |
| Analytics | MongoDB mirror keyed by submission ID | Same mirror and ID retained; candidate association lives in Supabase |

## Database migration and compatibility

Apply `server/application_candidate_migration.sql` in a test Supabase database first. Inspect `candidate_backfill_review`, then call `backfill_application_candidates()` and review its linked/review counts. Apply to the Leddger-AI project only after test verification. The migration is additive and does not delete rows. Old submissions remain readable without `candidate_id`; old candidate rows retain their IDs. Historical student rows with missing email or multiple matching candidate records remain for manual review. Existing `/api/submissions` responses retain all previous fields and add `candidateId`; email campaign APIs are unchanged.

Deploy order: migration → API → frontend → controlled student/employee/team submission → candidate search/detail/status refresh. Because the new API calls the RPC for every public submission, deploying it before the migration would make submissions fail. If rollback is needed, restore the previous API before removing any database objects; leave additive columns and recorded submissions intact.

## Verification performed locally

- Full backend suite after the new checks: **14 suites, 266 tests passed** on 8 Nov.
- New field-validation suite: **4 tests passed**. It covers legacy type-specific fields, block order/required/email rules, upload handling, and team department choices.
- API suite: **77 tests passed** after adding published `templateType`, atomic RPC call, invalid configured-field rejection, and candidate owner-scope tests.
- Touched frontend files: ESLint passed after correcting a pre-existing synchronous effect call in Sourcing.
- Frontend production build passed. Existing size warning remains: spreadsheet chunk about 4.26 MB uncompressed.
- Draft PR #70 was updated with the implementation; its Netlify deploy-preview checks passed on 8 Nov. The preview frontend still targets the older production API, so it does not verify candidate submission against the new backend.
- Browser check with an **isolated local fixture**, not Supabase: student fields rendered and submitted; the candidate appeared in Sourcing; status changed to `screening` and remained after refresh; legacy employee and team fields rendered. At 390 × 844, the form had no horizontal overflow (`scrollWidth` 390px). The test exposed the landing intro/navigation on public forms; the route shell was corrected and rechecked.
- The SQL migration ran twice in an isolated PGlite PostgreSQL-compatible database. Queries confirmed repeat application idempotence of the schema setup, same-owner email reuse, cross-owner separation, missing-email review, no candidate for a team submission, rollback when a submission insert fails, an unambiguous historical backfill, ambiguous historical records left unlinked, and no anonymous execute permission on the submission function. This is a useful function test, not a substitute for checking the hosted Supabase schema and policies.
- ESLint on `App.jsx` still reports 13 existing issues outside the small route-shell edit; the other touched frontend files passed. The build passed despite the existing bundle-size warning.

API checks use mocked Supabase, the browser check uses a local fixture, and migration checks use PGlite. They do **not** establish that the hosted Supabase project has the expected schema, that its row-level rules behave as intended, or that the full browser journey works against the deployed services. Record those results here when performed.

## Release preflight and blockers

- Production main remains `9276d51` at the time of this check. The active Render API `https://ledgerai-908y.onrender.com/api/email/worker-health` returned **404** on 8 Nov, so the staged worker is not yet live.
- The configured Leddger-AI Supabase project is active, but this new candidate migration has **not been applied**. Do not send production student applications through this branch until it is applied and checked.
- The earlier [release preflight](../deployment/release-preflight-2026-11-01.md) records missing production `ENCRYPTION_KEY` and `FRONTEND_URL` at that time; recheck before release.
- [Render Free documentation](https://render.com/docs/free) now states that outbound SMTP ports 465 and 587 are blocked. Leddger's Gmail sender defaults to port 587. A local SMTP smoke test on another port is insufficient to claim production email delivery. Render Free also sleeps after 15 idle minutes, delaying Agenda jobs.
- A hosted Supabase staging check, real database end-to-end browser sequence, live candidate flow, and live email/avatar checks are **pending**. No production rollout is claimed by this document.

## Next verification checklist

1. Test migration, RPC permissions, repeated/concurrent student submissions, and backfill in an isolated Supabase database. Verify different owners never share a candidate.
2. Test new and legacy drafts for all three template types, including expired and scheduled forms, invalid fields, and optional/required uploads.
3. At desktop and 390 × 844, complete builder → preview → publish → submit → Sourcing → candidate detail → status update → refresh.
4. Resolve the email transport and production environment blockers, then verify worker health, controlled delivery, and restart recovery before publishing the combined release.
