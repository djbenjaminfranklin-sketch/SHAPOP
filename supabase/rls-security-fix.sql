-- =============================================
-- CORRECTIF SECURITE RLS — A executer dans Supabase SQL Editor
-- Dashboard > SQL Editor > New Query > Coller & Executer
-- =============================================

-- =============================================
-- 1. PROFILES : Empecher les utilisateurs de modifier
--    les colonnes admin (is_suspended, is_banned, etc.)
-- =============================================
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_suspended IS NOT DISTINCT FROM (SELECT p.is_suspended FROM public.profiles p WHERE p.id = auth.uid())
  AND is_banned IS NOT DISTINCT FROM (SELECT p.is_banned FROM public.profiles p WHERE p.id = auth.uid())
  AND suspension_reason IS NOT DISTINCT FROM (SELECT p.suspension_reason FROM public.profiles p WHERE p.id = auth.uid())
  AND suspended_at IS NOT DISTINCT FROM (SELECT p.suspended_at FROM public.profiles p WHERE p.id = auth.uid())
  AND banned_at IS NOT DISTINCT FROM (SELECT p.banned_at FROM public.profiles p WHERE p.id = auth.uid())
);

-- =============================================
-- 2. SELLERS : Empecher les vendeurs de modifier
--    les colonnes de controle admin (payments_blocked, etc.)
-- =============================================
DROP POLICY IF EXISTS "Sellers update own" ON public.sellers;

CREATE POLICY "Sellers update own" ON public.sellers
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND payments_blocked IS NOT DISTINCT FROM (SELECT s.payments_blocked FROM public.sellers s WHERE s.id = auth.uid())
  AND reserve_percent IS NOT DISTINCT FROM (SELECT s.reserve_percent FROM public.sellers s WHERE s.id = auth.uid())
  AND documents_requested IS NOT DISTINCT FROM (SELECT s.documents_requested FROM public.sellers s WHERE s.id = auth.uid())
  AND sale_limit IS NOT DISTINCT FROM (SELECT s.sale_limit FROM public.sellers s WHERE s.id = auth.uid())
);

-- =============================================
-- 3. ADMIN TABLES : Policies explicites de refus
--    (RLS active mais aucune policy = deny par defaut,
--     on ajoute un deny explicite par securite)
-- =============================================
DROP POLICY IF EXISTS "admin_notes_deny_all" ON public.admin_notes;
CREATE POLICY "admin_notes_deny_all" ON public.admin_notes FOR ALL USING (false);

DROP POLICY IF EXISTS "admin_audit_log_deny_all" ON public.admin_audit_log;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_audit_log_deny_all" ON public.admin_audit_log FOR ALL USING (false);

-- =============================================
-- 4. ORDERS : Interdire la suppression par les utilisateurs
-- =============================================
DROP POLICY IF EXISTS "Orders no delete" ON public.orders;
CREATE POLICY "Orders no delete" ON public.orders FOR DELETE USING (false);
