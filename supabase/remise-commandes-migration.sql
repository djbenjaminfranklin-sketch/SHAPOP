-- =====================================================================
-- Remise des commandes (2026-11-23)
-- Retrait en main propre (code à 4 chiffres) ou envoi par la poste
-- (2 photos obligatoires). Plus aucun transporteur intégré.
--
-- UNIQUEMENT des ajouts compatibles : aucune colonne supprimée, l'historique
-- (carrier, relay_point_*, label_url, tracking_*...) est conservé.
-- =====================================================================

-- ---------- orders ----------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS fulfillment_method text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'ILS',
  ADD COLUMN IF NOT EXISTS handover_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS handover_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS handed_over_at timestamptz,
  ADD COLUMN IF NOT EXISTS proof_parcel_path text,
  ADD COLUMN IF NOT EXISTS proof_slip_path text,
  ADD COLUMN IF NOT EXISTS proof_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_released_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_fulfillment_method_check
    CHECK (fulfillment_method IS NULL OR fulfillment_method IN ('pickup', 'post', 'legacy_carrier'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Les commandes existantes (passées par l'ancien circuit transporteurs)
UPDATE public.orders SET fulfillment_method = 'legacy_carrier'
  WHERE fulfillment_method IS NULL AND (carrier IS NOT NULL OR shipping_address IS NOT NULL OR status <> 'pending_payment');
-- Les anciennes commandes ont été encaissées en euros (Stripe 'eur')
UPDATE public.orders SET currency = 'EUR' WHERE created_at < '2026-11-23';

-- Statuts : on ÉLARGIT la liste (aucun statut retiré).
-- 'cancelled', 'return_requested', 'return_rejected' étaient déjà écrits par le
-- serveur mais refusés par l'ancienne contrainte ; 'handed_over' = remis en main propre.
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status = ANY (ARRAY[
  'pending_payment', 'paid', 'shipped', 'handed_over', 'delivered', 'refunded', 'disputed',
  'cancelled', 'return_requested', 'return_rejected'
]));

-- ---------- sellers ----------
ALTER TABLE public.sellers
  ADD COLUMN IF NOT EXISTS allow_pickup boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pickup_area text,
  -- Prix d'envoi par la poste fixé par le vendeur (forfait, devise du vendeur).
  -- Par article : items.seller_shipping_override (existe déjà).
  ADD COLUMN IF NOT EXISTS post_price numeric CHECK (post_price IS NULL OR post_price >= 0);

-- « Délai de remise » : on garde la colonne existante shipping_delay_days,
-- nouvelle valeur par défaut 4 jours.
ALTER TABLE public.sellers ALTER COLUMN shipping_delay_days SET DEFAULT 4;

-- ---------- Coordonnées privées (WhatsApp) ----------
-- profiles et sellers sont lisibles par tous : le numéro ne doit PAS y être.
-- Table fermée (RLS sans aucune règle) : seul le serveur (service_role) y accède,
-- et il ne la montre qu'à l'autre partie d'une commande payée.
CREATE TABLE IF NOT EXISTS public.user_contacts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  whatsapp text CHECK (whatsapp IS NULL OR whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_contacts FROM anon, authenticated;

-- ---------- Code de remise en main propre ----------
-- La règle RLS « Users see own orders » laisse le VENDEUR lire toutes les
-- colonnes de orders : le code ne peut donc pas y être stocké.
CREATE TABLE IF NOT EXISTS public.order_handover_codes (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
  code text NOT NULL CHECK (code ~ '^[0-9]{4}$'),
  attempts integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_handover_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.order_handover_codes FROM anon, authenticated;

-- ---------- Espace privé pour les preuves d'envoi postal ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('order-proofs', 'order-proofs', false, 10485760,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
ON CONFLICT (id) DO UPDATE SET public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Aucune règle n'ouvre ce bucket : envoi et lecture passent par le serveur
-- (service_role), la lecture par URL signée courte réservée à l'acheteur, au
-- vendeur et à l'admin.
-- Les 4 anciennes règles « Give anon users access to JPG images in folder
-- 1oj01fe_* » valent `true` pour TOUS les buckets : on en exclut order-proofs.
ALTER POLICY "Give anon users access to JPG images in folder 1oj01fe_0" ON storage.objects
  USING (bucket_id <> 'order-proofs');
ALTER POLICY "Give anon users access to JPG images in folder 1oj01fe_1" ON storage.objects
  WITH CHECK (bucket_id <> 'order-proofs');
ALTER POLICY "Give anon users access to JPG images in folder 1oj01fe_2" ON storage.objects
  USING (bucket_id <> 'order-proofs');
ALTER POLICY "Give anon users access to JPG images in folder 1oj01fe_3" ON storage.objects
  USING (bucket_id <> 'order-proofs');
