# Phase 1: Backend MongoDB Models & API Endpoints

## PR
[#26](https://github.com/Leddger-AI/LedgerAI/pull/26) — `feature/analytics-phase1` — **Merged**

## Overview

Phase 1 establishes the backend foundation for template-based analytics. It creates two MongoDB collections to cache analytics data synced from Supabase, a utility module with aggregation functions, and 7 API endpoints. Existing draft and submission endpoints are modified to automatically sync data to MongoDB in a non-blocking manner.

## MongoDB Models

### TemplateData (`server/models/TemplateData.js`)

Stores metadata about user-created templates. Only templates with `source: 'created'` are saved — imported spreadsheets from Roster Studio are excluded.

```js
const TemplateDataSchema = new mongoose.Schema({
  draftId:       { type: String, required: true, unique: true, index: true },
  ownerUid:      { type: String, required: true, index: true },
  title:         { type: String, required: true },
  templateType:  { type: String, enum: ['student', 'employee', 'team', 'unknown'], default: 'unknown' },
  config:        { type: mongoose.Schema.Types.Mixed, default: {} },
  status:        { type: String, enum: ['draft', 'active', 'expired', 'scheduled'], default: 'draft' },
  source:        { type: String, enum: ['created', 'imported'], default: 'created' },
  expiresAt:     { type: Date, default: null },
  createdAt:     { type: Date, default: Date.now },
  updatedAt:     { type: Date, default: Date.now },
});
```

**Indexes:**
- `draftId` — unique, for fast lookups by template ID
- `ownerUid` — for filtering by user

**Pre-save hook:** Automatically updates `updatedAt` on every save.

**Key design decisions:**
- `source` field distinguishes user-created templates from imported spreadsheets. Only `created` templates are synced.
- `config` stores the full template configuration (toggles, email format) as a Mixed type for flexibility.
- `templateType` is inferred from which builder created the draft (Student, Employee, Team).

---

### TemplateSubmission (`server/models/TemplateSubmission.js`)

Stores form submission data linked to templates by `draftId`.

```js
const TemplateSubmissionSchema = new mongoose.Schema({
  submissionId:   { type: String, required: true, unique: true, index: true },
  draftId:        { type: String, required: true, index: true },
  ownerUid:       { type: String, required: true, index: true },
  templateType:   { type: String, enum: ['student', 'employee', 'team', 'unknown'], default: 'unknown' },
  title:          { type: String, required: true },
  submittedData:  { type: mongoose.Schema.Types.Mixed, required: true },
  submittedAt:    { type: Date, default: Date.now },
});
```

**Indexes:**
- `submissionId` — unique
- `draftId` — for filtering submissions by template
- `ownerUid` — for filtering by user
- Compound index: `{ draftId: 1, submittedAt: -1 }` — for efficient paginated queries sorted by submission date

**Key design decisions:**
- `submittedData` is a Mixed type storing the full form submission payload (candidate name, GitHub username, ratings, etc.)
- `submissionId` is unique per submission, enabling idempotent sync operations
- `templateType` is denormalized from the template for faster aggregation without joins

---

## Analytics Utility (`server/utils/analyticsUtils.js`)

Six aggregation functions that query MongoDB directly for analytics data.

### `getOverviewStats(ownerUid)`
Returns KPI summary across all user templates:
- `totalTemplates` — count of all TemplateData documents
- `activeLinks` — count where `status === 'active'`
- `totalSubmissions` — aggregation of all TemplateSubmission documents
- `avgFieldsPerTemplate` — average number of enabled fields across templates

**Aggregation pipeline:**
```js
TemplateSubmission.aggregate([
  { $match: { ownerUid } },
  { $group: { _id: '$draftId', count: { $sum: 1 } } },
]);
```

### `getTemplatesWithStats(ownerUid)`
Returns templates list sorted by `createdAt` descending, each with:
- `submissionCount` — number of submissions for that template
- `lastSubmissionAt` — most recent submission date

Uses a separate aggregation to get counts per `draftId`, then maps to templates.

### `getTemplateDetail(ownerUid, draftId)`
Returns detailed analytics for a specific template:
- Template metadata (title, type, status, config)
- `totalSubmissions` — count
- `enabledFields` — array of field names that are toggled on in the template config
- `fieldStats` — per-field statistics:
  - `totalFilled` — how many submissions have a value for this field
  - `completionRate` — percentage of submissions that filled this field
  - For numeric/rating fields: `avg`, `min`, `max`, and `distribution` (1-5 star counts)

**Field stats logic:**
```js
enabledFields.forEach(field => {
  const values = submissions
    .map(s => s.submittedData?.[field])
    .filter(v => v !== undefined && v !== null && v !== '');
  fieldStats[field] = {
    totalFilled: values.length,
    completionRate: submissions.length > 0
      ? Math.round((values.length / submissions.length) * 100) : 0,
  };
  // For numeric fields: compute avg, min, max, distribution
});
```

### `getTemplateSubmissions(ownerUid, draftId, page, limit)`
Returns paginated raw submissions sorted by `submittedAt` descending.
- Uses `skip` and `limit` for pagination
- Returns `submissions`, `total`, `page`, `limit`, `totalPages`

### `getSubmissionTrends(ownerUid, days)`
Returns daily submission counts for the last N days (default 30).
- Uses MongoDB date aggregation (`$year`, `$month`, `$dayOfMonth`)
- Fills in zero-count days for continuous chart data
- Returns array of `{ date: 'YYYY-MM-DD', count: N }`

### `getTemplateTypeDistribution(ownerUid)`
Returns template type breakdown for donut chart:
- Aggregates by `templateType` and counts
- Returns array of `{ type: 'student'|'employee'|'team'|'unknown', count: N }`

---

## API Endpoints (`server/index.js`)

All endpoints are behind `verifyToken` middleware and scoped to `req.user.uid`.

### `GET /api/analytics/overview`
```json
{
  "totalTemplates": 12,
  "activeLinks": 5,
  "totalSubmissions": 87,
  "avgFieldsPerTemplate": 7
}
```

### `GET /api/analytics/templates`
```json
{
  "templates": [
    {
      "draftId": "abc-123",
      "title": "Student Application Form",
      "templateType": "student",
      "status": "active",
      "source": "created",
      "createdAt": "2024-01-15T10:00:00Z",
      "expiresAt": null,
      "submissionCount": 23,
      "lastSubmissionAt": "2024-08-10T14:30:00Z"
    }
  ]
}
```

### `GET /api/analytics/templates/:draftId`
```json
{
  "draftId": "abc-123",
  "title": "Student Application Form",
  "templateType": "student",
  "status": "active",
  "config": { "toggles": { "name": true, "githubUsername": true, ... } },
  "createdAt": "2024-01-15T10:00:00Z",
  "expiresAt": null,
  "totalSubmissions": 23,
  "enabledFields": ["name", "githubUsername", "idea", "experience", ...],
  "fieldStats": {
    "experience": {
      "totalFilled": 20,
      "completionRate": 87,
      "avg": 3.5,
      "min": 1,
      "max": 5,
      "distribution": { "1": 2, "2": 3, "3": 8, "4": 5, "5": 2 }
    }
  }
}
```

### `GET /api/analytics/templates/:draftId/submissions?page=1&limit=10`
```json
{
  "submissions": [
    {
      "submissionId": "sub-001",
      "draftId": "abc-123",
      "submittedData": { "name": "John Doe", "githubUsername": "johndoe", ... },
      "submittedAt": "2024-08-10T14:30:00Z"
    }
  ],
  "total": 23,
  "page": 1,
  "limit": 10,
  "totalPages": 3
}
```

### `GET /api/analytics/templates/:draftId/field-analysis`
```json
{
  "fieldStats": { ... },
  "enabledFields": ["name", "githubUsername", ...]
}
```

### `GET /api/analytics/trends?days=30`
```json
{
  "trends": [
    { "date": "2024-08-01", "count": 3 },
    { "date": "2024-08-02", "count": 0 },
    { "date": "2024-08-03", "count": 5 }
  ],
  "typeDistribution": [
    { "type": "student", "count": 8 },
    { "type": "employee", "count": 3 },
    { "type": "team", "count": 1 }
  ]
}
```

### `POST /api/analytics/sync`
Manual backfill endpoint. Fetches all existing `form_drafts` and `form_submissions` from Supabase and upserts them to MongoDB.

```json
{
  "templatesSynced": 12,
  "submissionsSynced": 87
}
```

- **Idempotent:** Skips submissions that already exist in MongoDB
- **Use case:** Run once after deploying Phase 1 to migrate historical data

---

## Supabase → MongoDB Sync Hooks

The following existing endpoints were modified to automatically sync data to MongoDB. All syncs are **non-blocking** with error catching — Supabase remains the primary data store.

### `POST /api/drafts` — Template Creation
When a user creates a new template draft:
- Upserts a `TemplateData` document with `source: 'created'`
- Maps `template_type` from the request to `templateType`
- Stores the full `config` object

### `PUT /api/drafts/:draftId/activate` — Template Activation
When a user activates a draft:
- Updates the `TemplateData` document's `status` to `'active'`
- Updates `expiresAt` if provided

### `DELETE /api/drafts/:draftId` — Template Deletion
When a user deletes a draft:
- Deletes the `TemplateData` document
- Deletes all associated `TemplateSubmission` documents (cascade delete)

### `POST /api/forms/:draftId/submit` — Form Submission
When a candidate submits a form:
- Creates a `TemplateSubmission` document with the submitted data
- Links to the template via `draftId` and `ownerUid`
- Copies `templateType` and `title` from the template for denormalized queries

**Sync error handling pattern:**
```js
try {
  await TemplateData.findOneAndUpdate(
    { draftId },
    { $set: { ...templateData } },
    { upsert: true }
  );
} catch (mongoErr) {
  console.error('MongoDB sync error (non-blocking):', mongoErr);
}
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string (already used by existing models) |
| `SUPABASE_URL` | Yes | Supabase project URL (existing) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (existing) |

No new environment variables were introduced in Phase 1.

---

## Commits

| # | Message |
|---|---|
| 1 | `feat(models): add TemplateData and TemplateSubmission MongoDB models` |
| 2 | `feat(analytics): add aggregation utility module` |
| 3 | `feat(api): add 6 analytics API endpoints with verifyToken auth` |
| 4 | `feat(sync): sync Supabase drafts and submissions to MongoDB` |
| 5 | `feat(sync): add POST /api/analytics/sync backfill endpoint` |
