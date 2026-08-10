# Plan: Email Send Tracking + Scheduling Feature

**Date:** August 11, 2026  
**Status:** ✅ Implemented — All 5 phases complete

---

## Overview

Three interconnected features:
1. **Remove "Drafts" from sidebar** — Replace with a better navigation structure
2. **Email Send Log table in Supabase** — Track every email sent: which draft, which sender email, timestamp, recipient count
3. **Schedule Page** — Let users schedule email campaigns for future delivery, connected to the Email Automation view

---

## Part 1: Sidebar Restructuring

### Current State
The sidebar has these tabs in the "Inbox" section:
```
Email Automation | Email | Body | Roster Studio
Sent | Draft | Schedule | Files
```

And in "Templates" section:
```
Student | Employee | Team
Drafts | Active
```

### Problems
- `Drafts` appears twice (Templates section + as `Draft` in Inbox section)
- `Sent`, `Draft`, `Schedule` sidebar items exist but have **no view components** — clicking them does nothing
- Confusing navigation for email features

### Proposed Changes

**Remove from Templates section:**
- Remove `Drafts` and `Active Links` from Templates section

**Restructure Inbox section to:**
```
Email Automation | Email Body | Roster Studio
Sent | Schedule | Active Links | Files
```

**Rationale:**
- `Drafts` management is already accessible from within `Email Automation` view (draft cards with edit/delete/send buttons)
- `Active Links` moves to Inbox section (it's form-related, not a template builder)
- `Sent` gets a real view (email send log)
- `Schedule` gets a real view (scheduling page)
- `Draft` (singular) removed — redundant with Email Automation's draft management

---

## Part 2: Email Send Log Table (Supabase)

### New Table: `email_send_log`

```sql
CREATE TABLE IF NOT EXISTS email_send_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  campaign_id TEXT,
  draft_id TEXT,
  draft_title TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  recipient_count INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Fields Explained

| Field | Purpose |
|-------|---------|
| `user_id` | Which user sent the campaign (RLS) |
| `campaign_id` | MongoDB `EmailCampaign._id` (as string for cross-reference) |
| `draft_id` | MongoDB `EmailDraft._id` (as string for cross-reference) |
| `draft_title` | Subject/title of the email draft at time of sending |
| `sender_email` | Email address used to send — either user's configured email or `ai.leddger@gmail.com` (platform default) |
| `recipient_count` | Total recipients in the campaign |
| `sent_count` | Successfully delivered |
| `failed_count` | Failed deliveries |
| `status` | `sent`, `failed`, `scheduled`, `cancelled` |
| `sent_at` | When the campaign was actually sent |

### RLS Policy

```sql
ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own email send log" ON email_send_log
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_email_send_log_user_id ON email_send_log(user_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_sent_at ON email_send_log(sent_at DESC);
```

### Sender Email Logic

When a campaign is sent:
1. Check if user has an `EmailConfig` in MongoDB with their own email
2. If yes → use `config.email` as `sender_email`
3. If no → use `ai.leddger@gmail.com` (platform default, via env vars)
4. Store the actual `sender_email` in the `email_send_log` row

### Backend Changes (`server/index.js`)

**After successful campaign send** (in `POST /api/email/send`):
```js
// Insert into Supabase email_send_log
await supabase.from('email_send_log').insert({
  user_id: req.user.uid,
  campaign_id: campaign._id.toString(),
  draft_id: draftId,
  draft_title: draft.subject || 'Untitled',
  sender_email: config.email,
  recipient_count: recipients.length,
  sent_count: sentCount,
  failed_count: failedCount,
  status: campaign.status,
  sent_at: new Date().toISOString()
});
```

**New API Endpoints:**
- `GET /api/email/send-log` — All send log entries for the user (paginated, sorted by `sent_at DESC`)
- `GET /api/email/send-log/:campaignId` — Single send log entry by campaign ID

---

## Part 3: Email Scheduling

### Research Findings

Three approaches evaluated for enterprise-level email scheduling:

### Option A: Agenda.js + MongoDB (RECOMMENDED)

**How it works:**
- Agenda is a lightweight job scheduling library that uses MongoDB as its persistence layer
- Jobs survive server restarts (stored in MongoDB `agendaJobs` collection)
- Supports one-time scheduling (`agenda.schedule('in 2 hours', 'send email', data)`)
- Supports cron-based recurring jobs (`agenda.every('0 9 * * 1', 'send email', data)`)
- Built-in retry with exponential backoff
- Distributed locking for multi-instance deployments
- Graceful shutdown support

**Pros:**
- **Zero new infrastructure** — Uses existing MongoDB (already in the stack)
- Jobs persist across restarts
- Well-maintained, production-tested (used by Forward Email, Lad, Ghost)
- ESM + CJS support, TypeScript types
- Simple API: `agenda.define()`, `agenda.schedule()`, `agenda.every()`
- Free and open source

**Cons:**
- MongoDB backend uses polling (30s default) — not instant (fine for email scheduling)
- For real-time notifications, would need Redis (not needed for our use case)

**Implementation:**
```
npm install agenda @agendajs/mongo-backend
```

### Option B: BullMQ + Redis

**How it works:**
- Redis-based job queue with delayed job support
- Built-in rate limiting, priorities, retries
- Worker processes jobs from the queue

**Pros:**
- Very fast (Redis in-memory)
- Real-time job processing
- Built-in rate limiting
- Mature ecosystem

**Cons:**
- **Requires Redis** — new infrastructure to deploy and maintain
- More complex setup
- Overkill for email scheduling (designed for high-throughput queues)

### Option C: node-cron (Simplest)

**How it works:**
- Pure JavaScript cron scheduler, zero dependencies
- Schedule functions to run at specific times
- No persistence — jobs lost on restart

**Pros:**
- Zero dependencies
- Simplest setup
- No extra infrastructure

**Cons:**
- **No persistence** — scheduled emails lost if server restarts
- Not suitable for production email scheduling
- No retry logic
- No distributed coordination

### Option D: MongoDB Native Queue (DIY)

**How it works:**
- Store scheduled emails as MongoDB documents with `scheduledAt` timestamp
- Worker loop polls for due emails using `findOneAndUpdate` with atomic claiming
- Status tracking: `pending → processing → sent → failed`

**Pros:**
- No new dependencies
- Full control over logic
- Uses existing MongoDB

**Cons:**
- More code to maintain
- Need to implement retry logic manually
- Need to handle worker crashes, zombie jobs, etc.
- Reinventing what Agenda already does

### Decision: Option A (Agenda.js + MongoDB)

**Rationale:**
1. Uses existing MongoDB — no new infrastructure
2. Jobs persist across server restarts (critical for scheduled emails)
3. Built-in retry, concurrency, and distributed locking
4. Lightweight and well-maintained
5. Simple API that integrates cleanly with existing Express server
6. Production-tested by major projects

---

### Scheduling Architecture

```
User clicks "Schedule" in Send Campaign modal
    ↓
Frontend navigates to Schedule page with campaign data
    ↓
User picks date/time + recurrence (one-time, daily, weekly)
    ↓
POST /api/email/schedule
    ↓
Backend creates EmailCampaign (status: 'scheduled')
    ↓
Backend creates Agenda job: agenda.schedule(sendAt, 'send email campaign', { campaignId })
    ↓
Agenda stores job in MongoDB (survives restarts)
    ↓
At scheduled time, Agenda fires job
    ↓
Worker sends emails via Nodemailer using user's EmailConfig
    ↓
Insert into Supabase email_send_log
    ↓
Update EmailCampaign status to 'sent'
```

### New Files

| File | Purpose |
|------|---------|
| `server/scheduler.js` | Agenda setup, job definitions, start/stop |
| `server/jobs/sendCampaign.js` | Job handler: sends scheduled email campaign |
| `src/ScheduleView.jsx` | Schedule page UI |
| `src/ScheduleView.css` | Schedule page styles |

### Modified Files

| File | Changes |
|------|---------|
| `server/index.js` | Import scheduler, add schedule/cancel endpoints, insert send log after send |
| `server/supabase_schema.sql` | Add `email_send_log` table + RLS + indexes |
| `src/App.jsx` | Remove Drafts from sidebar, add Sent/Schedule views, add routing |
| `src/EmailAutomationView.jsx` | Add "Schedule" button next to "Send" in campaign modal |
| `server/models/EmailCampaign.js` | Add `scheduledAt`, `recurrencePattern` fields |

### New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `POST /api/email/schedule` | POST | Schedule a campaign for future delivery |
| `GET /api/email/scheduled` | GET | List all scheduled campaigns |
| `DELETE /api/email/schedule/:campaignId` | DELETE | Cancel a scheduled campaign |
| `GET /api/email/send-log` | GET | Email send history from Supabase |
| `GET /api/email/send-log/:campaignId` | GET | Single send log entry |

### Schedule Page UI

The Schedule page will show:
1. **Upcoming Scheduled Campaigns** — Cards with campaign name, draft subject, scheduled time, recurrence pattern, cancel button
2. **Schedule New Campaign** — Form to select a draft, pick recipients (CSV/manual), choose:
   - **One-time**: Date/time picker for exact send time
   - **Recurring**: Daily/weekly/monthly with cron-like options
3. **Send History** — Table showing all past sends (from `email_send_log`) with draft title, sender email, recipient count, status, timestamp

### Send Campaign Modal Integration

In `EmailAutomationView.jsx`, the Send Campaign modal gets two buttons:
- **Send Now** (existing) — Immediately sends via `POST /api/email/send`
- **Schedule** (new) — Navigates to Schedule page with pre-filled campaign data (draft, recipients, variable mappings)

---

## Implementation Phases

### Phase 1: Database + Send Log (Estimated: 30 min)
1. Add `email_send_log` table to `supabase_schema.sql`
2. Insert send log entry after campaign send in `server/index.js`
3. Add `GET /api/email/send-log` endpoint
4. Create `SentView.jsx` to display send history

### Phase 2: Sidebar Restructuring (Estimated: 15 min)
1. Remove `Drafts` from Templates section in sidebar
2. Remove `Draft` from Inbox section
3. Add `Sent` → `SentView`, `Schedule` → `ScheduleView` routing
4. Move `Active Links` to Inbox section

### Phase 3: Agenda.js Setup (Estimated: 30 min)
1. Install `agenda` and `@agendajs/mongo-backend`
2. Create `server/scheduler.js` with Agenda initialization
3. Define `send email campaign` job handler
4. Start Agenda on server boot, graceful shutdown on SIGTERM

### Phase 4: Schedule API + UI (Estimated: 45 min)
1. Add `POST /api/email/schedule` endpoint
2. Add `GET /api/email/scheduled` endpoint
3. Add `DELETE /api/email/schedule/:campaignId` endpoint
4. Create `ScheduleView.jsx` with scheduling form + upcoming campaigns list
5. Add "Schedule" button in Send Campaign modal that navigates to Schedule page

### Phase 5: Testing + Polish (Estimated: 20 min)
1. Test immediate send → verify send log entry
2. Test scheduled send → verify Agenda job created
3. Test cancel scheduled campaign
4. Build verification
5. Update documentation

---

## Dependencies to Install

```bash
npm install agenda @agendajs/mongo-backend
```

No Redis required. No new infrastructure needed.

---

## Environment Variables

No new env vars needed. Agenda uses the existing `MONGODB_URI`.

The platform default email (`ai.leddger@gmail.com`) should be set as:
```
GOOGLE_EMAIL=ai.leddger@gmail.com
```
(Already exists in the env setup — this is the fallback when no user EmailConfig is found.)
