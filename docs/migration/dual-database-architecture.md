# Dual-Database Architecture: Supabase + MongoDB (Phase 4)

This document details the dual-database architecture where Supabase (PostgreSQL) stores user/auth data and MongoDB stores spreadsheet data.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Why Dual Database?](#2-why-dual-database)
3. [Supabase Schema (SQL)](#3-supabase-schema-sql)
4. [Row Level Security (RLS)](#4-row-level-security-rls)
5. [MongoDB Schema (Mongoose)](#5-mongodb-schema-mongoose)
6. [Data Migration: MongoDB → Supabase](#6-data-migration-mongodb--supabase)
7. [Backend Endpoint Changes](#7-backend-endpoint-changes)
8. [Environment Variables](#8-environment-variables)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Leddger AI Backend                       │
│                                                              │
│  server/index.js (Express)                                   │
│    │                                                         │
│    ├── User Data ──────► Supabase (PostgreSQL)               │
│    │   ├── profiles table                                    │
│    │   ├── form_drafts table                                 │
│    │   ├── form_submissions table                            │
│    │   ├── meetings table                                    │
│    │   ├── alerts table                                      │
│    │   └── candidates table                                  │
│    │                                                         │
│    └── Spreadsheet Data ──► MongoDB (Mongoose)               │
│        └── Spreadsheet model                                 │
│            (ownerUid, name, sheets, timestamps)              │
│            └── 20-file limit per user enforced               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Why Dual Database?

### Supabase (PostgreSQL) for User Data

- **Built-in Auth:** Supabase provides authentication, JWT issuance, and session management out of the box.
- **Row Level Security:** PostgreSQL RLS policies enforce data isolation at the database level.
- **Relational Data:** User profiles, drafts, submissions, meetings, and alerts have clear relational structure.
- **Free Tier:** 500MB database, 50,000 monthly active users, unlimited API requests.

### MongoDB for Spreadsheet Data

- **Flexible Schema:** FortuneSheet data structures are deeply nested JSON (celldata arrays, config objects, merge definitions). MongoDB's document model handles this naturally.
- **Large Documents:** Spreadsheet data can be several MB per file. MongoDB handles large BSON documents efficiently.
- **Existing Infrastructure:** MongoDB connection was already set up and working.
- **20-File Limit:** Enforced at the application level using `countDocuments()`.

---

## 3. Supabase Schema (SQL)

The complete schema is in `server/supabase_schema.sql`. Run it in Supabase Dashboard → SQL Editor.

### Tables Created

#### `profiles`
Extends `auth.users` with application-specific data.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | FK to `auth.users`, primary key |
| `email` | TEXT | User email |
| `display_name` | TEXT | Display name |
| `avatar_url` | TEXT | Profile picture URL |
| `departments` | TEXT[] | Array of department names |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |
| `updated_at` | TIMESTAMPTZ | Default `NOW()` |

#### `form_drafts`
Replaces the MongoDB `FormDraft` model.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key (auto-generated) |
| `draft_id` | TEXT | Unique UUID for public URL |
| `user_id` | UUID | FK to `auth.users` |
| `title` | TEXT | Draft title |
| `config` | JSONB | Toggle states, field config |
| `template_type` | TEXT | 'student', 'employee', 'team', etc. |
| `status` | TEXT | 'draft', 'active', 'expired' |
| `expires_at` | TIMESTAMPTZ | When the public link expires |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |
| `updated_at` | TIMESTAMPTZ | Default `NOW()` |

#### `form_submissions`
Replaces the MongoDB `FormSubmission` model.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `submission_id` | TEXT | Unique UUID |
| `draft_id` | TEXT | FK to `form_drafts.draft_id` |
| `title` | TEXT | Draft title at time of submission |
| `submitted_data` | JSONB | Form payload |
| `submitted_at` | TIMESTAMPTZ | Default `NOW()` |

#### `meetings`
Stores calendar meeting data with AI attribution.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `auth.users` |
| `title` | TEXT | Meeting title |
| `start_time` | TIMESTAMPTZ | Meeting start |
| `end_time` | TIMESTAMPTZ | Meeting end |
| `duration_minutes` | INT | Calculated duration |
| `attendees` | JSONB | Array of attendee objects |
| `ai_project` | TEXT | AI-classified project |
| `ai_confidence` | FLOAT | Confidence score (0-100) |
| `requires_human_review` | BOOLEAN | Default `FALSE` |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |

#### `alerts`
Stores system alerts for the user.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `auth.users` |
| `type` | TEXT | 'danger', 'warning', 'info', etc. |
| `title` | TEXT | Alert title |
| `description` | TEXT | Alert details |
| `resolved` | BOOLEAN | Default `FALSE` |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |

#### `candidates`
Stores candidate evaluation data.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK to `auth.users` (recruiter) |
| `spreadsheet_id` | TEXT | Reference to MongoDB spreadsheet |
| `row_number` | INT | Row in spreadsheet |
| `name` | TEXT | Candidate name |
| `email` | TEXT | Candidate email |
| `github` | TEXT | GitHub username |
| `status` | TEXT | 'new', 'reviewed', 'hired', etc. |
| `created_at` | TIMESTAMPTZ | Default `NOW()` |
| `updated_at` | TIMESTAMPTZ | Default `NOW()` |

---

## 4. Row Level Security (RLS)

All tables have RLS enabled. This means even if someone obtains the anon key, they can only access their own data.

### Policies

| Table | Policy | Rule |
|-------|--------|------|
| `profiles` | Users manage own profile | `auth.uid() = id` |
| `form_drafts` | Users manage own drafts | `auth.uid() = user_id` |
| `form_submissions` | Users view own submissions | Submissions linked to drafts owned by `auth.uid()` |
| `meetings` | Users manage own meetings | `auth.uid() = user_id` |
| `alerts` | Users manage own alerts | `auth.uid() = user_id` |
| `candidates` | Users manage own candidates | `auth.uid() = user_id` |

### Auto-Profile Creation Trigger

A database trigger automatically creates a `profiles` row when a new user signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

This means every new user (via Google OAuth or email/password) automatically gets a profile row — no backend call needed.

### Indexes

```sql
CREATE INDEX idx_form_drafts_user_id ON form_drafts(user_id);
CREATE INDEX idx_form_drafts_draft_id ON form_drafts(draft_id);
CREATE INDEX idx_form_submissions_draft_id ON form_submissions(draft_id);
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_candidates_user_id ON candidates(user_id);
```

---

## 5. MongoDB Schema (Mongoose)

### `Spreadsheet.js` (Created)

```js
const SpreadsheetSchema = new mongoose.Schema({
  ownerUid: { type: String, required: true, index: true },
  name: { type: String, required: true },
  sheets: { type: mongoose.Schema.Types.Mixed, default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

SpreadsheetSchema.index({ ownerUid: 1, name: 1 }, { unique: true });
```

**Key design decisions:**
- `ownerUid` — stores the Supabase user UUID, linking MongoDB documents to Supabase auth users.
- `sheets` — `Mixed` type to store the FortuneSheet workbook data (array of sheet objects with celldata, config, etc.).
- Compound unique index on `(ownerUid, name)` — prevents duplicate file names per user.
- The 20-file limit is enforced in the API endpoint, not at the schema level.

### Deprecated Mongoose Models

These models are no longer imported by `server/index.js` but kept for reference:

| Model | Replaced By | Status |
|-------|-------------|--------|
| `User.js` | Supabase `profiles` table | Dead code |
| `FormDraft.js` | Supabase `form_drafts` table | Dead code |
| `FormSubmission.js` | Supabase `form_submissions` table | Dead code |

---

## 6. Data Migration: MongoDB → Supabase

If you have existing data in MongoDB from the Firebase era, you need to migrate it:

### User Migration

1. Export users from Firebase Admin SDK
2. Import users into Supabase Auth (Dashboard → Authentication → Users → Add user)
3. Run the SQL schema to create profile rows (trigger handles new signups; for imported users, manually insert profiles)

### Drafts Migration

```sql
-- For each FormDraft document in MongoDB:
INSERT INTO form_drafts (draft_id, user_id, title, config, template_type, status, expires_at, created_at)
VALUES (
  'mongo-draft-uuid',
  'supabase-user-uuid',
  'Draft Title',
  '{"toggle1": true}'::jsonb,
  'team',
  'active',
  '2026-12-31T23:59:59Z',
  NOW()
);
```

### Submissions Migration

```sql
INSERT INTO form_submissions (submission_id, draft_id, title, submitted_data)
VALUES (
  'mongo-submission-uuid',
  'mongo-draft-uuid',
  'Draft Title',
  '{"field1": "value1"}'::jsonb
);
```

> **Note:** The `user_id` in Supabase will be different from the Firebase `uid`. You need to map old Firebase UIDs to new Supabase UUIDs during migration.

---

## 7. Backend Endpoint Changes

### `server/index.js` — Before vs After

| Endpoint | Before (MongoDB) | After (Supabase) |
|----------|-----------------|-----------------|
| `GET /api/user/departments` | `User.findOne({ firebaseUid })` | `supabase.from('profiles').select('*').eq('id', userId)` |
| `POST /api/user/departments` | `User.findOneAndUpdate(...)` | `supabase.from('profiles').upsert(...)` |
| `POST /api/drafts` | `FormDraft.create(...)` | `supabase.from('form_drafts').insert(...)` |
| `GET /api/drafts` | `FormDraft.find({ recruiterId })` | `supabase.from('form_drafts').select('*').eq('user_id', uid)` |
| `DELETE /api/drafts/:draftId` | `FormDraft.deleteOne(...)` | `supabase.from('form_drafts').delete().eq('draft_id', id).eq('user_id', uid)` |
| `PUT /api/drafts/:draftId/activate` | `draft.save()` | `supabase.from('form_drafts').update(...)` |
| `GET /api/forms/:draftId` | `FormDraft.findOne(...)` | `supabase.from('form_drafts').select('*').eq('draft_id', id).single()` |
| `POST /api/forms/:draftId/submit` | `FormSubmission.create(...)` | `supabase.from('form_submissions').insert(...)` |

### New Endpoints Added

| Endpoint | Database | Purpose |
|----------|----------|---------|
| `GET /api/spreadsheets` | MongoDB | List user's saved spreadsheets |
| `GET /api/spreadsheets/:id` | MongoDB | Load a specific spreadsheet |
| `POST /api/spreadsheets` | MongoDB | Save a new spreadsheet (20-file limit) |
| `PUT /api/spreadsheets/:id` | MongoDB | Update an existing spreadsheet |
| `DELETE /api/spreadsheets/:id` | MongoDB | Delete a spreadsheet |
| `GET /api/spreadsheets/count` | MongoDB | Get count + limit info |
| `GET /api/meetings` | Supabase | List user's meetings |
| `POST /api/meetings` | Supabase | Save a meeting |
| `DELETE /api/meetings/:id` | Supabase | Delete a meeting |
| `GET /api/alerts` | Supabase | List user's alerts |
| `POST /api/alerts` | Supabase | Create an alert |
| `PUT /api/alerts/:id/resolve` | Supabase | Mark alert as resolved |
| `DELETE /api/alerts/:id` | Supabase | Delete an alert |

---

## 8. Environment Variables

### Frontend `.env`

```ini
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:5000
```

### Backend `server/.env`

```ini
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# MongoDB (for Spreadsheet storage)
MONGODB_URI=mongodb+srv://...

# Server
PORT=5000

# Email (Gmail OAuth2)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...
GOOGLE_EMAIL=...
```

### Removed Variables

```ini
# These are NO LONGER NEEDED — remove from server/.env
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_SERVICE_ACCOUNT_KEY=...
```
