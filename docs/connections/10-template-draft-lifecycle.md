# 10: Template Draft Lifecycle

## Source of truth

Supabase `form_drafts` owns each form's state. MongoDB `TemplateData` is an analytics mirror. Public submissions are recorded in Supabase `form_submissions` and mirrored to MongoDB `TemplateSubmission`.

```text
POST /api/drafts → draft
  ├─ PUT /api/drafts/:id/activate → active
  └─ PUT /api/drafts/:id/schedule → scheduled
       ├─ Agenda activate form draft at goesLiveAt → active
       ├─ public GET/POST fallback at goesLiveAt → active
       └─ DELETE /api/drafts/:id/schedule → draft
active → expired when the public GET checks expiry
```

`PUT /api/drafts/:id/schedule` validates that go-live is in the future and expiry follows it. Agenda stores both the draft ID and expected go-live time. If Agenda cannot save the job, the API conditionally restores the preceding draft state and returns 503. `server/utils/formActivation.js` atomically changes a row from `scheduled` to `active` only when go-live has arrived, expiry has not passed, and the stored go-live time still matches the job. A stale job cannot activate a cancelled or rescheduled form. The public GET and POST use the same guarded activation as a fallback when Agenda has not fired yet.

`DELETE /api/drafts/:id/schedule` changes Supabase status first with a `scheduled` condition. If activation won the race, it returns 409. Removing the Agenda job is cleanup after the status change. The job cannot activate a cancelled row even if removal fails.

`GET /api/forms/:id` returns the form configuration only while active and unexpired. `POST /api/forms/:id/submit` validates payload shape and size, and rejects drafts, forms scheduled for the future, and expired forms. On successful submission it saves the response in both stores and sends a notification to the form owner when mail is configured.

The scheduler starts with the existing API service after MongoDB connects. Keep that service awake for timely activation; the public fallback only runs when someone opens or submits the form.
