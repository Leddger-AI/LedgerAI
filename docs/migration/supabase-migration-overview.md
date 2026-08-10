# Supabase Migration — Master Overview

This document is the authoritative guide for the migration of Leddger AI from Firebase Authentication to Supabase Authentication, and the introduction of a dual-database architecture (Supabase + MongoDB).

**Migration Date:** August 2026
**Status:** Complete (Phases 1–7)

---

## Table of Contents

1. [Architecture: Before & After](#1-architecture-before--after)
2. [Migration Phases Summary](#2-migration-phases-summary)
3. [Files Created](#3-files-created)
4. [Files Modified](#4-files-modified)
5. [Files Deprecated](#5-files-deprecated)
6. [Packages Removed](#6-packages-removed)
7. [Packages Added](#7-packages-added)
8. [Environment Variables](#8-environment-variables)
9. [Related Documentation](#9-related-documentation)

---

## 1. Architecture: Before & After

### Before (Firebase + MongoDB)

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│                                                              │
│  firebaseAuth.js ──► Firebase Client SDK                     │
│  auth.currentUser.getIdToken() ──► Firebase ID Token         │
│  onAuthStateChanged ──► Firebase session listener            │
│  signInWithPopup (Google) ──► Firebase Google OAuth          │
│  signInAnonymously ──► Firebase anonymous auth (StudentPortal)│
└──────────────────────────┬──────────────────────────────────┘
                           │ Bearer <Firebase_ID_Token>
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)               │
│                                                              │
│  firebase-admin ──► verifyIdToken() ──► decodedToken.uid     │
│                                                              │
│  MongoDB (Mongoose):                                         │
│    ├── User.js        (firebaseUid, departments)             │
│    ├── FormDraft.js   (recruiterId, config, expiresAt)       │
│    └── FormSubmission.js (draftId, submittedData)            │
└─────────────────────────────────────────────────────────────┘
```

### After (Supabase + MongoDB)

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
│                                                              │
│  supabaseClient.js ──► Supabase JS Client                    │
│  supabaseAuth.js ──► Auth wrappers                           │
│    ├── loginWithGoogleAndCalendar() ──► signInWithOAuth      │
│    ├── loginWithEmail() ──► signInWithPassword               │
│    ├── signUpWithEmail() ──► supabase.auth.signUp            │
│    ├── signOut() ──► supabase.auth.signOut                   │
│    ├── getCurrentSession() ──► supabase.auth.getSession      │
│    ├── onAuthChange() ──► supabase.auth.onAuthStateChange    │
│    ├── getAuthToken() ──► session.access_token               │
│    └── getCurrentUser() ──► supabase.auth.getUser            │
└──────────────────────────┬──────────────────────────────────┘
                           │ Bearer <Supabase_Access_Token>
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)               │
│                                                              │
│  supabaseClient.js ──► Supabase Admin (service role key)     │
│  middleware/auth.js ──► supabase.auth.getUser(token)         │
│    ──► req.user = { uid: user.id, email: user.email }        │
│                                                              │
│  Supabase (PostgreSQL):                                      │
│    ├── profiles         (id, email, departments)             │
│    ├── form_drafts      (draft_id, user_id, config, status)  │
│    ├── form_submissions (submission_id, draft_id, data)      │
│    ├── meetings         (user_id, title, start_time, ...)    │
│    ├── alerts           (user_id, type, title, resolved)     │
│    └── candidates       (user_id, name, email, status)       │
│                                                              │
│  MongoDB (Mongoose):                                         │
│    └── Spreadsheet.js  (ownerUid, name, sheets)              │
│        └── 20-file limit enforced per user                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Migration Phases Summary

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Install `@supabase/supabase-js`, create `supabaseClient.js` and `supabaseAuth.js` | ✅ Complete |
| 2 | Migrate frontend auth from Firebase to Supabase (9 files) | ✅ Complete |
| 3 | Migrate backend auth middleware from Firebase Admin to Supabase JWT verification | ✅ Complete |
| 4 | Move user data models (User, FormDraft, FormSubmission) from MongoDB to Supabase tables | ✅ Complete |
| 5 | Add Spreadsheet Mongoose model to MongoDB with 20-file limit enforcement | ✅ Complete |
| 6 | Update `LedgerSpreadsheet.jsx` with cloud save/load/delete UI + limit modal + export-before-delete | ✅ Complete |
| 7 | Persist meetings & alerts to Supabase tables | ✅ Complete |

### Detailed Phase Documentation

- **Phase 1–2 (Frontend Auth):** See [supabase-auth-frontend.md](./supabase-auth-frontend.md)
- **Phase 3 (Backend Auth):** See [supabase-auth-backend.md](./supabase-auth-backend.md)
- **Phase 4 (Data Models):** See [dual-database-architecture.md](./dual-database-architecture.md)
- **Phase 5–6 (Spreadsheet Storage):** See [spreadsheet-cloud-storage.md](./spreadsheet-cloud-storage.md)
- **Phase 7 (Meetings & Alerts):** See [meetings-alerts-supabase.md](./meetings-alerts-supabase.md)
- **Supabase Dashboard Setup:** See [supabase-setup-guide.md](./supabase-setup-guide.md)

---

## 3. Files Created

### Frontend

| File | Purpose |
|------|---------|
| `src/supabaseClient.js` | Initializes the Supabase JS client with env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |

### Frontend (Auth Wrappers)

| File | Purpose |
|------|---------|
| `src/supabaseAuth.js` | Wraps all Supabase auth methods: Google OAuth, email/password login, sign-up, sign-out, session retrieval, auth state change subscription, `getAuthToken()`, `getCurrentUser()` |

### Backend

| File | Purpose |
|------|---------|
| `server/supabaseClient.js` | Initializes Supabase admin client with service role key for backend operations |
| `server/models/Spreadsheet.js` | Mongoose model for spreadsheet cloud storage in MongoDB |
| `server/supabase_schema.sql` | SQL migration file to create all Supabase tables, RLS policies, indexes, and triggers |

### Documentation

| File | Purpose |
|------|---------|
| `docs/migration/supabase-migration-overview.md` | This file — master overview |
| `docs/migration/supabase-auth-frontend.md` | Detailed frontend auth migration |
| `docs/migration/supabase-auth-backend.md` | Backend auth middleware migration |
| `docs/migration/dual-database-architecture.md` | Supabase + MongoDB architecture |
| `docs/migration/spreadsheet-cloud-storage.md` | Spreadsheet cloud storage + 20-file limit |
| `docs/migration/meetings-alerts-supabase.md` | Meetings & alerts persistence |
| `docs/migration/supabase-setup-guide.md` | Step-by-step Supabase dashboard setup |

---

## 4. Files Modified

### Frontend (9 files)

| File | Changes |
|------|---------|
| `src/App.jsx` | Replaced Firebase imports with Supabase. Replaced `onAuthStateChanged` with `getCurrentSession()` + `onAuthChange()`. Updated login/logout handlers. Updated token management to use Supabase access tokens. Updated `fetchEvents` to use `accessToken`. Added `fetchMeetings()` and `fetchAlerts()` functions. Updated demo mode tokens. Updated error modal text. |
| `src/components/ProtectedRoute.jsx` | Updated comment from Firebase to Supabase |
| `src/SettingsView.jsx` | Replaced Firebase Service Key Path input with read-only Supabase URL display |
| `src/pages/ActiveLinksView.jsx` | Replaced `firebaseAuth` import with `supabaseAuth`. Replaced `auth.currentUser.getIdToken()` with `getAuthToken()` |
| `src/pages/DraftsView.jsx` | Same Firebase → Supabase token replacement (4 call sites) |
| `src/pages/EmployeeTemplateBuilder.jsx` | Same Firebase → Supabase token replacement |
| `src/pages/StudentTemplateBuilder.jsx` | Same Firebase → Supabase token replacement |
| `src/pages/TeamTemplateBuilder.jsx` | Replaced `auth.currentUser` check with `getCurrentUser()`. Replaced `auth.currentUser.getIdToken()` with `getAuthToken()` |
| `src/pages/StudentPortal.jsx` | Replaced Firebase anonymous auth with Supabase session check. Replaced `auth.currentUser.uid` with `getCurrentUser()?.id` |
| `src/LedgerSpreadsheet.jsx` | Added cloud save/load/delete functionality with 5 modals (Save, Load, Limit reached, Delete confirmation, Export-before-delete) |

### Backend (2 files)

| File | Changes |
|------|---------|
| `server/middleware/auth.js` | Complete rewrite: replaced Firebase Admin SDK with Supabase JWT verification using `supabase.auth.getUser(token)` |
| `server/index.js` | Removed Mongoose model imports (User, FormDraft, FormSubmission). Added Supabase client import. Migrated all user/draft/submission endpoints to Supabase queries. Added 6 spreadsheet endpoints with 20-file limit. Added meetings CRUD endpoints. Added alerts CRUD endpoints. |

---

## 5. Files Deprecated

| File | Status | Notes |
|------|--------|-------|
| `src/firebaseAuth.js` | Dead code | No longer imported by any file. Safe to delete. Contains old Firebase config and auth methods. |
| `server/models/User.js` | Dead code | No longer imported by `server/index.js`. User data now in Supabase `profiles` table. Safe to delete. |
| `server/models/FormDraft.js` | Dead code | No longer imported by `server/index.js`. Draft data now in Supabase `form_drafts` table. Safe to delete. |
| `server/models/FormSubmission.js` | Dead code | No longer imported by `server/index.js`. Submission data now in Supabase `form_submissions` table. Safe to delete. |

---

## 6. Packages Removed

| Package | Location | Reason |
|---------|----------|--------|
| `firebase` | Frontend (`package.json`) | Replaced by `@supabase/supabase-js` |
| `firebase-admin` | Backend (`server/package.json`) | Replaced by `@supabase/supabase-js` |

---

## 7. Packages Added

| Package | Location | Version |
|---------|----------|---------|
| `@supabase/supabase-js` | Frontend (`package.json`) | `^2.112.2` |
| `@supabase/supabase-js` | Backend (`server/package.json`) | `^2.112.2` |

---

## 8. Environment Variables

### Frontend (`.env`)

```ini
# Supabase (frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API
VITE_API_URL=http://localhost:5000
```

### Backend (`server/.env`)

```ini
# Supabase (backend — service role key, NOT the anon key)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# MongoDB (still used for Spreadsheet storage)
MONGODB_URI=your-mongodb-connection-string

# Server
PORT=5000

# Email (Gmail OAuth2)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REFRESH_TOKEN=your-google-refresh-token
GOOGLE_EMAIL=your-email@gmail.com
```

> **⚠️ CRITICAL:** Never expose the `SUPABASE_SERVICE_ROLE_KEY` in the frontend. Only use `VITE_SUPABASE_ANON_KEY` in frontend code.

---

## 9. Related Documentation

### Migration-Specific (New)

- [Supabase Auth — Frontend Migration](./supabase-auth-frontend.md)
- [Supabase Auth — Backend Migration](./supabase-auth-backend.md)
- [Dual-Database Architecture](./dual-database-architecture.md)
- [Spreadsheet Cloud Storage & 20-File Limit](./spreadsheet-cloud-storage.md)
- [Meetings & Alerts Persistence](./meetings-alerts-supabase.md)
- [Supabase Setup Guide](./supabase-setup-guide.md)

### Updated Existing Docs

- [README.md](../../README.md) — Updated tech stack and env vars
- [Authentication Flow](../authentication-flow.md) — Rewritten for Supabase
- [CHANGELOG](../CHANGELOG.md) — Added migration section
- [Changes](../changes.md) — Updated Firebase references
- [Feature: Drafts & Email](../feature-drafts-and-email.md) — Updated data model references
- [Drafts Dashboard Architecture](../drafts-dashboard-architecture.md) — Updated backend references
- [API Specs](../backend/api_specs.md) — Added all new endpoints
- [Production Deployment](../deployment/production_deployment.md) — Updated for Node.js + Supabase
- [Rust Backend](../backend/rust_backend.md) — Marked as legacy
