-- ============================================
-- LedgerAI Supabase Schema Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  departments TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form Drafts table
CREATE TABLE IF NOT EXISTS form_drafts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  config JSONB NOT NULL,
  template_type TEXT DEFAULT 'unknown',
  status TEXT DEFAULT 'draft',
  expires_at TIMESTAMPTZ,
  goes_live_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Form Submissions table
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id TEXT UNIQUE NOT NULL,
  draft_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  submitted_data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_minutes INT,
  attendees JSONB DEFAULT '[]',
  ai_project TEXT,
  ai_confidence FLOAT,
  requires_human_review BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  spreadsheet_id TEXT,
  row_number INT,
  name TEXT,
  email TEXT,
  github TEXT,
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Send Log table
CREATE TABLE IF NOT EXISTS email_send_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  campaign_id TEXT,
  draft_id TEXT,
  draft_title TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  recipient_count INT DEFAULT 0,
  sent_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- OTP Challenges table — short-lived verification codes gating destructive
-- actions (Delete Data / Delete Account). One row per (user_id, action);
-- upserted on resend, deleted on successful verification or expiry check.
-- No TTL/cron cleanup needed: the unique constraint means this table can
-- never grow past 2 rows per user regardless of how many codes they request.
CREATE TABLE IF NOT EXISTS otp_challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('delete_data', 'delete_account')),
  otp_hash TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (user_id, action)
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_send_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_challenges ENABLE ROW LEVEL SECURITY;

-- Profiles: users can manage their own profile
CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Form Drafts: users can manage their own drafts
CREATE POLICY "Users manage own drafts" ON form_drafts
  FOR ALL USING (auth.uid() = user_id);

-- Form Submissions: public can submit (no auth), users can view their own
CREATE POLICY "Users view own submissions" ON form_submissions
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM form_drafts WHERE form_drafts.draft_id = form_submissions.draft_id AND form_drafts.user_id = auth.uid())
  );

-- Meetings: users manage their own
CREATE POLICY "Users manage own meetings" ON meetings
  FOR ALL USING (auth.uid() = user_id);

-- Alerts: users manage their own
CREATE POLICY "Users manage own alerts" ON alerts
  FOR ALL USING (auth.uid() = user_id);

-- Candidates: users manage their own
CREATE POLICY "Users manage own candidates" ON candidates
  FOR ALL USING (auth.uid() = user_id);

-- Email Send Log: users view their own send history
CREATE POLICY "Users view own email send log" ON email_send_log
  FOR ALL USING (auth.uid() = user_id);

-- OTP Challenges: users manage their own (backend uses the service role
-- key and bypasses this anyway — kept for defense-in-depth consistency
-- with every other per-user table)
CREATE POLICY "Users manage own otp challenges" ON otp_challenges
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_form_drafts_user_id ON form_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_form_drafts_draft_id ON form_drafts(draft_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_draft_id ON form_submissions(draft_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_email_send_log_user_id ON email_send_log(user_id);
CREATE INDEX IF NOT EXISTS idx_otp_challenges_user_action ON otp_challenges(user_id, action);
CREATE INDEX IF NOT EXISTS idx_email_send_log_sent_at ON email_send_log(sent_at DESC);

-- ============================================
-- Auto-create profile on signup
-- ============================================

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
