-- =============================================
-- RLS Linter Fixes Migration
-- Fixes all Supabase linter alerts (errors, warnings, infos)
-- Applied 2026-03-04
-- Idempotent: safe to run multiple times
-- =============================================

-- =============================================
-- 1. paypal_payouts — enable RLS + deny-all
--    Sensitive table, server-only access via service_role
-- =============================================

ALTER TABLE public.paypal_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "paypal_payouts_deny_all" ON public.paypal_payouts;
CREATE POLICY "paypal_payouts_deny_all" ON public.paypal_payouts
  FOR ALL
  USING (false);

-- =============================================
-- 2. item_favorites — enable RLS + user-scoped policies
-- =============================================

ALTER TABLE public.item_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own item_favorites" ON public.item_favorites;
CREATE POLICY "Users can view their own item_favorites" ON public.item_favorites
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own item_favorites" ON public.item_favorites;
CREATE POLICY "Users can insert their own item_favorites" ON public.item_favorites
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own item_favorites" ON public.item_favorites;
CREATE POLICY "Users can delete their own item_favorites" ON public.item_favorites
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- 3. max_bids — re-enable RLS + policies
--    (defined in buyer-features-migration.sql but never applied)
-- =============================================

ALTER TABLE public.max_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own max_bids" ON public.max_bids;
CREATE POLICY "Users can view their own max_bids" ON public.max_bids
  FOR SELECT
  USING (auth.uid() = bidder_id);

DROP POLICY IF EXISTS "Users can insert their own max_bids" ON public.max_bids;
CREATE POLICY "Users can insert their own max_bids" ON public.max_bids
  FOR INSERT
  WITH CHECK (auth.uid() = bidder_id);

DROP POLICY IF EXISTS "Users can update their own max_bids" ON public.max_bids;
CREATE POLICY "Users can update their own max_bids" ON public.max_bids
  FOR UPDATE
  USING (auth.uid() = bidder_id);

-- =============================================
-- 4. pre_bids — re-enable RLS + policies
-- =============================================

ALTER TABLE public.pre_bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own pre_bids" ON public.pre_bids;
CREATE POLICY "Users can view their own pre_bids" ON public.pre_bids
  FOR SELECT
  USING (auth.uid() = bidder_id);

DROP POLICY IF EXISTS "Users can insert their own pre_bids" ON public.pre_bids;
CREATE POLICY "Users can insert their own pre_bids" ON public.pre_bids
  FOR INSERT
  WITH CHECK (auth.uid() = bidder_id);

DROP POLICY IF EXISTS "Users can update their own pre_bids" ON public.pre_bids;
CREATE POLICY "Users can update their own pre_bids" ON public.pre_bids
  FOR UPDATE
  USING (auth.uid() = bidder_id);

-- =============================================
-- 5. offers — re-enable RLS + policies
--    Fix: removed ::text cast on seller_id (it's already uuid)
-- =============================================

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view offers they are part of" ON public.offers;
CREATE POLICY "Users can view offers they are part of" ON public.offers
  FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers can insert offers" ON public.offers;
CREATE POLICY "Buyers can insert offers" ON public.offers
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Participants can update offers" ON public.offers;
CREATE POLICY "Participants can update offers" ON public.offers
  FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- =============================================
-- 6. loyalty_points — re-enable RLS + policies
-- =============================================

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own loyalty_points" ON public.loyalty_points;
CREATE POLICY "Users can view their own loyalty_points" ON public.loyalty_points
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own loyalty_points" ON public.loyalty_points;
CREATE POLICY "Users can insert their own loyalty_points" ON public.loyalty_points
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own loyalty_points" ON public.loyalty_points;
CREATE POLICY "Users can update their own loyalty_points" ON public.loyalty_points
  FOR UPDATE
  USING (auth.uid() = user_id);

-- =============================================
-- 7. loyalty_transactions — re-enable RLS + policies
-- =============================================

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "Users can view their own loyalty_transactions" ON public.loyalty_transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- 8. streams_public view — switch from SECURITY DEFINER to INVOKER
--    Recreate the view with security_invoker = true
-- =============================================

DROP VIEW IF EXISTS public.streams_public;
CREATE VIEW public.streams_public WITH (security_barrier = true, security_invoker = true) AS
SELECT
  id,
  seller_id,
  title,
  description,
  category,
  tags,
  status,
  thumbnail_url,
  viewer_count,
  peak_viewers,
  engagement_score,
  avg_watch_time_seconds,
  total_reactions,
  scheduled_at,
  started_at,
  ended_at,
  city,
  community_id,
  mux_stream_id,
  mux_playback_id,
  CASE WHEN auth.uid() = seller_id THEN mux_stream_key ELSE NULL END AS mux_stream_key,
  mux_asset_id,
  deleted_at,
  created_at
FROM public.streams;

-- =============================================
-- 9. Fix function search_path (WARN: function_search_path_mutable)
-- =============================================

DO $$
DECLARE
  func record;
BEGIN
  FOR func IN
    SELECT p.oid::regprocedure AS func_signature
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('decrement_community_members', 'increment_viewer_count', 'decrement_viewer_count')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public', func.func_signature);
  END LOOP;
END $$;

-- =============================================
-- 10. Drop overly permissive policies (WARN: rls_policy_always_true)
--     service_role bypasses RLS, so these USING(true) policies are unnecessary
-- =============================================

DROP POLICY IF EXISTS "Service insert" ON public.analytics_events;
DROP POLICY IF EXISTS "Service delete" ON public.notifications;
DROP POLICY IF EXISTS "Service insert" ON public.notifications;
DROP POLICY IF EXISTS "System can insert" ON public.notifications;
DROP POLICY IF EXISTS "Admin manage promotions" ON public.promotions;
DROP POLICY IF EXISTS "Buyers can insert reviews" ON public.reviews;

-- =============================================
-- 11. processed_webhook_events — deny-all (INFO: rls_enabled_no_policy)
-- =============================================

DROP POLICY IF EXISTS "processed_webhook_events_deny_all" ON public.processed_webhook_events;
CREATE POLICY "processed_webhook_events_deny_all" ON public.processed_webhook_events
  FOR ALL
  USING (false);

-- =============================================
-- 12. Leaked password protection — enabled via dashboard
--     Authentication > Attack Protection > "Prevent use of leaked passwords"
-- =============================================
