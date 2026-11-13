# Command Center workflow

Updated: 13 November 2026. Implementation is on the `codex/command-center-workflow` branch and is not yet a production deployment.

## Purpose and scope

The Command Center is the entry point for the connected application → candidate → email journey. It makes one authenticated `GET /api/command-center` request for a read-only snapshot, then routes actions to the existing feature screens. Form publishing, candidate status changes, and campaign creation retain their established domain APIs. This keeps write validation and audit behavior in one place per domain and avoids making the browser a database administrator.

```text
Sign in → /dashboard/command-center → getAuthToken()
  → GET /api/command-center → verifyToken → req.user.uid
     ├─ Supabase: form_drafts, form_submissions, candidates, meetings, alerts
     └─ MongoDB: EmailCampaign, EmailAccount, Spreadsheet
  → source health + counts + bounded review queues
  → Drafts / Sourcing / Email Automation / Sent / Schedule / Files
```

## Data ownership and access

`src/pages/CommandCenterView.jsx` calls the API once on entry and on manual refresh. `server/index.js` verifies the Supabase token. `server/utils/commandCenter.js` applies `user_id = req.user.uid` to every Supabase query and `ownerUid = req.user.uid` to every MongoDB query. The response contains small lists of applications, candidates needing contact review, and nonterminal or reviewable campaigns; it does not send recipient lists, message HTML, credentials, or raw database documents.

| Card | Source | Meaning | Opens |
|---|---|---|---|
| Active forms | Supabase `form_drafts` | `status = active` | Active Links |
| Submissions | Supabase `form_submissions` | All owner submissions, including repeat applications | Sourcing |
| Candidates | Supabase `candidates` | Distinct candidate records | Sourcing |
| Need contact review | Supabase `candidates` | `needs_contact_review` | Sourcing |
| Queued and scheduled emails | MongoDB `EmailCampaign` | Campaign status | Sent / Schedule |
| Delivery review | MongoDB `EmailCampaign` | `partial`, `failed`, `needs_review` | Sent |
| Saved recipient files | MongoDB `Spreadsheet` | Owner files | Files |
| Upcoming meetings | Supabase `meetings` | Start time later than the snapshot time | Calendar |
| Open alerts | Supabase `alerts` | `resolved = false` | Alerts |

Sender account count is also returned for future connection diagnostics. Worker state uses Mongo connection, Agenda readiness, and startup reconciliation, the same readiness conditions as `/api/email/worker-health`.

## Failure behavior

Queries run independently. If a count fails, the field remains `null` and the UI shows `—`; it is never displayed as zero. A source is marked ready only when every query in that group succeeds. The page can still show the other source's results. If the whole HTTP request fails, the page shows a retry message and preserves the last successful snapshot for context. The worker may show `starting` while the Render service reconnects or reconciles jobs.

## Boundaries and next connections

The Command Center is a live workflow navigator and monitoring snapshot. It does not yet support candidate-selected email audiences, candidate-linked interviews, persistent project or team entities, or database administration. Those remain future roadmap work in [connected-features.md](../roadmap/connected-features.md). The Render Free service can sleep, so scheduled sends may start late; the worker state reflects readiness after wake, not a delivery guarantee.

See [applications to candidates](./14-application-candidate-lifecycle.md), [email campaign lifecycle](./09-email-campaign-schedule.md), and [Command Center change record](../changes/command-center-workflow.md).
