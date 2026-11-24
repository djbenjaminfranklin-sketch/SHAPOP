-- 24/11/2026 : commande traitée / colis préparé
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS prepared_at timestamptz;
