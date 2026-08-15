# 07: Analytics Data Sync

## Feature Summary

The "Sync Data" button on the Analytics page triggers a one-time backfill from Supabase (PostgreSQL) to MongoDB. It fetches all form drafts and submissions from Supabase and upserts them into MongoDB's `TemplateData` and `TemplateSubmission` collections. This is needed because analytics queries run against MongoDB, but form data is primarily stored in Supabase.

## ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (AnalyticsPage.jsx)                                     │
│                                                                   │
│  User clicks "Sync Data" button                                   │
│  └─ handleSync()                                                 │
│     ├─ setSyncing(true) → button shows spinner                   │
│     ├─ getAuthToken() → JWT                                      │
│     ├─ fetch POST /api/analytics/sync                            │
│     │  Headers: { Authorization: Bearer <jwt> }                 │
│     └─ Response: { templatesSynced, submissionsSynced }         │
│        └─ setSyncResult({ type: 'success', message })            │
│           └─ Green banner: "Synced X templates and Y submissions"│
│        └─ fetchAll() → refreshes all analytics data             │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (server/index.js:2054)                                   │
│  POST /api/analytics/sync                                         │
│  ├─ verifyToken → req.user.uid                                   │
│  │                                                                │
│  ├─ STEP 1: Sync templates                                       │
│  │  ├─ supabase.from('form_drafts').select('*')                 │
│  │  │  .eq('user_id', req.user.uid)                             │
│  │  ├─ For each draft:                                           │
│  │  │  └─ TemplateData.findOneAndUpdate(                        │
│  │  │       { draftId: draft.draft_id },                        │
│  │  │       { ownerUid, title, templateType, config,            │
│  │  │         status, source: 'created', expiresAt, createdAt },│
│  │  │       { upsert: true, new: true }                         │
│  │  │     )                                                      │
│  │  └─ templatesSynced++                                         │
│  │                                                                │
│  ├─ STEP 2: Sync submissions                                     │
│  │  ├─ supabase.from('form_submissions').select('*')            │
│  │  │  .eq('user_id', req.user.uid)                             │
│  │  ├─ For each submission:                                      │
│  │  │  ├─ Check if exists: TemplateSubmission.findOne()         │
│  │  │  ├─ If NOT exists:                                         │
│  │  │  │  └─ TemplateSubmission.create({                        │
│  │  │  │       submissionId, draftId, ownerUid,                 │
│  │  │  │       templateType, title, submittedData, submittedAt  │
│  │  │  │     })                                                  │
│  │  │  └─ submissionsSynced++                                    │
│  │  └─ Skip if already exists (dedup by submissionId)           │
│  │                                                                │
│  └─ res.json({ templatesSynced, submissionsSynced })            │
└─────────────────────────────────────────────────────────────────┘
```

## File-by-File Trace

| Step | File | Lines | What Happens |
|------|------|-------|--------------|
| 1. Button click | `src/pages/AnalyticsPage.jsx` | 92-113 | `handleSync()` |
| 2. API call | `src/pages/AnalyticsPage.jsx` | 96-104 | `POST /api/analytics/sync` |
| 3. Sync endpoint | `server/index.js` | 2054-2115 | Full backfill logic |
| 4. Fetch drafts | `server/index.js` | 2056-2061 | Supabase `form_drafts` query |
| 5. Upsert templates | `server/index.js` | 2064-2079 | `TemplateData.findOneAndUpdate` |
| 6. Fetch submissions | `server/index.js` | 2082-2085 | Supabase `form_submissions` query |
| 7. Dedup check | `server/index.js` | 2091 | `TemplateSubmission.findOne` |
| 8. Create submissions | `server/index.js` | 2092-2102 | `TemplateSubmission.create` |
| 9. Success response | `server/index.js` | 2106-2110 | Returns counts |
| 10. Refresh data | `src/pages/AnalyticsPage.jsx` | 105 | `fetchAll()` re-fetches all analytics |

## Shared Dependencies

- **Supabase** — source of truth for `form_drafts` and `form_submissions`
- **MongoDB** — `TemplateData` and `TemplateSubmission` for analytics queries
- **Supabase Auth** — JWT for API authentication

## Error Paths

| Scenario | What Happens |
|----------|-------------|
| Supabase query fails | `draftsError` thrown, 500 returned, error banner shown |
| MongoDB upsert fails | Error caught, 500 returned |
| No data to sync | Returns `{ templatesSynced: 0, submissionsSynced: 0 }` |
| Already synced | Submissions skipped (dedup by `submissionId`) |

## Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_API_URL` | Frontend | API base URL |
| `MONGODB_URI` | Backend | MongoDB connection string |
| `SUPABASE_URL` | Backend | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Supabase service role key |

## When to Use

- **First time visiting Analytics page** — sync historical data from Supabase to MongoDB
- **After importing forms** — new drafts created in Supabase need to appear in analytics
- **After data inconsistency** — re-sync to reconcile MongoDB with Supabase source

## Performance Note

This is a synchronous batch operation. For users with many templates/submissions, it can take several seconds. The endpoint iterates all drafts and submissions sequentially. Future optimization: use `insertMany` with `ordered: false` for bulk submission creation.
