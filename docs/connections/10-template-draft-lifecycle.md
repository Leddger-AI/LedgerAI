# 10: Template Draft Lifecycle

## Feature Summary

A form template goes through a lifecycle: **created** → **scheduled** (optional) → **active** → **expired**. Drafts are stored in Supabase (`form_drafts` table) and synced to MongoDB (`TemplateData`) for analytics. The Agenda scheduler handles automatic activation of scheduled drafts. Public form submissions are stored in both Supabase and MongoDB.

## ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1: CREATE DRAFT                                            │
│  FRONTEND: User fills template builder → clicks "Save Draft"     │
│  └─ POST /api/drafts (server/index.js:142)                      │
│     ├─ verifyToken → req.user.uid                                │
│     ├─ Insert into Supabase form_drafts (status: 'draft')       │
│     ├─ Sync to MongoDB: TemplateData.findOneAndUpdate           │
│     │  { draftId, ownerUid, title, templateType, config,        │
│     │    status: 'draft', source: 'created' }                    │
│     └─ res.json({ draftId })                                     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2A: ACTIVATE IMMEDIATELY                                   │
│  PUT /api/drafts/:draftId/activate (server/index.js:251)        │
│  ├─ Update Supabase: status='active', expires_at set            │
│  ├─ Sync to MongoDB: TemplateData status='active'               │
│  └─ Form link is now live — accepts submissions                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2B: SCHEDULE FOR FUTURE                                    │
│  PUT /api/drafts/:draftId/schedule (server/index.js:344)        │
│  ├─ Validate: goesLiveAt (future), expiresAt (after live)       │
│  ├─ Update Supabase: status='scheduled', goes_live_at,          │
│  │  expires_at                                                   │
│  ├─ scheduleDraftActivation(draftId, goesLiveAt)                │
│  │  → scheduler.js:193                                          │
│  │  ├─ getAgenda() → Agenda instance                            │
│  │  └─ agenda.schedule(goesLiveAt, 'activate form draft',       │
│  │                     { draftId })                             │
│  └─ res.json({ message: 'Draft scheduled' })                    │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼ (at goesLiveAt time)
┌─────────────────────────────────────────────────────────────────┐
│  AGENDA: AUTO-ACTIVATE (server/scheduler.js:155)                 │
│  Job: 'activate form draft'                                      │
│  ├─ supabase.from('form_drafts').update({                       │
│  │    status: 'active',                                         │
│  │    updated_at: now                                            │
│  │  }).eq('draft_id', draftId)                                  │
│  └─ console.log(`Draft ${draftId} activated (link is now live)`)│
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3: PUBLIC FORM SUBMISSION                                  │
│  GET /api/forms/:draftId (server/index.js:458) — NO AUTH        │
│  ├─ Fetch draft from Supabase (must be 'active')                │
│  └─ res.json({ title, config, templateType })                   │
│                                                                   │
│  POST /api/forms/:draftId/submit (server/index.js:509) — NO AUTH│
│  ├─ Validate draft is active and not expired                     │
│  ├─ Insert into Supabase form_submissions                       │
│  ├─ Sync to MongoDB: TemplateSubmission.create({                │
│  │    submissionId, draftId, ownerUid, templateType,            │
│  │    title, submittedData, submittedAt                         │
│  │  })                                                           │
│  ├─ Fire-and-forget: sendFormSubmissionEmail()                  │
│  │  └─ Notifies form owner via email (if configured)            │
│  └─ res.json({ message: 'Submitted', submissionId })           │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 4: CANCEL SCHEDULED DRAFT                                  │
│  DELETE /api/drafts/:draftId/schedule (server/index.js:407)     │
│  ├─ Find draft in Supabase                                       │
│  ├─ cancelDraftActivation(draftId) → scheduler.js:199           │
│  │  └─ agenda.cancel({ name: 'activate form draft',             │
│  │                     'data.draftId': id })                     │
│  ├─ Update Supabase: status='draft', clear goes_live_at         │
│  └─ res.json({ message: 'Schedule cancelled' })                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PHASE 5: DELETE DRAFT                                            │
│  DELETE /api/drafts/:draftId (server/index.js:220)              │
│  ├─ Delete from Supabase form_drafts                             │
│  ├─ Delete from MongoDB: TemplateData.deleteOne                 │
│  ├─ Delete from MongoDB: TemplateSubmission.deleteMany          │
│  └─ res.json({ message: 'Deleted' })                             │
└─────────────────────────────────────────────────────────────────┘
```

## File-by-File Trace

| Step | File | Lines | What Happens |
|------|------|-------|--------------|
| 1. Create | `server/index.js` | 142-179 | `POST /api/drafts` |
| 2. List | `server/index.js` | 190-215 | `GET /api/drafts` |
| 3. Activate | `server/index.js` | 251-295 | `PUT /api/drafts/:id/activate` |
| 4. Schedule | `server/index.js` | 344-399 | `PUT /api/drafts/:id/schedule` |
| 5. Cancel schedule | `server/index.js` | 407-453 | `DELETE /api/drafts/:id/schedule` |
| 6. Get public form | `server/index.js` | 458-505 | `GET /api/forms/:draftId` (no auth) |
| 7. Submit form | `server/index.js` | 509-558 | `POST /api/forms/:draftId/submit` (no auth) |
| 8. Delete | `server/index.js` | 220-240 | `DELETE /api/drafts/:draftId` |
| 9. Agenda activate | `server/scheduler.js` | 155-172 | `agenda.define('activate form draft')` |
| 10. Schedule activation | `server/scheduler.js` | 193-197 | `scheduleDraftActivation()` |
| 11. Cancel activation | `server/scheduler.js` | 199-203 | `cancelDraftActivation()` |
| 12. List scheduled | `server/index.js` | 311-338 | `GET /api/drafts/scheduled` |

## Shared Dependencies

- **Supabase** — `form_drafts` and `form_submissions` tables (source of truth)
- **MongoDB** — `TemplateData` and `TemplateSubmission` (analytics mirror)
- **Agenda** — scheduled draft activation
- **emailService** — form submission notification emails
- **Supabase Auth** — JWT for protected endpoints (create/activate/schedule/delete)

## Error Paths

| Scenario | What Happens |
|----------|-------------|
| Draft not found | 404 returned |
| goesLiveAt in past | 400: "goesLiveAt must be in the future" |
| expiresAt before goesLiveAt | 400: "expiresAt must be after goesLiveAt" |
| Form not active on submit | 403: "This form is not currently active" |
| Form expired on submit | 403: "This form has expired" |
| Agenda job fails | Draft stays 'scheduled', logged to console |

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `MONGODB_URI` | Yes | MongoDB for TemplateData + Agenda |
| `SUPABASE_URL` | Yes | Supabase for form_drafts + form_submissions |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role |
