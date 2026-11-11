# 09: Email Campaign Workflow

## User journey and API flow

```text
Email Automation
  → create/select draft and sender account
  → import CSV/XLSX or add recipients
  → map variables and preview rendered rows
  → POST /api/email/send (202, queued) OR POST /api/email/schedule (200, scheduled)
  → GET /api/email/campaigns/:id for progress
  → Sent Emails for sent/partial/failed/needs_review and selected retry
  → Schedule for future campaigns and cancellation
```

Both creation endpoints use `server/utils/emailCampaignFlow.js`. They validate the same input, resolve an owner-scoped draft/account, and store a snapshot of the subject, HTML body, sender email, recipients, and mapped variables in `EmailCampaign`. The frontend sends a request ID. Repeating that ID returns the same campaign rather than scheduling twice. Older callers can omit it.

The Email page and Body editor normalize placeholders when saving a draft: `{{First Name}}` becomes `{{first_name}}`, and `{{E-mail}}` becomes `{{email}}`. Delivery applies the same normalization to older drafts. Only variables actually used by a draft need values. The Send modal can take values from mapped spreadsheet columns or manual recipient fields; email, name, and the selected sender fill the matching built-in variables. Invalid spreadsheet email rows are quarantined before submission. A campaign accepts up to 500 valid recipients; larger files must be split.

The existing API service starts Agenda after MongoDB connects. On startup it first marks previously `sending` recipients `unknown`, then starts Agenda and requeues waiting campaigns. `GET /api/email/worker-health` reports whether MongoDB is connected and all Agenda job processors are registered. The backend must remain awake for timely scheduled sends.

## Delivery states

| State | Meaning |
|---|---|
| `queued` | Send Now accepted; worker has not claimed it |
| `scheduled` | Waiting for the chosen time; can be cancelled |
| `sending` | Worker atomically claimed the campaign |
| `sent` | Every attempted recipient sent successfully |
| `partial` | Some sent and others failed or were suppressed |
| `failed` | No recipients sent |
| `needs_review` | A recipient is pending or has an uncertain result after interruption |
| `cancelled` | Future delivery was cancelled before worker claim |

The worker in `server/scheduler.js` delegates to `processCampaign`. It checks suppression and the 24-hour send limit at delivery time, escapes mapped values in HTML, persists each recipient result, and calculates final counts from saved recipient states. A result left `sending` after interruption becomes `unknown` on recovery; no automatic retry occurs. Neither SMTP nor Gmail HTTPS can guarantee exactly once across a crash or lost response.

On Render Free, set `EMAIL_TRANSPORT=gmail_api` to send with a Gmail OAuth2 account over HTTPS. `server/utils/gmailApiTransport.js` uses Nodemailer to compose MIME and the Gmail `users.messages.send` API to submit it. The OAuth token must include the `gmail.send` scope. API timeouts, lost responses, 429, and server errors become `unknown` for manual review; definitive authorization errors become failed results. App-password SMTP accounts cannot send on this Free service because outbound ports 465 and 587 are blocked. The global notification and OTP sender uses the same HTTPS option.

Agenda v6 cancellation uses a nested `data` filter (for example `{ name: 'send email campaign', data: { campaignId } }`). A dotted `data.campaignId` option is ignored and would cancel every campaign job with that name. The real Agenda integration test checks that scheduling and cancelling one campaign preserves another.

`GET /api/email/campaigns?status=...` feeds Recent Campaigns and Sent Emails from MongoDB. The draft list returns a short `bodyPreview`; opening a draft fetches its full body. Schedule displays the campaign's frozen subject. `POST /api/email/campaigns/:id/retry` creates a linked campaign for selected failed or pending recipients. Unknown recipients require `includeUnknown: true` and an explicit UI confirmation. The old Supabase `email_send_log` remains for compatibility and is upserted once per campaign after delivery. Apply `server/email_send_log_migration.sql` to an existing Supabase database before deployment.

## Unsubscribe and failure paths

The worker places a signed campaign and recipient token in the human unsubscribe URL. `/unsubscribe` asks for confirmation and calls `POST /api/email/unsubscribe` with `{ token }`. For mailbox one-click controls, the message also carries `List-Unsubscribe` with the public API URL `/api/email/unsubscribe/one-click?token=...` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. GET on that API URL redirects to the confirmation page without changing suppression. Only a valid RFC 8058 POST suppresses the address. The backend verifies the signature and that the address belongs to the campaign. Rotating `ENCRYPTION_KEY` invalidates previously issued links.

If scheduling fails, the campaign is marked failed with `lastError`, and the API returns 503. If the sender account or draft is unavailable at delivery time, the campaign ends in a reviewable failure state. A failed Supabase log write does not hide the MongoDB campaign result in the UI. Cancellation only succeeds while the campaign is still scheduled; a worker claim wins the race.

## Configuration and verification

Requires MongoDB, Supabase, `ENCRYPTION_KEY` (64 hex characters), sender account credentials, and `FRONTEND_URL`. Set `PUBLIC_API_URL` to the externally reachable HTTPS backend origin; Render's `RENDER_EXTERNAL_URL` is used when it is omitted. Monitor `/api/email/worker-health` for HTTP 200. The current Render Free service sleeps after idle time, so scheduled sends may be delayed until it wakes; timely scheduled delivery requires an always-on service. The email and scheduler tests cover queueing, snapshots, idempotency, delivery results, recovery, retry, unsubscribe tokens and one-click POST, a real Agenda processor, and scheduled delivery through an API restart with isolated MongoDB and local SMTP. On 8 November 2026, the branch build on the active Render service returned worker health 200; a controlled Gmail HTTPS self-send, immediate campaign, scheduled campaign, duplicate request, and one Supabase log per campaign passed. On 11 November, the merged `main` deployment returned worker health 200 after startup. The hosted schedule check did not include a restart.

For isolated UI testing, run `node tests/fixtures/localSmtp.js` and `node tests/fixtures/localEmailDevServer.js` in separate terminals from `server/`. In the repository root, start Vite with `VITE_LOCAL_EMAIL_TEST=true`, `VITE_SUPABASE_URL=http://127.0.0.1:59999`, and `VITE_SUPABASE_ANON_KEY=local-only`. Configure the sender as `sender@example.invalid`, SMTP host `127.0.0.1`, port `2525`, with any local-only app password. These fixtures use temporary in-memory MongoDB, drop SMTP messages, and authenticate a test user only in the Vite development build. The test data disappears when the API process stops.
