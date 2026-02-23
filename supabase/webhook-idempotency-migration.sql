-- =============================================
-- Webhook Idempotency: persist processed event IDs
-- =============================================
-- This table ensures webhooks are not processed twice,
-- even after a server restart (where in-memory Sets are lost).

CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paypal', 'livekit')),
  processed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (event_id, provider)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_lookup
  ON processed_webhook_events (event_id, provider);

-- Auto-cleanup: delete events older than 7 days to prevent table bloat.
-- Run this as a Supabase cron job (pg_cron) or call manually.
-- SELECT cron.schedule('cleanup-webhook-events', '0 3 * * *',
--   $$DELETE FROM processed_webhook_events WHERE processed_at < now() - interval '7 days'$$
-- );

-- RLS: only service_role can access this table (server-side only)
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service_role key can read/write
-- (which is what the server uses)
