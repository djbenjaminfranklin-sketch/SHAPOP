-- 24/11/2026 : préparation Rapyd (Israël) à côté de Stripe (autres pays)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rapyd_customer_id text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS rapyd_ewallet_id text;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_provider text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS rapyd_payment_id text,
  ADD COLUMN IF NOT EXISTS rapyd_escrow_id text;
-- portefeuille Rapyd du vendeur israélien + vérification d'identité
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS rapyd_contact_id text,
  ADD COLUMN IF NOT EXISTS rapyd_kyc_status text;
