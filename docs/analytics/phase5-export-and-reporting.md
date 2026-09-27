# Analytics Phase 5 — Export & Scheduled Reports

Adds local file downloads (CSV / JSON / PDF) for analytics data and recurring scheduled reports that email analytics to a list of recipients on a daily, weekly, or monthly cadence.

## Table of Contents

- [Architecture](#architecture)
- [Backend Changes](#backend-changes)
  - [New Files](#new-files)
  - [Modified Files](#modified-files)
  - [API Endpoints](#api-endpoints)
  - [Agenda Job](#agenda-job)
- [Frontend Changes](#frontend-changes)
- [Data Flow](#data-flow)
- [Security](#security)
- [Testing](#testing)

---

## Architecture

```
User clicks "Download" → frontend fetches /api/analytics/export/*
  → analyticsExport.js builds CSV/JSON/PDF content
  → response streamed as attachment → browser saves file

User creates scheduled report → POST /api/analytics/reports
  → AnalyticsReport doc created in MongoDB
  → scheduleAnalyticsReport() registers recurring Agenda job
  → Agenda fires on cadence → job builds report + emails to recipients
```

The Phase 5 export logic is centralized in `server/utils/analyticsExport.js` so that both the **Google Drive export endpoints** (Phase 7) and the new **local download endpoints** share the same CSV/JSON/PDF serialization. This eliminated the duplicated CSV construction that previously lived inline in the Drive handlers.

---

## Backend Changes

### New Files

| File | Purpose |
|------|---------|
| `server/utils/analyticsExport.js` | Pure builders for overview & template exports in CSV/JSON/PDF. Also exposes `slugify`, `rowsToCsv` helpers. |
| `server/models/AnalyticsReport.js` | Mongoose model for scheduled report configs (frequency, scope, format, recipients, status, capped run history). |
| `server/tests/analyticsExport.test.js` | 34 tests covering the export util, model, download endpoints, and scheduled report CRUD. |

### Modified Files

| File | Change |
|------|--------|
| `server/index.js` | Required `AnalyticsReport` model + `analyticsExport` util + new scheduler helpers. Refactored both Drive export endpoints to use the shared util (DRY). Added 6 new endpoints (2 download, 4 report CRUD). Added `AnalyticsReport` to both account-deletion cleanup lists. |
| `server/scheduler.js` | Defined `send analytics report` Agenda job. Added `scheduleAnalyticsReport(reportId, frequency)` and `cancelAnalyticsReport(reportId)` helpers + exports. Job uses `buildOverviewContent` / `buildTemplateContent` from `analyticsExport.js` and emails the file as an attachment. |
| `server/utils/emailService.js` | Exported `createTransporter` so the scheduler job can fall back to the global Gmail OAuth2 transporter when a user has no configured `EmailAccount`. |
| `server/package.json` | Added `pdfkit@^0.16.0` for PDF generation. |

### API Endpoints

#### Local Download Exports

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/analytics/export/overview?format=csv\|json\|pdf` | Download the overview analytics report as a local file. |
| `GET` | `/api/analytics/export/templates/:draftId?format=csv\|json\|pdf` | Download a per-template analytics report as a local file. |

- All formats return a `Content-Disposition: attachment` response with the appropriate `Content-Type`.
- Unknown `format` values fall back to `csv`.
- `format=pdf` returns a Buffer with `application/pdf` (PDF magic bytes `%PDF`).
- All endpoints are behind `verifyToken` and scoped to `req.user.uid`; a user cannot download another user's template export (404).

#### Scheduled Reports CRUD

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/analytics/reports` | Create a scheduled report and register the Agenda job. |
| `GET` | `/api/analytics/reports` | List all reports for the authenticated user (newest first). |
| `PUT` | `/api/analytics/reports/:id` | Update name / frequency / format / recipients / status (pause/resume). Reschedules the Agenda job when needed. |
| `DELETE` | `/api/analytics/reports/:id` | Delete a report and cancel its Agenda job. |

**POST body:**

```json
{
  "name": "Weekly Overview Digest",
  "frequency": "weekly",
  "scope": "overview",
  "draftId": null,
  "format": "pdf",
  "recipientEmails": ["alice@example.com", "bob@example.com"]
}
```

- `frequency` ∈ `daily | weekly | monthly`
- `scope` ∈ `overview | template` (template requires `draftId`)
- `format` ∈ `csv | json | pdf` (defaults to `csv`)
- `recipientEmails` must be a non-empty array

**PUT body:** any subset of `{ name, frequency, format, recipientEmails, status }`. `status` ∈ `active | paused`. On every PUT the existing Agenda job is cancelled; if the resulting status is `active`, a new job is scheduled with the (possibly updated) frequency.

### Agenda Job

Defined in `server/scheduler.js`:

```js
agenda.define('send analytics report', { priority: 'normal', concurrency: 1 }, async (job) => {
  const { reportId } = job.attrs.data;
  // 1. Load AnalyticsReport; skip if missing or paused
  // 2. Build content via buildOverviewContent / buildTemplateContent
  // 3. Resolve transporter: user's EmailAccount (preferred) or global Gmail
  // 4. Email the report as an attachment to every recipient
  // 5. pushRun() onto the report (capped at 20 entries) and save
});
```

Scheduled via `agenda.every(interval, 'send analytics report', { reportId })` where `interval` is `1 day`, `1 week`, or `1 month`. Jobs persist in MongoDB (`agendaJobs` collection), so they survive server restarts.

---

## Frontend Changes

### New Files

| File | Purpose |
|------|---------|
| `src/components/AnalyticsExportMenu.jsx` | Reusable dropdown that triggers a local file download. Used in both the overview header and the template detail header. Reads the filename from the `Content-Disposition` header. |
| `src/components/ScheduledReportsPanel.jsx` | Self-contained panel for creating, listing, pausing/resuming, and deleting scheduled reports. Includes a creation form with name, frequency, scope, template picker, format, and recipients. |

### Modified Files

| File | Change |
|------|--------|
| `src/pages/AnalyticsPage.jsx` | Imported the two new components. Added `<AnalyticsExportMenu endpoint="/api/analytics/export/overview" />` next to the existing "Save to Drive" button. Added `<ScheduledReportsPanel templates={templates} />` below the templates table. |
| `src/pages/TemplateDetailAnalytics.jsx` | Imported `AnalyticsExportMenu`. Added `<AnalyticsExportMenu endpoint={\`/api/analytics/export/templates/${draftId}\`} />` next to the existing "Save to Drive" button. |
| `src/pages/AnalyticsPage.css` | Added styles for `.analytics-export-menu`, `.analytics-export-trigger`, `.analytics-export-dropdown`, `.analytics-export-option`, `.analytics-reports-panel`, `.analytics-report-form`, `.analytics-form-row`, `.analytics-form-input`, `.analytics-form-select`, `.analytics-reports-actions`, `.analytics-reports-icon-btn`. |

---

## Data Flow

### Local Download

```
AnalyticsPage header
  └─ <AnalyticsExportMenu endpoint="/api/analytics/export/overview" />
       └─ user picks CSV/JSON/PDF
            └─ fetch(GET /api/analytics/export/overview?format=pdf, { Authorization })
                 └─ buildOverviewExportData(uid) → analyticsUtils aggregations
                 └─ overviewToPdf(data) → PDFDocument → Buffer
                 └─ res.attachment(filename).send(buffer)
            └─ blob → <a download> → browser saves file
```

### Scheduled Report

```
ScheduledReportsPanel
  └─ user fills form → POST /api/analytics/reports
       └─ AnalyticsReport.create(...)
       └─ scheduleAnalyticsReport(reportId, 'weekly')
            └─ agenda.every('1 week', 'send analytics report', { reportId })

[1 week later]
  └─ Agenda fires 'send analytics report' job
       └─ load AnalyticsReport
       └─ buildOverviewContent(uid, 'pdf') → { content, mimeType, ext }
       └─ resolve transporter (EmailAccount or global Gmail)
       └─ transporter.sendMail({ from, to, subject, html, attachments })
       └─ report.pushRun({ status, error, recipients }); report.save()
```

---

## Security

- All endpoints are behind `verifyToken` and scoped to `req.user.uid`.
- A user cannot download or manage another user's reports or template exports (returns 404, not 403, to avoid leaking existence).
- Scheduled report emails are sent from the user's own configured `EmailAccount` when available; the global Gmail fallback (`process.env.GOOGLE_EMAIL`) is only used when the user has no configured account.
- `AnalyticsReport` documents are cleaned up on account deletion (added to both deletion cleanup lists in `server/index.js`).
- The Agenda job skips execution if the report is `paused` or missing, so cancelled/deleted reports never send email.

---

## Testing

`server/tests/analyticsExport.test.js` — 34 tests, all passing:

- **AnalyticsReport model** (5): defaults, enum validation for frequency/scope/format, `pushRun` cap at 20 entries + `lastRun*` field updates.
- **analyticsExport utilities** (6): `rowsToCsv` quoting/escaping, `slugify`, `overviewToCsv`, `overviewToJson`, `templateToCsv`, `templateToJson`.
- **GET /api/analytics/export/overview** (5): CSV/JSON/PDF content-types, PDF magic bytes, unknown-format fallback, empty-data case.
- **GET /api/analytics/export/templates/:draftId** (4): CSV, PDF, 404 for missing template, 404 for another user's template.
- **POST /api/analytics/reports** (6): successful create + scheduler call, invalid frequency, template scope without draftId, non-existent draftId, empty recipients, default format.
- **GET /api/analytics/reports** (2): user isolation, empty list.
- **PUT /api/analytics/reports/:id** (4): pause cancels job without reschedule, frequency change reschedules, field updates, 404 for other user.
- **DELETE /api/analytics/reports/:id** (2): deletes + cancels job, 404 for other user.

Run with:

```bash
cd server && npx jest --config jest.config.js tests/analyticsExport.test.js --forceExit
```

Full suite (9 suites, 217 tests) continues to pass.
