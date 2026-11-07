# 14: Application and candidate lifecycle

Updated: 8 November 2026. Code is staged in PR #70 on `codex/email-mobile-release`. The production Supabase migration and direct Render API branch deployment were verified on 8 Nov. The hosted API journey passed with disposable records; Netlify production frontend rollout and browser journey remain pending.

## User journey

```text
Builder saves a draft → recruiter activates/schedules → public form loads saved config
→ visitor fills configured fields → server validates publication + answers
→ Supabase transaction saves submission and (for student applications) links candidate
→ MongoDB analytics mirror receives same submission ID → Sourcing lists candidate
→ recruiter opens application history and changes candidate status
```

## Source and call trace

| Step | Component or endpoint | Source of truth and behavior |
|---|---|---|
| Build | Student/Employee/Team builders, Preview Studio | Save `config` and `template_type` to Supabase `form_drafts`; Studio stores blocks, fields, and theme |
| Publish | `PUT /api/drafts/:id/activate` or `/schedule` | Reject a required photo/file field until secure upload exists; existing activation and Agenda rules remain |
| Open | `GET /api/forms/:draftId` | Return `title`, `config`, and `templateType` only when active and unexpired; scheduled fallback uses guarded activation |
| Render | `src/pages/PublicFormView.jsx` | Resolve blocks, saved fields, or legacy toggles; render controlled inputs in stored order, with theme and required indicators |
| Submit | `POST /api/forms/:draftId/submit` | Validate payload shape/size, publication state, configured keys and values; produce one submission UUID |
| Record | `public.record_form_submission(...)` | PostgreSQL transaction saves `form_submissions`; for student type, serialize owner/email lookup, reuse or create candidate, set `candidate_id` |
| Mirror | `TemplateSubmission` MongoDB model | Copy original submission ID, draft ID, type, and answers for template analytics; log mirror failure |
| Review | `GET /api/candidates`, `GET /api/candidates/:id`, `PATCH /api/candidates/:id` | Supabase owner-scoped candidate list/detail/status; detail includes linked applications |
| Display | `src/SourcingView.jsx` | Separate candidate and submission counts, search, application details, saved status |

## Database and identity

The migration is `server/application_candidate_migration.sql`. `candidates.normalized_email` stores trimmed lower-case email. `form_submissions.candidate_id` is nullable and references `candidates.id`. A transaction-level advisory lock on `(owner_id, normalized_email)` prevents two simultaneous submissions through the RPC from creating separate candidates. Email is matched only within one owner. Existing duplicate candidate identities are not automatically merged; a new application needing review is kept separate. No email creates a `needs_contact_review` candidate. Employee and team submissions have a null candidate link.

Historical data remains readable. The restricted `candidate_backfill_review` view identifies unlinked student submissions. `backfill_application_candidates()` links only unambiguous valid-email rows; it reports linked and review counts. The production project had 0 submissions before migration; after the view returned 0 rows, the backfill reported 0 linked and 0 needing review. Hosted function privilege checks confirmed only `service_role` can execute the submission function. Independent hosted staging and end-to-end application checks remain pending.

## Error and access paths

- Draft, future scheduled, inactive, and expired forms return existing 403/410 responses before storage.
- Unknown fields, missing required values, invalid email/URL/rating/choice, and supplied fake upload values return 400.
- The RPC is granted only to the service role; a transaction error returns 500 and does not write a partial candidate/submission pair.
- Candidate routes require the Supabase JWT and include `user_id = req.user.uid` on reads and writes. A missing or other-owner candidate returns 404.
- A MongoDB mirror or owner-notification failure is logged after the Supabase commit; it does not turn a saved application into a failed public response. Analytics sync can repair a missing mirror.
- Candidate status is one of `new`, `needs_contact_review`, `screening`, `interview`, `offer`, `hired`, `rejected`, or `withdrawn`.

## Shared dependencies and deployment order

Supabase Auth/JWT, Supabase Postgres, MongoDB analytics mirror, and optional owner email notification. The migration is applied and verified before API deployment because submission calls `record_form_submission`. Deploy API before frontend, test all template types, then refresh Sourcing. The email campaign and Agenda behavior is described in [09](./09-email-campaign-schedule.md); this milestone does not add candidate campaign history.
