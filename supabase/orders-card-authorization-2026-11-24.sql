-- 24/11/2026 : autorisation de la carte du gagnant dès la fin de l'enchère (argent réservé, prélevé au choix de la remise)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS auth_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS auth_status text,
  ADD COLUMN IF NOT EXISTS auth_amount numeric,
  ADD COLUMN IF NOT EXISTS auth_error_code text,
  ADD COLUMN IF NOT EXISTS auth_updated_at timestamptz;
