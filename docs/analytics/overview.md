# Analytics Feature — Overview

## Table of Contents

- [Phase 1: Backend MongoDB Models & API Endpoints](./phase1-backend-mongodb-models-api.md)
- [Phase 2: Frontend Analytics Page](./phase2-frontend-analytics-page.md)
- [Phase 3: GitHub Role & Tech Stack Analysis](./phase3-github-role-techstack-analysis.md)

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
| `server/utils/githubAnalyzer.js` | 3 | GitHub profile analysis utility |
| `server/index.js` | 1, 3 | API endpoints + Supabase→MongoDB sync hooks |
| `src/pages/AnalyticsPage.jsx` | 2 | Main analytics page with KPIs, charts, table |
| `src/pages/TemplateDetailAnalytics.jsx` | 2, 3 | Per-template detail with field analysis & GitHub section |
| `src/pages/AnalyticsPage.css` | 2, 3 | Full styling for analytics UI |
| `src/App.jsx` | 2 | Route + sidebar nav integration |

### Pull Requests

| PR | Branch | Phase | Status |
|---|---|---|---|
| [#26](https://github.com/Leddger-AI/LedgerAI/pull/26) | `feature/analytics-phase1` | 1 | Merged |
| [#27](https://github.com/Leddger-AI/LedgerAI/pull/27) | `feature/analytics-phase2` | 2 | Merged |
| [#28](https://github.com/Leddger-AI/LedgerAI/pull/28) | `feature/analytics-phase3` | 3 | Open |

### Future Phases

- **Phase 4:** Testing & polish — unit tests for analytics endpoints, sync logic, and GitHub analyzer
- **Phase 5:** Export & reporting — CSV/PDF export of analytics data, scheduled reports
