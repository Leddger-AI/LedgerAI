# Phase 5: Export & Reporting

## PR
[#30](https://github.com/Leddger-AI/LedgerAI/pull/30) — `feature/analytics-phase5` — **Open**

## Overview

Phase 5 adds CSV and JSON export capabilities to the analytics feature. Users can download overview analytics (all templates, KPIs, trends) or per-template detail analytics (field stats, raw submissions) as CSV or JSON files directly from the UI.

## Backend

### exportUtils.js (`server/utils/exportUtils.js`)

Utility module with 5 export functions + 2 CSV helpers.

#### `escapeCSV(value)`
Escapes a value for safe CSV inclusion:
- Wraps in quotes if value contains comma, quote, newline, or carriage return
- Doubles internal quotes per RFC 4180

#### `arrayToCSV(rows)`
Converts array of objects to CSV string:
- First object's keys become headers
- Each row's values are escaped and comma-joined
- Returns header line + data lines separated by `\n`

#### `exportOverviewCSV(ownerUid)`
Generates a multi-section CSV with 4 sections:
1. **Overview KPIs** — TotalTemplates, ActiveLinks, TotalSubmissions, AvgFieldsPerTemplate
2. **Templates** — All templates with submission counts and dates
3. **Submission Trends** — Last 30 days of daily submission counts
4. **Template Type Distribution** — Type counts for donut chart data

Sections are separated by blank lines and `# Section Name` headers.

#### `exportOverviewJSON(ownerUid)`
Generates structured JSON with:
```json
{
  "generatedAt": "2024-08-14T18:00:00Z",
  "overview": { "totalTemplates": 12, "activeLinks": 5, ... },
  "templates": [ { "draftId": "...", "title": "...", ... } ],
  "trends": [ { "date": "2024-08-01", "count": 3 }, ... ],
  "typeDistribution": [ { "type": "student", "count": 8 }, ... ]
}
```

#### `exportTemplateDetailCSV(ownerUid, draftId)`
Generates a 3-section CSV for a specific template:
1. **Template Info** — Title, Type, Status, TotalSubmissions, EnabledFields, CreatedAt, ExpiresAt
2. **Field Statistics** — Per-field: Filled, CompletionRate, Average, Min, Max
3. **Raw Submissions** — All submissions flattened with submittedData keys as columns

Returns `null` if template not found (caller returns 404).

#### `exportTemplateDetailJSON(ownerUid, draftId)`
Generates structured JSON:
```json
{
  "generatedAt": "2024-08-14T18:00:00Z",
  "template": {
    "draftId": "...", "title": "...", "templateType": "...",
    "status": "...", "totalSubmissions": 23,
    "enabledFields": ["name", "experience", ...],
    "fieldStats": { "experience": { "avg": 3.5, ... } }
  },
  "submissions": [ { "submissionId": "...", "submittedData": {...}, ... } ]
}
```

#### `exportAllSubmissionsCSV(ownerUid, draftId)`
Generates a flat CSV of all submissions for a template. Dynamic columns from `submittedData` keys. Returns "No submissions found" if empty.

---

### API Endpoints (`server/index.js`)

5 new endpoints, all behind `verifyToken` and scoped to `req.user.uid`.

| Endpoint | Format | Description |
|---|---|---|
| `GET /api/analytics/export/overview.csv` | CSV | Multi-section overview export |
| `GET /api/analytics/export/overview.json` | JSON | Structured JSON overview |
| `GET /api/analytics/templates/:draftId/export.csv` | CSV | Template detail with field stats + submissions |
| `GET /api/analytics/templates/:draftId/export.json` | JSON | Structured JSON template detail |
| `GET /api/analytics/templates/:draftId/submissions/export.csv` | CSV | Flat submissions-only CSV |

**Response headers:**
```
Content-Type: text/csv (or application/json)
Content-Disposition: attachment; filename="analytics-overview-1723646400000.csv"
```

**Error handling:**
- 404 if template not found (CSV/JSON detail exports)
- 500 for server errors

---

## Frontend

### AnalyticsPage.jsx — Export Buttons

Added to the header actions area, next to the date range selector and Sync Data button.

**New state:** `exporting` (boolean) — disables buttons during download

**`handleExport(format)`** function:
1. Gets auth token via `getAuthToken()`
2. Fetches `${API_BASE_URL}/api/analytics/export/overview.${format}`
3. Converts response to Blob
4. Creates object URL and temporary `<a>` element
5. Triggers download with filename `analytics-overview-{timestamp}.{format}`
6. Cleans up object URL

**UI:** Two buttons in `.analytics-export-group`:
- **CSV** button with Download icon
- **JSON** button with Download icon
- Both show spinner (Loader2) when `exporting` is true

### TemplateDetailAnalytics.jsx — Export Buttons

Added to the detail header, next to the template title and metadata badges.

**New state:** `exporting` (boolean)

**`handleExport(format)`** function:
- Same blob download pattern as AnalyticsPage
- Fetches `${API_BASE_URL}/api/analytics/templates/${draftId}/export.${format}`
- Downloads as `template-{draftId}-{timestamp}.{format}`

**UI:** Two buttons in `.analytics-export-group` in the detail header:
- **CSV** button with Download icon
- **JSON** button with Download icon

---

## CSS (`src/pages/AnalyticsPage.css`)

| Class | Description |
|---|---|
| `.analytics-export-group` | Flex container with 6px gap for export buttons |
| `.analytics-export-btn` | Outlined button: 6px 12px padding, 12px font, 600 weight |
| `.analytics-export-btn:hover` | Blue-tinted background and border on hover |
| `.analytics-export-btn:disabled` | 50% opacity, not-allowed cursor |
| `.analytics-detail-header` | Flex space-between for title + export buttons, wraps on mobile |

---

## File Summary

| File | Change | Lines |
|---|---|---|
| `server/utils/exportUtils.js` | **New** | 166 |
| `server/index.js` | Modified — import + 5 endpoints | +93 |
| `src/pages/AnalyticsPage.jsx` | Modified — import, state, handler, buttons | +37 |
| `src/pages/TemplateDetailAnalytics.jsx` | Modified — import, state, handler, buttons | +54 |
| `src/pages/AnalyticsPage.css` | Modified — export button styles | +40 |

---

## Build Verification

- Vite production build: **PASS** (2.14s)
- `exportUtils.js` module load: **OK** — all 7 functions exported
- No new npm dependencies added — uses only existing `mongoose` and `analyticsUtils`

---

## Commits

| # | Message |
|---|---|
| 1 | `feat(export): add exportUtils.js with CSV and JSON export generators` |
| 2 | `feat(api): add 5 analytics export endpoints (CSV + JSON)` |
| 3 | `feat(frontend): add CSV/JSON export buttons to AnalyticsPage and TemplateDetailAnalytics` |
| 4 | `style(export): add CSS for export button group and detail header layout` |
