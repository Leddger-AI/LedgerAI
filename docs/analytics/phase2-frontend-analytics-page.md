# Phase 2: Frontend Analytics Page

## PR
[#27](https://github.com/Leddger-AI/LedgerAI/pull/27) — `feature/analytics-phase2` — **Merged**

## Overview

Phase 2 builds the frontend analytics page that consumes the Phase 1 API endpoints. It provides KPI cards, submission trend charts, template type distribution, a templates overview table, and a per-template detail view with field-level analysis and rating distributions.

## Components

### AnalyticsPage.jsx (`src/pages/AnalyticsPage.jsx`)

The main analytics page. Renders when the user navigates to `/dashboard/template-analytics` or clicks "Template Analytics" in the sidebar.

**Props:** `{ user }` — current authenticated user object

**State:**
| State | Type | Description |
|---|---|---|
| `overview` | `object\|null` | KPI data from `/api/analytics/overview` |
| `templates` | `array` | Templates list from `/api/analytics/templates` |
| `trends` | `array` | Daily submission counts from `/api/analytics/trends` |
| `typeDistribution` | `array` | Template type breakdown from trends endpoint |
| `loading` | `boolean` | Loading state for initial fetch |
| `error` | `string\|null` | Error message if fetch fails |
| `syncing` | `boolean` | Loading state for sync button |
| `syncResult` | `object\|null` | Success/error message from sync |
| `selectedDraftId` | `string\|null` | When set, renders TemplateDetailAnalytics |
| `dateRange` | `number` | Selected trend range (7, 30, or 90 days) |

**Data fetching:**
- `fetchOverview()` → `GET /api/analytics/overview`
- `fetchTemplates()` → `GET /api/analytics/templates`
- `fetchTrends()` → `GET /api/analytics/trends?days={dateRange}`
- All three run in parallel on mount via `Promise.all`
- `dateRange` changes re-fetch trends only

**UI sections:**

1. **Header** — Title, subtitle, date range selector (7/30/90 days), Sync Data button
2. **KPI Cards** (4 cards in a responsive grid):
   - Total Templates (cyan icon)
   - Active Links (green icon)
   - Total Submissions (purple icon)
   - Avg Fields/Template (orange icon)
3. **Charts Row** (2-column grid, collapses to 1 column on mobile):
   - **Submission Trends** — Area chart with gradient fill, X-axis = date, Y-axis = count
   - **Template Types** — Donut chart with legend showing type counts
4. **Templates Overview Table** — Sortable table with columns:
   - Title, Type (badge), Status (badge), Submissions count, Last Submission date, Created date, View button
   - View button navigates to `TemplateDetailAnalytics` (disabled if 0 submissions)

**Sync button:**
- Calls `POST /api/analytics/sync` to backfill historical data from Supabase to MongoDB
- Shows success banner with counts or error banner
- Re-fetches all data after successful sync

**Charts library:** `recharts` — `ResponsiveContainer`, `AreaChart`, `Area`, `PieChart`, `Pie`, `Cell`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`

**Icons:** `lucide-react` — `BarChart3`, `TrendingUp`, `Users`, `FileText`, `RefreshCw`, `Loader2`, `AlertCircle`, `ArrowLeft`, `Clock`, `CheckCircle2`, `Eye`

---

### TemplateDetailAnalytics.jsx (`src/pages/TemplateDetailAnalytics.jsx`)

Per-template deep dive view. Rendered when `selectedDraftId` is set in `AnalyticsPage`.

**Props:** `{ draftId, onBack }`

**State:**
| State | Type | Description |
|---|---|---|
| `detail` | `object\|null` | Template detail from `/api/analytics/templates/:draftId` |
| `submissions` | `array` | Paginated raw submissions |
| `submissionsPage` | `number` | Current page |
| `submissionsTotal` | `number` | Total submission count |
| `submissionsTotalPages` | `number` | Total pages |
| `loading` | `boolean` | Initial loading state |
| `error` | `string\|null` | Error message |

**Data fetching:**
- `fetchDetail()` → `GET /api/analytics/templates/:draftId`
- `fetchSubmissions(page)` → `GET /api/analytics/templates/:draftId/submissions?page={page}&limit=10`
- Both run in parallel on mount

**UI sections:**

1. **Back button** — Returns to AnalyticsPage overview
2. **Detail header** — Template title, type badge, status badge, submission count, created date
3. **KPI Cards** (4 cards):
   - Total Submissions
   - Enabled Fields count
   - Avg rating for first rating field (e.g., "Avg Experience: 3.5 / 5")
   - Avg rating for second rating field (if exists)
4. **Field Completion Rates** — Horizontal bar chart:
   - Y-axis = field names (human-readable, camelCase split)
   - X-axis = completion percentage (0-100%)
   - Each bar colored differently
5. **Rating Distribution Charts** — One bar chart per rating field:
   - X-axis = rating value (1★, 2★, 3★, 4★, 5★)
   - Y-axis = response count
   - Summary below: Avg, Min, Max, Filled/Total
   - Displayed in a responsive grid (`repeat(auto-fit, minmax(320px, 1fr))`)
6. **Raw Submissions Table** — Paginated table:
   - Dynamic columns generated from `submittedData` keys
   - Column headers human-readable (camelCase split)
   - Values truncated to 50 characters
   - Submitted At column with full date/time
   - Pagination controls (prev/next buttons, page info)

---

## CSS (`src/pages/AnalyticsPage.css`)

Complete styling for both `AnalyticsPage` and `TemplateDetailAnalytics`.

**Key style classes:**

| Class | Description |
|---|---|
| `.analytics-page` | Main container, max-width 1400px, 24px padding |
| `.analytics-loading` | Centered flex with spinner |
| `.analytics-header` | Flex space-between with actions |
| `.analytics-date-select` | Styled dropdown for date range |
| `.analytics-sync-btn` | Blue button with hover state |
| `.analytics-error-banner` | Red-tinted alert banner |
| `.analytics-sync-banner` | Green (success) or red (error) banner |
| `.analytics-kpi-grid` | Auto-fit grid, minmax(200px, 1fr) |
| `.analytics-charts-row` | 1.4fr/1fr grid, collapses at 900px |
| `.analytics-chart-panel` | Glass panel with 20px padding |
| `.analytics-table` | Full-width table with hover states |
| `.analytics-type-badge` | Colored pill badges per type |
| `.analytics-status-badge` | Colored pill badges per status |
| `.analytics-view-btn` | Blue action button |
| `.analytics-back-btn` | Outlined back navigation button |
| `.analytics-rating-charts` | Auto-fit grid for rating distributions |
| `.analytics-pagination` | Centered pagination controls |
| `.kpi-icon-wrapper.*` | Colored icon backgrounds (cyan, green, purple, orange) |

**Responsive breakpoints:**
- 900px: Charts row collapses from 2-column to 1-column
- Auto-fit grids adjust based on available width

---

## Routing & Navigation (`src/App.jsx`)

### Import
```js
import AnalyticsPage from './pages/AnalyticsPage.jsx';
```

### Route mapping
```js
// PATH_TAB_MAP
'/dashboard/template-analytics': 'Template Analytics',

// calculatePrimaryNav
if (['Analysis', 'Template Analytics', 'Reports', 'Export'].includes(tab)) return 'Analytics';
```

### Sidebar navigation
```js
Analytics: [
  { id: 'Template Analytics', label: 'Template Analytics', icon: BarChart3 },
  { id: 'Analysis', label: 'Recruiting Analysis', icon: TrendingUp },
  { id: 'Reports', label: 'Reports', icon: FileText },
  { id: 'Export', label: 'Export', icon: Download }
],
```

> The existing "Analysis" tab was renamed to "Recruiting Analysis" for clarity, distinguishing it from the new "Template Analytics" page.

### Conditional render
```jsx
) : activeTab === 'Template Analytics' ? (
  <AnalyticsPage user={user} />
) : activeTab === 'Analysis' ? (
  <AnalysisView meetings={meetings} />
```

---

## Authentication

All API calls use `getAuthToken()` from `../supabaseAuth` to get the Supabase JWT token, which is sent as `Authorization: Bearer <token>` in the request headers.

```js
const token = await getAuthToken();
if (!token) return;
const res = await fetch(`${API_BASE_URL}/api/analytics/overview`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## API Base URL

```js
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
```

Configurable via the `VITE_API_URL` environment variable.

---

## Commits

| # | Message |
|---|---|
| 1 | `feat(analytics): create AnalyticsPage.jsx with KPI cards, charts, and templates table` |
| 2 | `feat(analytics): create TemplateDetailAnalytics.jsx for per-template deep dive` |
| 3 | `style(analytics): add AnalyticsPage.css with full styling for analytics UI` |
| 4 | `feat(routing): add Template Analytics route and sidebar nav in App.jsx` |
