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
-- Airwallex pour Israël (à la place de Rapyd)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS airwallex_customer_id text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS airwallex_beneficiary_id text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS payout_bank_last4 text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS airwallex_intent_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payout_transfer_id text;
