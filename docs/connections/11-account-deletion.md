# 11: Account Deletion

## Feature Summary

User can delete all their data (keeping auth account) or permanently delete their account. Both endpoints cascade across three systems: Supabase (PostgreSQL tables), MongoDB (all collections), and Cloudinary (avatar image). The full deletion requires email confirmation to prevent accidental data loss.

## ASCII Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (SettingsView.jsx → SecuritySection)                   │
│                                                                   │
│  User goes to Settings → Account & Security                       │
│  ├─ "Delete All Data" button (keeps auth account)                │
│  └─ "Delete Account" button (permanently removes account)        │
│                                                                   │
│  Both require email confirmation:                                 │
│  └─ User must type their email to confirm                        │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — DELETE ALL DATA (server/index.js:1917)                │
│  DELETE /api/user/data                                            │
│  ├─ verifyToken → req.user.uid, req.user.email                   │
│  ├─ Validate: confirmEmail === req.user.email                   │
│  │  └─ If mismatch → 400: "Email confirmation does not match"   │
│  │                                                                │
│  ├─ STEP 1: SUPABASE DELETIONS                                   │
│  │  ├─ form_drafts.delete().eq('user_id', userId)               │
│  │  ├─ form_submissions.delete().eq('user_id', userId)          │
│  │  ├─ meetings.delete().eq('user_id', userId)                  │
│  │  ├─ alerts.delete().eq('user_id', userId)                    │
│  │  ├─ candidates.delete().eq('user_id', userId)                │
│  │  ├─ email_send_log.delete().eq('user_id', userId)            │
│  │  └─ profiles.update({ display_name: null, avatar_url: null, │
│  │      departments: [] }) ← Reset profile (keep row)           │
│  │                                                                │
│  ├─ STEP 2: MONGODB DELETIONS                                    │
│  │  ├─ EmailAccount.deleteMany({ ownerUid: userId })            │
│  │  ├─ EmailConfig.deleteMany({ ownerUid: userId })             │
│  │  ├─ EmailDraft.deleteMany({ ownerUid: userId })              │
│  │  ├─ EmailCampaign.deleteMany({ ownerUid: userId })           │
│  │  ├─ Spreadsheet.deleteMany({ ownerUid: userId })             │
│  │  └─ User.deleteMany({ firebaseUid: userId }) (deprecated)    │
│  │                                                                │
│  ├─ STEP 3: CLOUDINARY DELETION                                  │
│  │  └─ cloudinary.uploader.destroy('avatars/' + userId)         │
│  │     └─ Non-fatal if fails                                     │
│  │                                                                │
│  └─ res.json({ success: true, deleted: { supabase, mongodb,     │
│             cloudinary } })                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  BACKEND — DELETE ACCOUNT (server/index.js:1978)                 │
│  DELETE /api/user/account                                         │
│  ├─ verifyToken → req.user.uid, req.user.email                   │
│  ├─ Validate: confirmEmail === req.user.email                   │
│  │                                                                │
│  ├─ STEP 1: Same as DELETE /api/user/data                        │
│  │  ├─ Wipe all Supabase tables                                  │
│  │  ├─ Wipe all MongoDB collections                              │
│  │  └─ Delete Cloudinary avatar                                  │
│  │                                                                │
│  ├─ STEP 2: DELETE SUPABASE AUTH ACCOUNT                         │
│  │  └─ supabaseAdmin.auth.adminDeleteUser(userId)               │
│  │     └─ Permanently removes auth account                       │
│  │                                                                │
│  └─ res.json({ success: true, deleted, accountDeleted: true })  │
└─────────────────────────────────────────────────────────────────┘
```

## File-by-File Trace

| Step | File | Lines | What Happens |
|------|------|-------|--------------|
| 1. Delete data | `server/index.js` | 1917-1976 | `DELETE /api/user/data` |
| 2. Delete account | `server/index.js` | 1978-2043 | `DELETE /api/user/account` |
| 3. Supabase tables | `server/index.js` | 1929-1933 | 6 tables deleted |
| 4. Profile reset | `server/index.js` | 1936-1942 | Profile cleared but row kept |
| 5. MongoDB models | `server/index.js` | 1945-1960 | 6 models + User deleted |
| 6. Cloudinary | `server/index.js` | 1962-1971 | Avatar destroyed |
| 7. Auth deletion | `server/index.js` | 2028-2033 | `adminDeleteUser()` |
| 8. Cloudinary config | `server/index.js` | 1653-1665 | `configureCloudinary()` |

## Shared Dependencies

- **Supabase** — 6 tables + profiles + auth account deletion
- **MongoDB** — EmailAccount, EmailConfig, EmailDraft, EmailCampaign, Spreadsheet, User
- **Cloudinary** — avatar image deletion
- **Supabase Admin** — `adminDeleteUser()` for permanent account removal

## Error Paths

| Scenario | What Happens |
|----------|-------------|
| Email doesn't match | 400: "Email confirmation does not match" |
| Supabase table delete fails | Error logged, deletion continues for other tables |
| MongoDB delete fails | Error caught, 500 returned |
| Cloudinary fails | Non-fatal, logged as warning |
| adminDeleteUser fails | 500: "Failed to delete account" |

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role for adminDeleteUser + table deletion |
| `MONGODB_URI` | Yes | MongoDB connection |
| `CLOUDINARY_CLOUDNAME` | No | Cloudinary (non-fatal if missing) |
| `CLOUDINARY_API_KEY` | No | Cloudinary |
| `CLOUDINARY_API_SECREAT` | No | Cloudinary |

## Note on Google Drive Tokens

The current deletion endpoints do **not** delete `GoogleDriveToken` records. This is a known gap — a fix should add `GoogleDriveToken.deleteMany({ ownerUid: userId })` to the MongoDB deletion step. See [04-google-drive-oauth-connect.md](./04-google-drive-oauth-connect.md).
