-- Clean up old webhook idempotency records (older than 7 days)
-- Run this in Supabase SQL Editor after enabling pg_cron extension
SELECT cron.schedule(
  'cleanup-webhook-events',
  '0 3 * * *',
  $$DELETE FROM processed_webhook_events WHERE processed_at < now() - interval '7 days'$$
);
