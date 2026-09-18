# Feature Interconnections

Source: `docs/connections/01-13` (auth, GitHub, Calendar, Drive, analytics
overview/detail/sync/export, email schedule, draft lifecycle, deletion,
avatar, RAM).

## Hubs

| Hub | Consumers |
|---|---|
| Supabase JWT (`verifyToken` → `req.user.uid`) | All 12 features |
| Supabase Postgres (drafts, submissions, profiles, send_log) | Drafts 10, Analytics 05-07, Email 09, Avatar 12, Delete 11 |
| MongoDB (TemplateData/Submission, Email*, DriveToken, agendaJobs) | Analytics, Email, Drive 04, Scheduler |
| Agenda | Email schedule, draft activation, analytics reports |
| `ENCRYPTION_KEY` + `GOOGLE_CLIENT_ID/SECRET` | Drive 04 + Email 09 + Calendar 03 |

## Chains

- `10 Drafts → 07 Sync → 05 Overview → 06 Detail → 08 Export → 04 Drive`
- `10 Submit → 09 notify` (`sendFormSubmissionEmail`)
- `09 + 10` share `agendaJobs`; `02/03` Supabase-link vs `04` backend-OAuth
- `06` detail consumes `02` GitHub API; `12 Avatar → 11 Delete` cascade
- Dual-write pairs: `form_drafts↔TemplateData`, `form_submissions↔TemplateSubmission`, `EmailCampaign↔email_send_log`, `EmailConfig→EmailAccount`

## Cascade Table

Supabase down → auth/drafts/submit/sync/log/avatar-URL dead.
Mongo down → analytics/email/drive-tokens/Agenda stuck `scheduled`.
No `ENCRYPTION_KEY` → accounts + drive tokens fail.
Agenda stops → schedules/activations/reports never fire.
Same Google OAuth expiry → Calendar + Drive + Gmail fail together.
