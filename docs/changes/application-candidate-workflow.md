# Application → candidate implementation record

Updated: 8 November 2026. Branch: `codex/email-mobile-release`, implementation commit `f06d45e`. This document separates completed API and database verification from frontend rollout and browser checks still required.

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

`server/application_candidate_migration.sql` was tested in an isolated PostgreSQL-compatible database, then applied to the configured Leddger-AI Supabase project (`tcoxhlhxhsqktztlwqvw`) on 8 Nov. The hosted database had 0 candidates and 0 submissions before migration. The migration is additive and does not delete rows. Old submissions remain readable without `candidate_id`; old candidate rows retain their IDs. Historical student rows with missing email or multiple matching candidate records remain for manual review. Existing `/api/submissions` responses retain all previous fields and add `candidateId`; email campaign APIs are unchanged.

After applying it, a hosted schema query confirmed `candidates.normalized_email` and `form_submissions.candidate_id`. `candidate_backfill_review` returned 0 rows; `backfill_application_candidates()` returned `linked_count = 0`, `review_count = 0`. A second hosted query confirmed 0 candidates, 0 submissions, and 0 review rows. The exact `record_form_submission(text,text,uuid,text,jsonb,boolean,text,text)` signature is executable by `service_role` and not by `anon` or `authenticated`. These are production schema and privilege checks, not a live application journey or an independent Supabase staging database test.

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

## Hosted API verification, 8 November

- Render service `LedgerAI` (`https://ledgerai-908y.onrender.com`) ran branch commit `99ae87d`, then `69e451a` after the Gmail HTTPS transport fix. `/api/email/worker-health` returned HTTP **200** with `ready: true` after Agenda startup. This was a direct commit deploy; the service remains linked to `main` for future automatic deploys.
- With a disposable Supabase owner and real API calls, created, activated, and publicly fetched student, employee, and team forms. All three public responses returned the correct `templateType`. An invalid student email returned 400. Two student submissions with the same address in different letter case created one normalized candidate and two linked applications. Employee and team submissions did not add candidates. Candidate status changed to `screening` and persisted on a fresh detail request.
- The four valid submissions appeared in the MongoDB analytics mirror. The disposable Auth owner and owner-scoped MongoDB mirror/audit rows were removed after the check. This validates the hosted service's integration with Supabase and MongoDB. It does not replace the pending desktop and 390 × 844 browser journey.
- A second disposable owner verified the hosted OAuth account test endpoint through Gmail HTTPS; the self-addressed test message was accepted and its account/owner rows were removed. A controlled immediate and scheduled campaign check also passed, including HTTP 202 queue response, duplicate request ID reuse, terminal `sent` status with `sentCount = 1` for each, and one Supabase log row per campaign. Those disposable rows were removed. No restart was included in this hosted schedule check.

API checks use mocked Supabase, the browser check uses a local fixture, and functional migration checks use PGlite. The hosted queries above establish the production schema and function privileges, but they do **not** establish that row-level rules behave as intended under real user sessions or that the full browser journey works against deployed services. Record those results here when performed.

## Release preflight and blockers

- Production GitHub `main` and the Netlify production frontend remain on the earlier release at the time of this check. The active Render API was deployed directly from branch commit `69e451a`; its worker health is HTTP **200**, but a later auto-deploy from `main` could replace this branch build until the release is merged.
- The configured Leddger-AI Supabase project is active and the candidate migration is **applied and checked**. The candidate API and frontend are still staged in PR #70, so no production student application has been tested through them.
- The earlier [release preflight](../deployment/release-preflight-2026-11-01.md) recorded missing `ENCRYPTION_KEY` and `FRONTEND_URL`; both were configured on the active Render service on 8 Nov. Secret values are kept out of this document and Git.
- [Render Free documentation](https://render.com/docs/free) states that outbound SMTP ports 465 and 587 are blocked. OAuth senders now use the [Gmail HTTPS send API](https://developers.google.com/workspace/gmail/api/guides/sending) when `EMAIL_TRANSPORT=gmail_api`; the configured Google token includes `gmail.send`, and local and hosted self-sends passed. App-password SMTP senders remain unusable on this Free service. Render Free sleeps after 15 idle minutes, delaying Agenda jobs despite the successful awake-service scheduled test.
- An independent hosted Supabase staging check, desktop/390 × 844 browser sequence against the live API, backend restart during a scheduled campaign, and live avatar replacement are **pending**. The Netlify production frontend has not been rolled out by this direct API deployment.

## Next verification checklist

1. Test RPC permissions, repeated/concurrent student submissions, and backfill in an independent hosted Supabase test database. Verify different owners never share a candidate. The local PostgreSQL-compatible function checks and production schema/privilege checks above are complete.
2. Test new and legacy drafts for all three template types, including expired and scheduled forms, invalid fields, and optional/required uploads.
3. At desktop and 390 × 844, complete builder → preview → publish → submit → Sourcing → candidate detail → status update → refresh.
4. Verify the full preview frontend against the live API, including desktop and 390 × 844, then check avatar replacement. The OAuth HTTPS transport, environment keys, worker health, and controlled live delivery are verified. Restart recovery remains to be checked on Render; Free-plan sleep remains a product limitation.
