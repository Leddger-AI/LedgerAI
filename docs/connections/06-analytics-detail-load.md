# 06: Analytics Template Detail Load

## Feature Summary

When the user clicks a template in the analytics overview, the frontend switches to `TemplateDetailAnalytics` view. It fetches template detail (field stats, completion rates), paginated raw submissions, and optionally GitHub analysis data. Renders KPI cards, bar charts for rating distributions, completion rate chart, and a raw submissions table.

## ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (AnalyticsPage.jsx → TemplateDetailAnalytics.jsx)     │
│                                                                   │
│  User clicks template row → setSelectedDraftId(draftId)          │
│  └─ Renders <TemplateDetailAnalytics draftId={...} onBack={...}/>│
│                                                                   │
│  Component mounts → useEffect:                                    │
│  ├─ fetchDetail()      ──→ GET /api/analytics/templates/:draftId│
│  ├─ fetchSubmissions(1)──→ GET /api/analytics/templates/:draftId │
│  │                          /submissions?page=1&limit=20        │
│  └─ fetchGithubAnalytics() (if template has GitHub data)        │
│     └─ GET /api/analytics/templates/:draftId/github             │
│                                                                   │
│  All calls: { Authorization: Bearer <jwt> }                     │
│  fetchDetail + fetchSubmissions run in parallel                  │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (server/index.js)                                        │
│                                                                   │
│  GET /api/analytics/templates/:draftId (line 2149)              │
│  ├─ getTemplateDetail(uid, draftId) → analyticsUtils.js:69      │
│  │  ├─ TemplateData.findOne({ ownerUid, draftId })              │
│  │  ├─ TemplateSubmission.find({ draftId, ownerUid })           │
│  │  │  .sort({ submittedAt: -1 })                               │
│  │  ├─ Extract enabled fields from config.toggles               │
│  │  ├─ Calculate per-field stats:                                │
│  │  │  ├─ totalFilled, completionRate                           │
│  │  │  ├─ For numeric fields: avg, min, max, distribution       │
│  │  │  └─ Rating distribution: [1★, 2★, 3★, 4★, 5★] counts    │
│  │  └─ Returns: { draftId, title, type, status, config,        │
│  │              totalSubmissions, enabledFields, fieldStats }   │
│  └─ res.json(detail)                                             │
│                                                                   │
│  GET /api/analytics/templates/:draftId/submissions (line 2160)  │
│  ├─ getTemplateSubmissions(uid, draftId, page, limit)           │
│  │  └→ analyticsUtils.js:119                                    │
│  │  ├─ TemplateSubmission.find({ draftId, ownerUid })           │
│  │  │  .sort({ submittedAt: -1 })                               │
│  │  │  .skip((page-1)*limit).limit(limit)                       │
│  │  ├─ TemplateSubmission.countDocuments({ draftId, ownerUid }) │
│  │  └─ Returns: { submissions, total, page, limit, totalPages }│
│  └─ res.json(result)                                             │
│                                                                   │
│  GET /api/analytics/templates/:draftId/github (line 2185)       │
│  ├─ analyzeTemplateGitHub(uid, draftId) → githubAnalyzer.js     │
│  │  ├─ Fetch template config for GitHub usernames               │
│  │  ├─ Fetch GitHub repos via GitHub API                        │
│  │  ├─ Classify roles (frontend, backend, fullstack, etc.)      │
│  │  ├─ Extract tech stack from repo languages                   │
│  │  └─ Returns: { roles, techStack, topics, profileBreakdown } │
│  └─ res.json(githubData)                                         │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND RENDER                                                   │
│                                                                   │
│  State:                                                           │
│  ├─ setDetail(data) → header + KPI cards + field stats          │
│  ├─ setSubmissions(data) → raw submissions table (paginated)    │
│  ├─ setSubmissionsPage/Total/TotalPages → pagination controls   │
│  └─ setGithubData(data) → GitHub analysis section               │
│                                                                   │
│  Rendered sections:                                               │
│  ├─ Header: title, type badge, status, submission count         │
│  ├─ KPI cards: Total Submissions, Avg Completion Rate           │
│  ├─ Completion rate bar chart (per field)                       │
│  ├─ Rating distribution bar charts (for rating fields)          │
│  ├─ Raw submissions table (paginated, 20 per page)              │
│  ├─ GitHub analysis: roles, tech stack, topics                  │
│  └─ "Save to Drive" button (see 08-analytics-export-to-drive.md)│
└─────────────────────────────────────────────────────────────────┘
```

## File-by-File Trace

| Step | File | Lines | What Happens |
|------|------|-------|--------------|
| 1. Click template | `src/pages/AnalyticsPage.jsx` | 136-142 | `setSelectedDraftId(draftId)` |
| 2. Fetch detail | `src/pages/TemplateDetailAnalytics.jsx` | 31-48 | `fetchDetail()` |
| 3. Fetch submissions | `src/pages/TemplateDetailAnalytics.jsx` | 50-61 | `fetchSubmissions(page)` |
| 4. Fetch GitHub | `src/pages/TemplateDetailAnalytics.jsx` | 63-82 | `fetchGithubAnalytics()` |
| 5. Detail API | `server/index.js` | 2149-2159 | `GET /api/analytics/templates/:draftId` |
| 6. Submissions API | `server/index.js` | 2160+ | `GET /api/analytics/templates/:draftId/submissions` |
| 7. GitHub API | `server/index.js` | 2185+ | `GET /api/analytics/templates/:draftId/github` |
| 8. Detail logic | `server/utils/analyticsUtils.js` | 69-114 | `getTemplateDetail()` |
| 9. Submissions logic | `server/utils/analyticsUtils.js` | 119-136 | `getTemplateSubmissions()` |
| 10. GitHub logic | `server/utils/githubAnalyzer.js` | — | `analyzeTemplateGitHub()` |
| 11. Render | `src/pages/TemplateDetailAnalytics.jsx` | 129+ | Full detail view |

## Shared Dependencies

- **MongoDB** — `TemplateData`, `TemplateSubmission` collections
- **Supabase Auth** — JWT for API authentication
- **GitHub API** — fetches repos for GitHub analysis (no auth, rate-limited)
- **recharts** — BarChart for completion rates and rating distributions

## Error Paths

| Scenario | What Happens |
|----------|-------------|
| Template not found | 404, shows "Template not found" error view |
| GitHub API rate limited | `githubError` set, GitHub section shows error message |
| API returns 500 | Error state, shows error view with back button |

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | Frontend | API base URL |
| `MONGODB_URI` | Backend | MongoDB connection string |
