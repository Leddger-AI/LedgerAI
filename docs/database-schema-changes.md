# Database Schema Changes

**Date:** August 11, 2026  
**Scope:** Supabase schema modifications for data integrity and RLS improvements.

---

## Table: `form_submissions`

### Column Added

| Column | Type | Nullable | References | Notes |
|--------|------|----------|------------|-------|
| `user_id` | `UUID` | Yes (nullable for legacy rows) | `auth.users ON DELETE CASCADE` | Links submission to the draft owner for direct RLS |

### RLS Policy Updated

**Before:**
```sql
CREATE POLICY "Users view own submissions" ON form_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM form_drafts 
      WHERE form_drafts.draft_id = form_submissions.draft_id 
      AND form_drafts.user_id = auth.uid()
    )
  );
```

**After:**
```sql
CREATE POLICY "Users view own submissions" ON form_submissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM form_drafts 
      WHERE form_drafts.draft_id = form_submissions.draft_id 
      AND form_drafts.user_id = auth.uid()
    )
  );
```

**Rationale:** The direct `user_id = auth.uid()` check is evaluated first and avoids the subquery JOIN to `form_drafts`. The `OR EXISTS` fallback ensures legacy submissions (inserted before the `user_id` column existed) remain accessible.

### Index Added

```sql
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);
```

---

## Migration Instructions

If the database already exists (not a fresh deployment), run the following in the Supabase Dashboard → SQL Editor:

```sql
-- Add user_id column to form_submissions
ALTER TABLE form_submissions 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users ON DELETE CASCADE;

-- Add index for user_id queries
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);

-- Update RLS policy (drop old, create new)
DROP POLICY IF EXISTS "Users view own submissions" ON form_submissions;

CREATE POLICY "Users view own submissions" ON form_submissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM form_drafts 
      WHERE form_drafts.draft_id = form_submissions.draft_id 
      AND form_drafts.user_id = auth.uid()
    )
  );

-- Backfill user_id for existing submissions (optional but recommended)
UPDATE form_submissions fs
SET user_id = fd.user_id
FROM form_drafts fd
WHERE fs.draft_id = fd.draft_id
  AND fs.user_id IS NULL;
```

**Note:** The backfill query copies `user_id` from the parent `form_drafts` record for all existing submissions that don't yet have a `user_id`. This ensures the direct RLS check works for all rows going forward.

---

## Full Schema Reference

The complete updated schema is in `server/supabase_schema.sql`. Tables included:

| Table | Purpose | RLS | user_id Column |
|-------|---------|-----|----------------|
| `profiles` | User profile data | ✅ `auth.uid() = id` | N/A (id is the key) |
| `form_drafts` | Form template drafts | ✅ `auth.uid() = user_id` | ✅ NOT NULL |
| `form_submissions` | Form submission data | ✅ `user_id = auth.uid()` OR subquery | ✅ Nullable (with backfill) |
| `meetings` | Calendar meetings | ✅ `auth.uid() = user_id` | ✅ NOT NULL |
| `alerts` | System alerts | ✅ `auth.uid() = user_id` | ✅ NOT NULL |
| `candidates` | Candidate tracking | ✅ `auth.uid() = user_id` | ✅ NOT NULL |

---

## MongoDB Collections (Unchanged)

| Collection | Model File | Purpose |
|------------|------------|---------|
| `emaildrafts` | `server/models/EmailDraft.js` | Email draft documents |
| `emailconfigs` | `server/models/EmailConfig.js` | Per-user email sending config |
| `emailcampaigns` | `server/models/EmailCampaign.js` | Email campaign tracking |
| `spreadsheets` | `server/models/Spreadsheet.js` | Roster Studio spreadsheet data |

All MongoDB collections use `ownerUid` for per-user data isolation, indexed for efficient queries.
