-- Apply once to the configured Supabase project before deploying the new API.
-- Service-role RPC keeps a public submission and its candidate link atomic.
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS normalized_email TEXT;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL;

UPDATE candidates SET normalized_email = lower(btrim(email))
WHERE email IS NOT NULL AND btrim(email) <> '' AND normalized_email IS NULL;

-- Historical duplicate candidates are intentionally left for manual review.
-- A partial unique index is created only after duplicate normalized keys are cleared.
CREATE INDEX IF NOT EXISTS idx_candidates_owner_email ON candidates(user_id, normalized_email)
WHERE normalized_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_form_submissions_candidate ON form_submissions(candidate_id);

CREATE OR REPLACE FUNCTION public.record_form_submission(
  p_submission_id TEXT, p_draft_id TEXT, p_owner_id UUID, p_title TEXT,
  p_data JSONB, p_is_application BOOLEAN, p_name TEXT, p_email TEXT
) RETURNS TABLE(saved_submission_id TEXT, saved_candidate_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_candidate UUID;
  v_email TEXT := nullif(lower(btrim(p_email)), '');
BEGIN
  IF p_is_application THEN
    IF v_email IS NOT NULL THEN
      -- Serialize same-owner/email submissions, including the first insert.
      PERFORM pg_advisory_xact_lock(hashtextextended(p_owner_id::text || ':' || v_email, 0));
      IF (SELECT count(*) FROM candidates WHERE user_id = p_owner_id AND normalized_email = v_email) > 1 THEN
        -- Existing ambiguous identities must be reviewed, never merged by guess.
        v_email := NULL;
      ELSE
        SELECT id INTO v_candidate FROM candidates
        WHERE user_id = p_owner_id AND normalized_email = v_email
        ORDER BY created_at, id LIMIT 1;
      END IF;
    END IF;
    IF v_candidate IS NULL THEN
      INSERT INTO candidates(user_id, name, email, normalized_email, status)
      VALUES (p_owner_id, nullif(btrim(p_name), ''), v_email, v_email,
        CASE WHEN v_email IS NULL THEN 'needs_contact_review' ELSE 'new' END)
      RETURNING id INTO v_candidate;
    END IF;
  END IF;
  INSERT INTO form_submissions(submission_id, draft_id, user_id, title, submitted_data, candidate_id)
  VALUES (p_submission_id, p_draft_id, p_owner_id, p_title, p_data, v_candidate);
  RETURN QUERY SELECT p_submission_id, v_candidate;
END;
$$;
REVOKE ALL ON FUNCTION public.record_form_submission(TEXT,TEXT,UUID,TEXT,JSONB,BOOLEAN,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_form_submission(TEXT,TEXT,UUID,TEXT,JSONB,BOOLEAN,TEXT,TEXT) TO service_role;

-- Read-only report: only unambiguous historical student submissions are eligible.
-- Run the reviewed backfill below after inspecting this report in the target database.
CREATE OR REPLACE VIEW public.candidate_backfill_review AS
SELECT s.submission_id, s.user_id, s.draft_id,
  lower(btrim(coalesce(s.submitted_data->>'collegeEmail', s.submitted_data->>'email'))) AS normalized_email,
  s.submitted_data->>'fullName' AS name
FROM form_submissions s JOIN form_drafts d ON d.draft_id = s.draft_id
WHERE d.template_type = 'student' AND s.candidate_id IS NULL;
REVOKE ALL ON public.candidate_backfill_review FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.candidate_backfill_review TO service_role;

-- The backfill is deliberately a separate, idempotent operation. It must not
-- silently merge historical candidate rows with conflicting identities.
CREATE OR REPLACE FUNCTION public.backfill_application_candidates()
RETURNS TABLE(linked_count INT, review_count INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; v_candidate UUID; v_linked INT := 0; v_review INT := 0; v_count INT;
BEGIN
  FOR r IN SELECT * FROM candidate_backfill_review ORDER BY user_id, normalized_email, submission_id LOOP
    IF r.normalized_email IS NULL OR r.normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
      v_review := v_review + 1; CONTINUE;
    END IF;
    SELECT count(*) INTO v_count FROM candidates
    WHERE user_id = r.user_id AND normalized_email = r.normalized_email;
    IF v_count > 1 THEN v_review := v_review + 1; CONTINUE; END IF;
    SELECT id INTO v_candidate FROM candidates
    WHERE user_id = r.user_id AND normalized_email = r.normalized_email LIMIT 1;
    IF v_candidate IS NULL THEN
      INSERT INTO candidates(user_id, name, email, normalized_email, status)
      VALUES (r.user_id, r.name, r.normalized_email, r.normalized_email, 'new')
      RETURNING id INTO v_candidate;
    END IF;
    UPDATE form_submissions SET candidate_id = v_candidate
    WHERE submission_id = r.submission_id AND candidate_id IS NULL;
    v_linked := v_linked + 1;
  END LOOP;
  RETURN QUERY SELECT v_linked, v_review;
END;
$$;
REVOKE ALL ON FUNCTION public.backfill_application_candidates() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backfill_application_candidates() TO service_role;
