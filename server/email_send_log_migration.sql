-- Apply once to an existing Supabase database before deploying the new worker.
-- Keep the earliest log row when a campaign has duplicates.
DELETE FROM email_send_log WHERE id IN (
  SELECT id FROM (
    SELECT id, row_number() OVER (PARTITION BY user_id, campaign_id ORDER BY created_at, id) AS rn
    FROM email_send_log WHERE campaign_id IS NOT NULL
  ) duplicates WHERE rn > 1
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_send_log_campaign_unique
  ON email_send_log(user_id, campaign_id);
