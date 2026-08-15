# 05: Analytics Overview Page Load

## Feature Summary

When the user navigates to the Analytics page, the frontend fires 4 parallel API calls to fetch overview KPIs, template list, submission trends, and type distribution. The backend queries MongoDB using aggregation pipelines. The frontend renders KPI cards, charts, and a template table.

## ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (AnalyticsPage.jsx)                                     │
│                                                                   │
│  Component mounts → fetchAll()                                    │
│  ├─ fetchOverview()     ──→ GET /api/analytics/overview          │
│  ├─ fetchTemplates()    ──→ GET /api/analytics/templates         │
│  ├─ fetchTrends()       ──→ GET /api/analytics/trends            │
│  └─ fetchTypeDist()     ──→ GET /api/analytics/type-distribution │
│                                                                   │
│  All 4 calls include: { Authorization: Bearer <jwt> }           │
│  All run in parallel via Promise.all()                           │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼ (4 parallel requests)
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (server/index.js)                                        │
│                                                                   │
│  GET /api/analytics/overview (line 2121)                         │
│  ├─ verifyToken → req.user.uid                                   │
│  ├─ getOverviewStats(uid) → analyticsUtils.js:8                 │
│  │  ├─ TemplateData.find({ ownerUid })                           │
│  │  ├─ TemplateSubmission.aggregate([                            │
│  │  │    { $match: { ownerUid } },                               │
│  │  │    { $group: { _id: '$draftId', count: { $sum: 1 } } }    │
│  │  │  ])                                                        │
│  │  └─ Returns: { totalTemplates, activeLinks,                  │
│  │              totalSubmissions, avgFieldsPerTemplate }         │
│  └─ res.json(stats)                                              │
│                                                                   │
│  GET /api/analytics/templates (line 2135)                        │
│  ├─ getTemplatesWithStats(uid) → analyticsUtils.js:41           │
│  │  ├─ TemplateData.find({ ownerUid }).sort({ createdAt: -1 })  │
│  │  ├─ TemplateSubmission.aggregate([                            │
│  │  │    { $match: { ownerUid } },                               │
│  │  │    { $group: { _id: '$draftId', count, lastSubmission } } │
│  │  │  ])                                                        │
│  │  └─ Returns: [{ draftId, title, type, status,                │
│  │              submissionCount, lastSubmissionAt }]             │
│  └─ res.json({ templates })                                      │
│                                                                   │
│  GET /api/analytics/trends (line 2210)                           │
│  ├─ getSubmissionTrends(uid, days) → analyticsUtils.js:142      │
│  │  ├─ TemplateSubmission.aggregate([                            │
│  │  │    { $match: { ownerUid, submittedAt: { $gte: startDate } } },│
│  │  │    { $group: { _id: { year, month, day }, count } },      │
│  │  │    { $sort: { '_id.year': 1, ... } }                      │
│  │  │  ])                                                        │
│  │  └─ Returns: [{ date: "2026-08-01", count: 5 }, ...]        │
│  ├─ getTemplateTypeDistribution(uid) → analyticsUtils.js:182    │
│  │  ├─ TemplateData.aggregate([                                  │
│  │  │    { $match: { ownerUid } },                               │
│  │  │    { $group: { _id: '$templateType', count } }            │
│  │  │  ])                                                        │
│  │  └─ Returns: [{ type: "student", count: 3 }, ...]           │
│  └─ res.json({ trends, typeDistribution })                      │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND RENDER                                                   │
│                                                                   │
│  State updated:                                                   │
│  ├─ setOverview(stats) → KPI cards (4 cards)                    │
│  ├─ setTemplates(list) → Template table with click-to-detail    │
│  ├─ setTrends(data) → Area chart (submission trends)            │
│  └─ setTypeDistribution(data) → Pie chart (template types)      │
│                                                                   │
│  Charts: recharts (AreaChart, PieChart)                          │
│  KPI Cards: Total Templates, Active Links, Submissions, Avg Fields│
│  Table: Title, Type, Status, Submissions, Last Submission       │
│  Date selector: 7 / 30 / 90 days (refetches trends)             │
└─────────────────────────────────────────────────────────────────┘
```

## File-by-File Trace

| Step | File | Lines | What Happens |
|------|------|-------|--------------|
| 1. Fetch overview | `src/pages/AnalyticsPage.jsx` | 32-48 | `fetchOverview()` |
| 2. Fetch templates | `src/pages/AnalyticsPage.jsx` | 50-66 | `fetchTemplates()` |
| 3. Fetch trends | `src/pages/AnalyticsPage.jsx` | 68-82 | `fetchTrends()` |
| 4. Fetch type dist | `src/pages/AnalyticsPage.jsx` | 84-98 | `fetchTypeDist()` |
| 5. Overview API | `server/index.js` | 2121-2129 | `GET /api/analytics/overview` |
| 6. Templates API | `server/index.js` | 2135-2143 | `GET /api/analytics/templates` |
| 7. Trends API | `server/index.js` | 2210-2224 | `GET /api/analytics/trends` |
| 8. Overview logic | `server/utils/analyticsUtils.js` | 8-36 | `getOverviewStats()` |
| 9. Templates logic | `server/utils/analyticsUtils.js` | 41-64 | `getTemplatesWithStats()` |
| 10. Trends logic | `server/utils/analyticsUtils.js` | 142-177 | `getSubmissionTrends()` |
| 11. Type dist logic | `server/utils/analyticsUtils.js` | 182-191 | `getTemplateTypeDistribution()` |
| 12. KPI render | `src/pages/AnalyticsPage.jsx` | 224+ | KPI cards grid |
| 13. Chart render | `src/pages/AnalyticsPage.jsx` | — | AreaChart + PieChart |

## Shared Dependencies

- **MongoDB** — `TemplateData` and `TemplateSubmission` collections
- **Supabase Auth** — JWT for API authentication
- **recharts** — chart library for AreaChart and PieChart

## Error Paths

| Scenario | What Happens |
|----------|-------------|
| API returns 500 | `setError(message)`, error banner shown |
| No data | KPIs show 0, charts empty, table empty |
| JWT expired | 401 from all 4 calls, error banner |

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | Frontend | API base URL (defaults to `http://localhost:5000`) |
| `MONGODB_URI` | Backend | MongoDB connection string |
