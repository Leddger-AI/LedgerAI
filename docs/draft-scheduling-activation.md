# Draft Scheduling & Activation Feature

## Overview
Extended the Drafts page to allow scheduling when a draft's public form link becomes active, in addition to the existing expiry scheduling. Uses Agenda.js for reliable job scheduling with fallback auto-activation logic.

## Features Added

### 1. Draft Link Scheduling (Templates → Drafts)
- **Schedule toggle** in the Drafts right sidebar — switch between "Activate Now" and "Schedule"
- **Schedule mode** lets users pick:
  - **Goes Live At** — date/time when the public form link becomes accessible
  - **Expires At** — date/time when the link stops being accessible
- **Scheduled status** — drafts show a "Scheduled" badge with go-live and expiry times
- **Cancel schedule** — removes the Agenda job and resets draft to `draft` status
- **Copy link** — scheduled drafts show the public link (accessible only after go-live time)

### 2. Scheduled Forms Page (Templates → Schedule)
- New sidebar tab under Templates showing all scheduled form drafts
- Cards with draft title, template type icon, "Scheduled" badge
- Goes-live time with live countdown (e.g., "in 2d 5h")
- Expiry time display
- Copy link button
- Cancel schedule button

### 3. Email Campaign Scheduling (Inbox → Schedule)
- Schedule email campaigns for future delivery from the Email Automation modal
- Scheduled campaigns appear in the Schedule page under Inbox
- Cancel scheduled campaigns before they send

### 4. Email Send Log (Inbox → Sent)
- New `email_send_log` table in Supabase
- Logs all sent email campaigns with recipient count, sent/failed counts, timestamps
- SentView page displays send history

## Technical Implementation

### Database Changes
- **`form_drafts` table** — Added `goes_live_at TIMESTAMPTZ` column
- **`email_send_log` table** — New table for tracking email campaign sends
- **Migration SQL:**
  ```sql
  ALTER TABLE form_drafts ADD COLUMN goes_live_at TIMESTAMPTZ;
  ```

### Backend (server/)

#### New API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/drafts/scheduled` | Fetch all scheduled form drafts for the user |
| `PUT` | `/api/drafts/:draftId/schedule` | Schedule a draft to go live at a future time |
| `DELETE` | `/api/drafts/:draftId/schedule` | Cancel a scheduled draft activation |
| `GET` | `/api/email/send-log` | Fetch email send history |
| `GET` | `/api/email/send-log/:campaignId` | Fetch send log for a specific campaign |
| `POST` | `/api/email/schedule` | Schedule an email campaign for future delivery |
| `DELETE` | `/api/email/schedule/:campaignId` | Cancel a scheduled email campaign |
| `GET` | `/api/email/scheduled` | List all scheduled email campaigns |

#### Updated Endpoints
- **`GET /api/forms/:draftId`** (public form) — Now handles `scheduled` status:
  - Returns 403 with go-live time message if accessed before `goes_live_at`
  - **Fallback auto-activation**: If `now >= goes_live_at` but status is still `scheduled` (Agenda hasn't fired yet), auto-activates the draft on the fly

#### Agenda.js Scheduler (`server/scheduler.js`)
- **`activate form draft` job** — Sets draft status to `active` at scheduled `goes_live_at` time
- **`send email campaign` job** — Sends email campaign at scheduled time
- Functions: `scheduleDraftActivation()`, `cancelDraftActivation()`, `scheduleCampaign()`, `cancelScheduledCampaign()`
- Graceful shutdown via `stopAgenda()`

### Frontend (src/)

#### New Files
- `src/pages/ScheduledFormsView.jsx` — Templates schedule page showing scheduled form links
- `src/pages/ScheduleView.jsx` — Email schedule page showing scheduled email campaigns
- `src/pages/SentView.jsx` — Email send log page

#### Modified Files
- `src/App.jsx` — Sidebar restructuring, route mappings, lazy imports, nav calculations
- `src/pages/DraftsView.jsx` — Schedule toggle UI, go-live/expiry pickers, scheduled status panel, cancel schedule
- `src/EmailAutomationView.jsx` — Schedule button in Send Campaign modal, schedule date/time picker

### Sidebar Restructuring
- **Inbox**: Added Sent, Schedule tabs; removed Draft
- **Templates**: Restored Drafts and Active Links; added Schedule tab
- **Templates sidebar now has**: Student, Employee, Team, Drafts, Active, Schedule

## Deployment Fixes

### 1. Supabase Client Graceful Degradation
- `server/supabaseClient.js` — Exports `null` instead of crashing when `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are missing
- Prevents server crash on environments without env vars configured

### 2. Firebase Dependency Removal
- Deleted `src/firebaseAuth.js` — Dead file with firebase imports never used
- Removed `optimizeDeps.include` for firebase from `vite.config.js`
- Added `predev` script to clear Vite cache (`node_modules/.vite`) on each dev start

### 3. Render Environment Variables
All required env vars documented for Render deployment.

## Files Changed Summary

| File | Change |
|------|--------|
| `server/supabase_schema.sql` | Added `goes_live_at` column, `email_send_log` table |
| `server/supabaseClient.js` | Graceful null export when env vars missing |
| `server/scheduler.js` | New `activate form draft` job + scheduling functions |
| `server/index.js` | New endpoints, updated public form endpoint, send log |
| `src/App.jsx` | Sidebar, routes, imports, nav calc |
| `src/pages/DraftsView.jsx` | Schedule toggle, go-live picker, scheduled panel |
| `src/pages/ScheduledFormsView.jsx` | New — Templates schedule page |
| `src/pages/ScheduleView.jsx` | New — Email schedule page |
| `src/pages/SentView.jsx` | New — Email send log page |
| `src/EmailAutomationView.jsx` | Schedule button in send modal |
| `vite.config.js` | Removed firebase optimizeDeps |
| `package.json` | Added predev cache clear script |
| `src/firebaseAuth.js` | Deleted (dead code) |
