# Candidate workflow research and decisions

Updated: 8 November 2026. Findings below come from source inspection and local tests; production outcomes are called out separately.

## Existing system and gap

The template builders save `form_drafts` in Supabase. Public `GET /api/forms/:draftId` checks publication and expiry; `POST /api/forms/:draftId/submit` previously saved arbitrary JSON to `form_submissions`, mirrored it to MongoDB `TemplateSubmission`, and sent an owner notification. The public React page rendered team fields only, even when the draft type was student or employee. The shared `FormRenderer` was a disabled preview rather than a controlled data-entry component. The server validated payload size but not the configured field set.

The existing Supabase `candidates` table has owner, name, email, status, and spreadsheet references, but there were no candidate list/detail/status routes and submissions had no candidate foreign key. Sourcing counted submissions as “Candidates” and “Profiles,” so repeat applications inflated both figures. Meet and Calendar still show sample meetings and a fixed June 2026 grid. Email campaigns operate on recipient addresses and have no candidate link. Template Analytics reads a MongoDB mirror, so the Supabase submission ID must remain stable.

These observations make the public form and candidate identity the first useful connection. Adding campaign or interview links before it would attach activity to email strings or sample people instead of a durable candidate.

## Chosen data contract

- A published form response adds `templateType` without removing `title` or `config`.
- Student, employee, and team drafts resolve saved blocks first, then saved fields, then legacy toggles. Input values use stable field IDs. Display blocks do not submit values.
- The API checks configured keys, required values, common types, choices, and size. An old draft with no resolvable fields retains its prior permissive behavior so it does not abruptly reject submissions.
- Student submissions call a service-role-only Supabase function that saves the submission and links a candidate in one PostgreSQL transaction. Other template types save a submission without a candidate.
- Candidate identity is owner ID plus lowercased, trimmed email. Repeated application emails under one owner reuse a candidate, while each submission remains independent. The transaction serializes simultaneous submissions for the same owner/email. When email is absent or historical identity is ambiguous, it creates a separate `needs_contact_review` candidate instead of guessing a merge.
- Candidate list/detail/status APIs are owner scoped. The detail view reads applications through the candidate ID and owner ID. Status is a bounded set; free-form data is not accepted by the update endpoint.
- The MongoDB analytics mirror continues to use the original submission ID and submitted answers. A mirror failure is logged but does not roll back the Supabase transaction, matching the existing best-effort mirror design.

## Historical data and migration

`server/application_candidate_migration.sql` adds `candidates.normalized_email`, `form_submissions.candidate_id`, indexes, the transactional submission function, a restricted review view, and an idempotent backfill function. Existing candidate rows receive normalized email values. The review view shows old student submissions that are not linked. The backfill links only a valid email with zero or one existing matching candidate; multiple existing candidate matches remain for review. Missing-email historical submissions remain unlinked rather than manufacturing an identity from unrelated fields.

The migration does not delete or combine any existing candidate or submission. Its functions are revoked from public, anonymous, and ordinary authenticated roles and granted to `service_role`. Application APIs still enforce owner scoping. Migration and backfill passed an isolated PGlite PostgreSQL-compatible test, including an anonymous-execute permission check. The hosted Supabase schema and row-level policies still require verification before applying to the configured production project.

## Considered alternatives

| Alternative | Why it was not chosen |
|---|---|
| One candidate per submission | Splits one person's application history across profiles and makes later email/interview history harder to follow |
| Automatically merge by name or GitHub handle | Both may change or collide; email within the same owner is a narrower deterministic rule |
| Separate Supabase insert then candidate insert | A failure between requests leaves an application without the required candidate link |
| Use MongoDB as candidate source | Supabase already owns forms and candidate rows; cross-store transactions are unavailable |
| Turn every template response into a candidate | Employee reviews and team charters are not job applications |
| Reuse the preview renderer unchanged | Its inputs are not controlled and file/photo controls only look interactive |

## External constraints and future research

- [Render Free documentation](https://render.com/docs/free) says the service sleeps after 15 idle minutes and blocks outbound SMTP ports 465 and 587. The app defaults to Gmail SMTP on 587; local SMTP tests on another port cannot prove live delivery. A supported HTTPS mail transport or a different hosting plan is needed before claiming production sending.
- [Google sender guidelines](https://support.google.com/mail/answer/81126?hl=en) inform the later sender-domain, unsubscribe, and deliverability phase.
- [Google Calendar free/busy API](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query) is a possible integration for later interview coordination.
- [WCAG 2.2 target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum) informs the later dashboard mobile/accessibility pass.
- Secure applicant file storage, malware/type checks, owner-only access, retention, and deletion require a separate design. Optional upload fields are described as unavailable; required upload fields are rejected at publication.
