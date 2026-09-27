# Analytics Feature — Overview

## Table of Contents

- [Phase 1: Backend MongoDB Models & API Endpoints](./phase1-backend-mongodb-models-api.md)
- [Phase 2: Frontend Analytics Page](./phase2-frontend-analytics-page.md)
- [Phase 3: GitHub Role & Tech Stack Analysis](./phase3-github-role-techstack-analysis.md)
- [Phase 4: Testing & Polish](./phase4-testing-and-polish.md)
- [Phase 5: Export & Scheduled Reports](./phase5-export-and-reporting.md)

## Architecture Summary

The analytics feature provides template-based data insights for the Leddger-AI platform. It enables users to view submission trends, field-level completion rates, rating distributions, and GitHub profile analysis — all driven by data collected through user-created templates (Student, Employee, Team).

### Data Flow

```
User creates template (Student/Employee/Team Builder)
  → Saved to Supabase (form_drafts) as primary store
  → Synced to MongoDB (TemplateData) for analytics  [Phase 1]

Candidate submits form via public portal
  → Saved to Supabase (form_submissions) as primary store
  → Synced to MongoDB (TemplateSubmission) for analytics  [Phase 1]

User opens Analytics page
  → Frontend fetches from /api/analytics/* endpoints  [Phase 1 & 2]
  → KPI cards, charts, templates table rendered  [Phase 2]
  → User clicks "View" on a template → detail page  [Phase 2]
  → User clicks "Load Analysis" → GitHub profiles analyzed  [Phase 3]
```

### MongoDB Collections

| Collection | Model File | Purpose |
|---|---|---|
| `templatedatas` | `server/models/TemplateData.js` | Template metadata — only user-created templates (`source: 'created'`) |
| `templatesubmissions` | `server/models/TemplateSubmission.js` | Form submission data linked by `draftId` |

> **Important:** Imported spreadsheets from Roster Studio are **NOT** saved to these collections. Those remain in the existing `spreadsheets` collection and are temporary (used for email sending only).

### API Endpoints

| Method | Path | Description | Phase |
|---|---|---|---|
| `GET` | `/api/analytics/overview` | KPI summary (total templates, active links, submissions, avg fields) | 1 |
| `GET` | `/api/analytics/templates` | Templates list with submission counts | 1 |
| `GET` | `/api/analytics/templates/:draftId` | Per-template detail with field stats | 1 |
| `GET` | `/api/analytics/templates/:draftId/submissions` | Paginated raw submissions | 1 |
| `GET` | `/api/analytics/templates/:draftId/field-analysis` | Per-field completion rates & rating distributions | 1 |
| `GET` | `/api/analytics/templates/:draftId/github` | GitHub role & tech stack analysis | 3 |
| `GET` | `/api/analytics/trends` | Submission trends + type distribution | 1 |
| `POST` | `/api/analytics/sync` | Manual backfill from Supabase to MongoDB | 1 |
| `GET` | `/api/analytics/export/overview?format=csv\|json\|pdf` | Download overview report as a local file | 5 |
| `GET` | `/api/analytics/export/templates/:draftId?format=csv\|json\|pdf` | Download per-template report as a local file | 5 |
| `POST` | `/api/analytics/reports` | Create a scheduled, recurring email report | 5 |
| `GET` | `/api/analytics/reports` | List scheduled reports for the user | 5 |
| `PUT` | `/api/analytics/reports/:id` | Update / pause / resume a scheduled report | 5 |
| `DELETE` | `/api/analytics/reports/:id` | Delete a scheduled report and cancel its job | 5 |

All endpoints are behind `verifyToken` middleware and scoped to `req.user.uid`.

### Frontend Routes

| Path | Component | Phase |
|---|---|---|
| `/dashboard/template-analytics` | `AnalyticsPage.jsx` | 2 |
| (within AnalyticsPage) | `TemplateDetailAnalytics.jsx` | 2 & 3 |

### Sidebar Navigation

The **Analytics** primary nav group contains:
1. **Template Analytics** — new analytics page (Phase 2)
2. **Recruiting Analysis** — existing mock analysis view
3. **Reports** — existing
4. **Export** — existing

### Key Files

| File | Phase | Description |
|---|---|---|
| `server/models/TemplateData.js` | 1 | MongoDB model for template metadata |
| `server/models/TemplateSubmission.js` | 1 | MongoDB model for form submissions |
| `server/utils/analyticsUtils.js` | 1 | Aggregation utility functions |
| `server/utils/analyticsExport.js` | 5 | CSV/JSON/PDF builders for overview & template exports |
| `server/models/AnalyticsReport.js` | 5 | Mongoose model for scheduled report configs |
| `server/utils/githubAnalyzer.js` | 3 | GitHub profile analysis utility |
| `server/index.js` | 1, 3, 5 | API endpoints + Supabase→MongoDB sync hooks + export/report CRUD |
| `server/scheduler.js` | 5 | `send analytics report` Agenda job + schedule/cancel helpers |
| `src/pages/AnalyticsPage.jsx` | 2, 5 | Main analytics page with KPIs, charts, table, export menu, scheduled reports panel |
| `src/pages/TemplateDetailAnalytics.jsx` | 2, 3, 5 | Per-template detail with field analysis, GitHub section, export menu |
| `src/components/AnalyticsExportMenu.jsx` | 5 | Reusable download dropdown (CSV/JSON/PDF) |
| `src/components/ScheduledReportsPanel.jsx` | 5 | Scheduled reports management UI |
| `src/pages/AnalyticsPage.css` | 2, 3, 5 | Full styling for analytics UI |
| `src/App.jsx` | 2 | Route + sidebar nav integration |

### Pull Requests

| PR | Branch | Phase | Status |
|---|---|---|---|
| [#26](https://github.com/Leddger-AI/LedgerAI/pull/26) | `feature/analytics-phase1` | 1 | Merged |
| [#27](https://github.com/Leddger-AI/LedgerAI/pull/27) | `feature/analytics-phase2` | 2 | Merged |
| [#28](https://github.com/Leddger-AI/LedgerAI/pull/28) | `feature/analytics-phase3` | 3 | Open |
| [#29](https://github.com/Leddger-AI/LedgerAI/pull/29) | `feature/analytics-docs` | Docs + 4 | Open |

### Future Phases

- **Phase 6:** Dashboard widgets — embeddable analytics widgets for the main dashboard
- **Phase 7:** Google Drive integration — export analytics directly to Google Sheets (already shipped, see [phase7-google-drive-integration.md](./phase7-google-drive-integration.md))
