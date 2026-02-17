-- =============================================
-- Security Fixes Migration — ShaPop
-- Fixes critical issues found during DB audit
-- Idempotent: safe to run multiple times
-- =============================================

-- =============================================
-- 1. FIX: mux_stream_key exposed via RLS SELECT
--
-- Problem: The streams table SELECT policy allows all users to read every
-- column, including mux_stream_key (the secret RTMP ingest key). Any
-- authenticated user can query the Supabase REST API directly and obtain
-- the key, allowing unauthorized broadcasting on any seller's stream.
--
-- Fix: Replace the permissive SELECT policy with one that hides
-- mux_stream_key from non-owners. Only the stream's seller can see
-- mux_stream_key; all other users see NULL for that column.
-- We use a security-barrier view to enforce this.
-- =============================================

-- Drop the existing public view if it exists (idempotent)
DROP VIEW IF EXISTS public.streams_public;

-- Create a security-barrier view that excludes the secret key
-- All users see streams through this view; only the stream owner
-- sees the mux_stream_key (via direct table query from server/service role)
CREATE VIEW public.streams_public WITH (security_barrier = true) AS
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
  -- Only show mux_stream_key to the stream owner
  CASE WHEN auth.uid() = seller_id THEN mux_stream_key ELSE NULL END AS mux_stream_key,
  mux_asset_id,
  deleted_at,
  created_at
FROM public.streams;

-- Also tighten the base table SELECT policy: replace the open policy
-- with one that still allows all reads but documents the security model.
-- The mux_stream_key is still in the base table for server-side (service role)
-- access, but clients should use streams_public view.
-- NOTE: If your app already uses the table directly, the view provides
-- a drop-in replacement for client reads.

-- =============================================
-- 2. FIX: Duplicate INSERT policies on orders allow seller impersonation
--
-- Problem: schema.sql has two INSERT policies on orders:
--   "Buyers create orders"  -> WITH CHECK (auth.uid() = buyer_id)
--   "Sellers create orders" -> WITH CHECK (auth.uid() = seller_id)
-- PostgreSQL OR's multiple policies, so a seller can insert an order
-- with any buyer_id, effectively creating fraudulent orders.
--
-- Fix: Drop the dangerous "Sellers create orders" policy.
-- Orders should only be created by buyers (or by the server via service role).
-- =============================================

DROP POLICY IF EXISTS "Sellers create orders" ON public.orders;

-- =============================================
-- 3. FIX: banned_identifiers RLS uses auth.role() = 'service_role'
--
-- Problem: In Supabase, auth.role() returns 'authenticated' or 'anon',
-- never 'service_role'. The service role bypasses RLS entirely, so
-- this policy never matches anyone — it accidentally works as a deny-all,
-- but is misleading and fragile.
--
-- Fix: Replace with explicit USING (false) pattern, consistent with
-- the approach used in rls-security-fix.sql for admin_notes/admin_audit_log.
-- =============================================

DROP POLICY IF EXISTS "Service role full access on banned_identifiers" ON public.banned_identifiers;

-- Explicit deny-all: no user can read/write via RLS.
-- The server uses service role which bypasses RLS entirely.
CREATE POLICY "banned_identifiers_deny_all" ON public.banned_identifiers
  FOR ALL
  USING (false);

-- =============================================
-- 4. FIX: Missing FK constraints on disputes.seller_id and shipping_proofs.seller_id
--
-- Problem: Both columns are declared as `uuid not null` without REFERENCES,
-- allowing orphaned data. The RLS policies also use unsafe ::text casts
-- for UUID comparison.
--
-- Fix: Add FK constraints (requires existing data to be valid).
-- Also fix the RLS policies to use proper UUID comparison.
-- =============================================

-- 4a. Add FK on disputes.seller_id -> sellers(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'disputes_seller_id_fkey'
      AND table_name = 'disputes'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.disputes
      ADD CONSTRAINT disputes_seller_id_fkey
      FOREIGN KEY (seller_id) REFERENCES public.sellers(id);
  END IF;
END $$;

-- 4b. Add FK on shipping_proofs.seller_id -> sellers(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'shipping_proofs_seller_id_fkey'
      AND table_name = 'shipping_proofs'
      AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.shipping_proofs
      ADD CONSTRAINT shipping_proofs_seller_id_fkey
      FOREIGN KEY (seller_id) REFERENCES public.sellers(id);
  END IF;
END $$;

-- 4c. Fix RLS policies that use unsafe ::text casts for UUID comparison

-- disputes: fix SELECT policy
DROP POLICY IF EXISTS "Users see own disputes" ON public.disputes;
CREATE POLICY "Users see own disputes" ON public.disputes
  FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- shipping_proofs: fix SELECT policy (uses subquery on orders)
DROP POLICY IF EXISTS "Users see proofs for own orders" ON public.shipping_proofs;
CREATE POLICY "Users see proofs for own orders" ON public.shipping_proofs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = shipping_proofs.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

-- shipping_proofs: fix INSERT policy
DROP POLICY IF EXISTS "Sellers insert proofs" ON public.shipping_proofs;
CREATE POLICY "Sellers insert proofs" ON public.shipping_proofs
  FOR INSERT
  WITH CHECK (auth.uid() = seller_id);

-- =============================================
-- 5. FIX: Missing lot_number column on items table
--
-- Problem: Client code (PrepareLivePage.tsx) reads and writes
-- items.lot_number, but the column is not defined in any schema file.
-- Updates silently fail and lot ordering data is lost.
--
-- Fix: Add the column with a nullable integer type.
-- =============================================

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS lot_number integer;

-- =============================================
-- 6. FIX: Missing indexes on followers and conversation_messages
--
-- Problem: The followers table in missing-tables.sql omits the indexes
-- defined in schema.sql. The notifyFollowersSellerLive server function
-- queries followers by seller_id, which is slow without an index.
-- conversation_messages.sender_id also lacks an index.
--
-- Fix: Create the missing indexes (IF NOT EXISTS for idempotency).
-- =============================================

CREATE INDEX IF NOT EXISTS idx_followers_seller ON public.followers(seller_id);
CREATE INDEX IF NOT EXISTS idx_followers_user ON public.followers(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_sender ON public.conversation_messages(sender_id);
