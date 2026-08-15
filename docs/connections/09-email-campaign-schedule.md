# 09: Email Campaign Scheduling

## Feature Summary

User composes an email campaign (subject + body + recipients), then either sends immediately or schedules it for a future date/time. Scheduled campaigns are processed by Agenda (MongoDB-backed job scheduler) which triggers nodemailer to send individual emails with variable substitution. Results are logged to Supabase.

## ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (EmailAutomationView.jsx)                              │
│                                                                   │
│  User composes campaign:                                          │
│  ├─ Select email draft (subject + body HTML)                     │
│  ├─ Select recipients (from spreadsheet data source)             │
│  ├─ Choose email account (sender)                                │
│  └─ Click "Send Now" OR "Schedule"                               │
│                                                                   │
│  SEND NOW:                                                        │
│  └─ POST /api/email/send                                         │
│     Body: { draftId, recipients, campaignName, accountId }       │
│                                                                   │
│  SCHEDULE:                                                        │
│  └─ POST /api/email/schedule                                     │
│     Body: { draftId, recipients, campaignName,                    │
│             scheduledAt, accountId }                             │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — SEND NOW (server/index.js:1351)                       │
│  POST /api/email/send                                             │
│  ├─ verifyToken → req.user.uid                                   │
│  ├─ Validate: draftId, recipients, accountId required            │
│  ├─ Fetch EmailDraft from MongoDB                                │
│  ├─ Fetch EmailAccount from MongoDB                              │
│  ├─ Create EmailCampaign in MongoDB (status: 'sending')         │
│  ├─ Build transporter from account config:                       │
│  │  ├─ OAuth2: googleapis + refresh token → access token        │
│  │  └─ SMTP: nodemailer.createTransport({ host, port, auth })   │
│  │                                                                │
│  ├─ For each recipient:                                          │
│  │  ├─ Substitute {{variables}} in subject and body             │
│  │  ├─ transporter.sendMail({ from, to, subject, html })        │
│  │  ├─ Mark recipient.status = 'sent' or 'failed'              │
│  │  └─ Increment sentCount / failedCount                        │
│  │                                                                │
│  ├─ Update campaign: status, sentCount, failedCount, sentAt     │
│  ├─ Insert into Supabase email_send_log                          │
│  └─ res.json({ campaignId, sentCount, failedCount })            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — SCHEDULE (server/index.js:1526)                       │
│  POST /api/email/schedule                                         │
│  ├─ verifyToken → req.user.uid                                   │
│  ├─ Validate: draftId, recipients, scheduledAt, accountId       │
│  ├─ Fetch EmailDraft + EmailAccount                              │
│  ├─ Create EmailCampaign (status: 'scheduled', scheduledAt)     │
│  ├─ scheduleCampaign(campaignId, sendDate) → scheduler.js:181   │
│  │  ├─ getAgenda() → Agenda instance (MongoDB-backed)           │
│  │  └─ agenda.schedule(sendAt, 'send email campaign', { id })  │
│  └─ res.json({ campaignId, scheduledAt })                       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼ (at scheduled time)
┌─────────────────────────────────────────────────────────────────┐
│  AGENDA SCHEDULER (server/scheduler.js:20)                       │
│  Job: 'send email campaign'                                      │
│  ├─ Fetch EmailCampaign from MongoDB by campaignId              │
│  ├─ Skip if already sent/cancelled                               │
│  ├─ Fetch EmailDraft + EmailConfig                               │
│  ├─ Build transporter (OAuth2 or SMTP)                           │
│  ├─ For each recipient:                                          │
│  │  ├─ Substitute {{variables}} in subject and body             │
│  │  ├─ transporter.sendMail({ from, to, subject, html })        │
│  │  └─ Update recipient.status                                   │
│  ├─ Update campaign: status='sent', counts, sentAt              │
│  ├─ Insert into Supabase email_send_log                          │
│  └─ console.log(`Campaign ${id} sent: X sent, Y failed`)        │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  CANCEL SCHEDULED CAMPAIGN                                        │
│  DELETE /api/email/schedule/:campaignId (server/index.js:1601)   │
│  ├─ Find campaign in MongoDB                                     │
│  ├─ cancelScheduledCampaign(campaignId) → scheduler.js:187      │
│  │  └─ agenda.cancel({ name: 'send email campaign',             │
│  │                     'data.campaignId': id })                  │
│  ├─ Update campaign.status = 'cancelled'                        │
│  └─ res.json({ message: 'Cancelled' })                          │
└─────────────────────────────────────────────────────────────────┘
```

## File-by-File Trace

| Step | File | Lines | What Happens |
|------|------|-------|--------------|
| 1. Send now | `server/index.js` | 1351-1460 | `POST /api/email/send` |
| 2. Schedule | `server/index.js` | 1526-1584 | `POST /api/email/schedule` |
| 3. Cancel schedule | `server/index.js` | 1601-1622 | `DELETE /api/email/schedule/:id` |
| 4. List campaigns | `server/index.js` | 1498-1508 | `GET /api/email/campaigns` |
| 5. Send log | `server/index.js` | 1464-1478 | `GET /api/email/send-log` |
| 6. Agenda define | `server/scheduler.js` | 20-152 | `agenda.define('send email campaign')` |
| 7. Schedule job | `server/scheduler.js` | 181-185 | `scheduleCampaign()` |
| 8. Cancel job | `server/scheduler.js` | 187-191 | `cancelScheduledCampaign()` |
| 9. Agenda start | `server/scheduler.js` | 174-178 | `agenda.start()` on first call |
| 10. Stop on shutdown | `server/scheduler.js` | 205-210 | `stopAgenda()` on SIGTERM/SIGINT |

## Shared Dependencies

- **Agenda** — MongoDB-backed job scheduler (`@agendajs/mongo-backend`)
- **MongoDB** — `EmailCampaign`, `EmailDraft`, `EmailConfig`, `EmailAccount` collections + `agendaJobs` collection
- **Supabase** — `email_send_log` table for audit trail
- **nodemailer** — email sending (OAuth2 Gmail or SMTP)
- **googleapis** — Gmail OAuth2 access token refresh (lazy-loaded)
- **Supabase Auth** — JWT for API authentication

## Error Paths

| Scenario | What Happens |
|----------|-------------|
| No email account configured | 400: "No email account configured" |
| Draft not found | 400: "Draft not found" |
| Transporter fails | Individual recipient marked 'failed', campaign continues |
| All recipients fail | Campaign status = 'failed' |
| Agenda job fails | Campaign stays 'scheduled', logged to console |
| Cancel non-scheduled campaign | 400: "Campaign is not scheduled" |

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | Yes | MongoDB connection (Agenda + email models) |
| `SUPABASE_URL` | Yes | Supabase for email_send_log |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role |
| `GOOGLE_CLIENT_ID` | For Gmail OAuth2 | Gmail sender auth |
| `GOOGLE_CLIENT_SECRET` | For Gmail OAuth2 | Gmail sender auth |
| `GOOGLE_REFRESH_TOKEN` | For Gmail OAuth2 | Gmail token refresh |
| `GOOGLE_EMAIL` | For Gmail OAuth2 | Gmail sender address |
