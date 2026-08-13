# Account Deletion

## Overview

Two distinct destructive actions available in Settings → Security:

1. **Delete All Data** — wipes all user data, keeps the auth account alive
2. **Delete Account** — permanently deletes everything including the auth account

## API Endpoints

### DELETE `/api/user/data`

Wipes all user data from Supabase, MongoDB, and Cloudinary. The Supabase auth account remains active — the user can log back in with a fresh workspace.

**Request body:**
```json
{ "confirmEmail": "user@example.com" }
```

**Deletions:**

| Source | Table/Collection | Action |
|--------|-----------------|--------|
| Supabase | `form_drafts` | Delete all where `user_id = userId` |
| Supabase | `form_submissions` | Delete all where `user_id = userId` |
| Supabase | `meetings` | Delete all where `user_id = userId` |
| Supabase | `alerts` | Delete all where `user_id = userId` |
| Supabase | `candidates` | Delete all where `user_id = userId` |
| Supabase | `email_send_log` | Delete all where `user_id = userId` |
| Supabase | `profiles` | Reset: clear `display_name`, `avatar_url`, `departments` |
| MongoDB | `EmailAccount` | Delete all where `ownerUid = userId` |
| MongoDB | `EmailConfig` | Delete all (legacy) |
| MongoDB | `EmailDraft` | Delete all where `ownerUid = userId` |
| MongoDB | `EmailCampaign` | Delete all where `ownerUid = userId` |
| MongoDB | `Spreadsheet` | Delete all where `ownerUid = userId` |
| MongoDB | `User` | Delete all where `firebaseUid = userId` |
| Cloudinary | `avatars/{userId}` | Delete avatar image |

### DELETE `/api/user/account`

Performs all the same deletions as above, but also:
- Deletes the `profiles` row (instead of resetting it)
- Calls `supabase.auth.admin.deleteUser(userId)` to permanently remove the auth account

**Request body:**
```json
{ "confirmEmail": "user@example.com" }
```

**Safety:**
- `confirmEmail` must match the authenticated user's email
- If auth account deletion fails after data deletion, returns a 500 with details of what was deleted

## Frontend

### SecuritySection.jsx

Both actions open confirmation modals:

**Delete All Data modal:**
- Lists everything that will be deleted
- User must type their email to confirm
- Button disabled until email matches
- On success: shows message + calls `onLogout()` after 2s

**Delete Account modal:**
- Warning about irreversibility
- User must type their email to confirm
- User must check "I understand this is irreversible" checkbox
- Button disabled until both conditions met
- On success: shows message + calls `onLogout()` after 2s

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENCRYPTION_KEY` | Yes | 32-byte hex for AES-256-GCM (email account credentials) |
| `CLOUDINARY_CLOUD_NAME` | For avatar deletion | Cloudinary config |
| `CLOUDINARY_API_KEY` | For avatar deletion | Cloudinary config |
| `CLOUDINARY_API_SECRET` | For avatar deletion | Cloudinary config |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | For `auth.admin.deleteUser()` |
