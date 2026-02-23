-- ================================================================
-- ShaPop — TOUTES LES MIGRATIONS
-- Copie-colle ce fichier dans Supabase > SQL Editor > New Query
-- Chaque section utilise IF NOT EXISTS / IF NOT EXISTS pour être
-- idempotente : tu peux relancer sans risque.
-- ================================================================


-- ================================================================
-- 1. TABLES MANQUANTES (addresses, device_tokens, followers, admin)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.addresses (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  street text NOT NULL,
  city text NOT NULL,
  zip text NOT NULL,
  phone text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users insert own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users update own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users delete own addresses" ON public.addresses;
CREATE POLICY "Users see own addresses" ON public.addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own addresses" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own addresses" ON public.addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own addresses" ON public.addresses FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON public.addresses(user_id);

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  token text NOT NULL,
  platform text CHECK (platform IN ('ios', 'android', 'web')) NOT NULL DEFAULT 'ios',
  notify_live boolean DEFAULT true,
  notify_orders boolean DEFAULT true,
  notify_deals boolean DEFAULT false,
  notify_messages boolean DEFAULT true,
  notify_reminders boolean DEFAULT true,
  notify_community boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users see own tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users insert own tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users update own tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users delete own tokens" ON public.device_tokens;
CREATE POLICY "Users see own tokens" ON public.device_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tokens" ON public.device_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tokens" ON public.device_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tokens" ON public.device_tokens FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.followers (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid REFERENCES public.sellers(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, seller_id)
);

ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can see followers" ON public.followers;
DROP POLICY IF EXISTS "Users follow sellers" ON public.followers;
DROP POLICY IF EXISTS "Users unfollow sellers" ON public.followers;
CREATE POLICY "Anyone can see followers" ON public.followers FOR SELECT USING (true);
CREATE POLICY "Users follow sellers" ON public.followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unfollow sellers" ON public.followers FOR DELETE USING (auth.uid() = user_id);

-- Colonnes admin sur profiles et sellers
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_proof_url text;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS payments_blocked boolean DEFAULT false;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS reserve_percent integer DEFAULT 0;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS documents_requested boolean DEFAULT false;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS sale_limit numeric(10,2);

CREATE TABLE IF NOT EXISTS public.admin_notes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  target_user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  admin_id uuid NOT NULL,
  admin_email text NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_admin_notes_target ON public.admin_notes(target_user_id);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  admin_id uuid NOT NULL,
  admin_email text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id text NOT NULL,
  details jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.admin_audit_log(target_type, target_id);


-- ================================================================
-- 2. SECURITE RLS
-- ================================================================

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

DROP POLICY IF EXISTS "admin_notes_deny_all" ON public.admin_notes;
CREATE POLICY "admin_notes_deny_all" ON public.admin_notes FOR ALL USING (false);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_audit_log_deny_all" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_deny_all" ON public.admin_audit_log FOR ALL USING (false);

DROP POLICY IF EXISTS "Orders no delete" ON public.orders;
CREATE POLICY "Orders no delete" ON public.orders FOR DELETE USING (false);


-- ================================================================
-- 3. ANTI-FRAUDE (disputes, scoring, trust, preuves, messagerie)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) NOT NULL UNIQUE,
  buyer_id uuid REFERENCES public.profiles(id) NOT NULL,
  seller_id uuid NOT NULL,
  reason text CHECK (reason IN ('not_received','wrong_item','damaged','not_as_described','counterfeit')) NOT NULL,
  description text NOT NULL,
  evidence_urls text[] DEFAULT '{}',
  status text CHECK (status IN ('open','under_review','resolved_buyer','resolved_seller','escalated')) DEFAULT 'open',
  resolution_note text,
  auto_refund boolean DEFAULT false,
  amount numeric(10,2) NOT NULL,
  opened_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_disputes_order ON public.disputes(order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_buyer ON public.disputes(buyer_id);
CREATE INDEX IF NOT EXISTS idx_disputes_seller ON public.disputes(seller_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);

CREATE TABLE IF NOT EXISTS public.buyer_scores (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
  score integer DEFAULT 100,
  total_orders integer DEFAULT 0,
  total_disputes integer DEFAULT 0,
  disputes_won integer DEFAULT 0,
  disputes_lost integer DEFAULT 0,
  total_refunds integer DEFAULT 0,
  refund_amount numeric(10,2) DEFAULT 0,
  last_dispute_at timestamptz,
  risk_level text CHECK (risk_level IN ('low','medium','high','blocked')) DEFAULT 'low',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.buyer_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own score" ON public.buyer_scores FOR SELECT USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_scores_risk ON public.buyer_scores(risk_level);

CREATE TABLE IF NOT EXISTS public.seller_trust (
  seller_id uuid REFERENCES public.sellers(id) ON DELETE CASCADE PRIMARY KEY,
  trust_level text CHECK (trust_level IN ('new','standard','trusted','premium')) DEFAULT 'new',
  total_completed_orders integer DEFAULT 0,
  total_disputes_against integer DEFAULT 0,
  disputes_lost integer DEFAULT 0,
  avg_ship_time_hours numeric(6,1) DEFAULT 0,
  positive_delivery_rate numeric(5,4) DEFAULT 1.0,
  holdback_percent integer DEFAULT 20,
  payout_delay_days integer DEFAULT 7,
  proof_level text CHECK (proof_level IN ('basic','standard','enhanced')) DEFAULT 'enhanced',
  manually_set boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.seller_trust ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sellers see own trust" ON public.seller_trust;
CREATE POLICY "Sellers see own trust" ON public.seller_trust FOR SELECT USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "Trust viewable by all" ON public.seller_trust;
CREATE POLICY "Trust viewable by all" ON public.seller_trust FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_seller_trust_level ON public.seller_trust(trust_level);

CREATE TABLE IF NOT EXISTS public.shipping_proofs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) NOT NULL,
  seller_id uuid NOT NULL,
  type text CHECK (type IN ('photo_package','photo_content','video_packing')) NOT NULL,
  url text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE public.shipping_proofs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_shipping_proofs_order ON public.shipping_proofs(order_id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS claim_deadline timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payout_scheduled_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS holdback_percent integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS is_flagged boolean DEFAULT false;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS flag_reason text;

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  type text CHECK (type IN ('order','support','dispute')) NOT NULL DEFAULT 'order',
  order_id uuid REFERENCES public.orders(id),
  participant_1 uuid REFERENCES public.profiles(id) NOT NULL,
  participant_2 uuid REFERENCES public.profiles(id) NOT NULL,
  status text CHECK (status IN ('active','closed','archived')) DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own conversations" ON public.conversations FOR SELECT USING (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE POLICY "Users create conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON public.conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON public.conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_order ON public.conversations(order_id);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES public.profiles(id) NOT NULL,
  message text NOT NULL,
  is_system boolean DEFAULT false,
  is_flagged boolean DEFAULT false,
  flag_reason text,
  attachment_urls text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see messages in own conversations" ON public.conversation_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_messages.conversation_id
    AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
  )
);
CREATE POLICY "Users send messages in own conversations" ON public.conversation_messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = conversation_messages.conversation_id
    AND (conversations.participant_1 = auth.uid() OR conversations.participant_2 = auth.uid())
  )
);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conv ON public.conversation_messages(conversation_id, created_at);

-- Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ================================================================
-- 4. BAN PAR EMAIL + TELEPHONE
-- ================================================================

CREATE TABLE IF NOT EXISTS banned_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('email', 'phone')),
  value text NOT NULL,
  banned_user_id uuid NOT NULL,
  banned_by uuid,
  reason text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (type, value)
);
CREATE INDEX IF NOT EXISTS idx_banned_identifiers_type_value ON banned_identifiers (type, value);
ALTER TABLE banned_identifiers ENABLE ROW LEVEL SECURITY;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles (phone_number);


-- ================================================================
-- 5. COLONNES SUPPLEMENTAIRES
-- ================================================================

ALTER TABLE sellers ADD COLUMN IF NOT EXISTS return_policy text
  DEFAULT 'no_return'
  CHECK (return_policy IN ('no_return', 'exchange_only', 'return_7', 'return_14', 'return_30'));

ALTER TABLE items ADD COLUMN IF NOT EXISTS min_price numeric DEFAULT NULL;

ALTER TABLE streams ADD COLUMN IF NOT EXISTS livekit_room_name TEXT;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS paypal_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payout_method text DEFAULT 'stripe';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_payment_intent_id text;

ALTER TABLE public.items ADD COLUMN IF NOT EXISTS lot_number integer;


-- ================================================================
-- 6. STREAMS & ITEMS — DELETE POLICIES
-- ================================================================

DROP POLICY IF EXISTS "Sellers delete own streams" ON public.streams;
CREATE POLICY "Sellers delete own streams" ON public.streams FOR DELETE USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "Sellers delete own items" ON public.items;
CREATE POLICY "Sellers delete own items" ON public.items FOR DELETE USING (auth.uid() = seller_id);


-- ================================================================
-- 7. PAYPAL PAYOUTS
-- ================================================================

CREATE TABLE IF NOT EXISTS public.paypal_payouts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) NOT NULL,
  seller_id uuid REFERENCES public.sellers(id) NOT NULL,
  paypal_email text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'EUR',
  paypal_batch_id text,
  paypal_item_id text,
  status text DEFAULT 'pending',
  error_message text,
  attempts integer DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_paypal_payouts_order_id ON public.paypal_payouts(order_id);
CREATE INDEX IF NOT EXISTS idx_paypal_payouts_status ON public.paypal_payouts(status);
CREATE INDEX IF NOT EXISTS idx_paypal_payouts_seller_id ON public.paypal_payouts(seller_id);


-- ================================================================
-- 8. FAVORIS (streams + items)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.stream_favorites (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stream_id uuid REFERENCES public.streams(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, stream_id)
);
CREATE INDEX IF NOT EXISTS idx_stream_favorites_user ON public.stream_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_favorites_stream ON public.stream_favorites(stream_id);

CREATE TABLE IF NOT EXISTS public.item_favorites (
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  item_id uuid REFERENCES public.items(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_item_favorites_user ON public.item_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_item_favorites_item ON public.item_favorites(item_id);


-- ================================================================
-- 9. GIVEAWAYS (cadeaux surprise en live)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.giveaways (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  stream_id uuid REFERENCES public.streams(id) ON DELETE CASCADE NOT NULL,
  seller_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'Cadeau Surprise',
  prize_description text NOT NULL,
  status text CHECK (status IN ('active', 'drawn', 'cancelled')) DEFAULT 'active',
  winner_id uuid REFERENCES auth.users(id),
  winner_name text,
  entry_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  drawn_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.giveaway_entries (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  giveaway_id uuid REFERENCES public.giveaways(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  display_name text,
  entered_at timestamptz DEFAULT now(),
  UNIQUE(giveaway_id, user_id)
);

ALTER TABLE public.giveaways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.giveaway_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Giveaways are viewable by everyone" ON public.giveaways;
CREATE POLICY "Giveaways are viewable by everyone" ON public.giveaways FOR SELECT USING (true);
DROP POLICY IF EXISTS "Sellers can manage their giveaways" ON public.giveaways;
CREATE POLICY "Sellers can manage their giveaways" ON public.giveaways FOR ALL USING (auth.uid() = seller_id);
DROP POLICY IF EXISTS "Entries are viewable by everyone" ON public.giveaway_entries;
CREATE POLICY "Entries are viewable by everyone" ON public.giveaway_entries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can enter giveaways" ON public.giveaway_entries;
CREATE POLICY "Users can enter giveaways" ON public.giveaway_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.giveaways;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.giveaway_entries;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ================================================================
-- 10. BUYER FEATURES (max-bids, pre-bids, offres, fidelite, limites)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.max_bids (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  bidder_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  max_amount numeric(10,2) NOT NULL,
  current_bid numeric(10,2) DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_id, bidder_id)
);
ALTER TABLE public.max_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own max_bids" ON public.max_bids FOR SELECT USING (auth.uid() = bidder_id);
CREATE POLICY "Users can insert their own max_bids" ON public.max_bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);
CREATE POLICY "Users can update their own max_bids" ON public.max_bids FOR UPDATE USING (auth.uid() = bidder_id);

CREATE TABLE IF NOT EXISTS public.pre_bids (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  bidder_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','activated','expired','cancelled')),
  created_at timestamptz DEFAULT now(),
  activated_at timestamptz,
  UNIQUE(item_id, bidder_id)
);
ALTER TABLE public.pre_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own pre_bids" ON public.pre_bids FOR SELECT USING (auth.uid() = bidder_id);
CREATE POLICY "Users can insert their own pre_bids" ON public.pre_bids FOR INSERT WITH CHECK (auth.uid() = bidder_id);
CREATE POLICY "Users can update their own pre_bids" ON public.pre_bids FOR UPDATE USING (auth.uid() = bidder_id);

CREATE TABLE IF NOT EXISTS public.offers (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  item_id uuid REFERENCES items(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL,
  amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired','countered')),
  counter_amount numeric(10,2),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view offers they are part of" ON public.offers FOR SELECT USING (auth.uid() = buyer_id OR auth.uid()::text = seller_id::text);
CREATE POLICY "Buyers can insert offers" ON public.offers FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants can update offers" ON public.offers FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid()::text = seller_id::text);

CREATE TABLE IF NOT EXISTS public.spend_limits (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  weekly_limit numeric(10,2),
  monthly_limit numeric(10,2),
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.spend_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own spend_limits" ON public.spend_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own spend_limits" ON public.spend_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own spend_limits" ON public.spend_limits FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.loyalty_points (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  points integer DEFAULT 0,
  tier text DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  total_earned integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own loyalty_points" ON public.loyalty_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own loyalty_points" ON public.loyalty_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own loyalty_points" ON public.loyalty_points FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  points integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own loyalty_transactions" ON public.loyalty_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_max_bids_item_active ON public.max_bids(item_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pre_bids_item_pending ON public.pre_bids(item_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_offers_item ON public.offers(item_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON public.offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller ON public.offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user ON public.loyalty_transactions(user_id);


-- ================================================================
-- 11. CODES PROMO
-- ================================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  discount_percent numeric NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  discount_type text NOT NULL DEFAULT 'item' CHECK (discount_type IN ('item', 'commission', 'shipping')),
  max_uses integer DEFAULT NULL,
  current_uses integer DEFAULT 0,
  expires_at timestamptz DEFAULT NULL,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_code_uses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id uuid REFERENCES promo_codes(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  order_id uuid DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(promo_code_id, user_id)
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code_id uuid DEFAULT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_discount numeric DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_promo_code_uses(code_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = code_id;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(promo_code_id, user_id);

ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "promo_codes_read" ON promo_codes;
CREATE POLICY "promo_codes_read" ON promo_codes FOR SELECT USING (true);
DROP POLICY IF EXISTS "promo_code_uses_insert" ON promo_code_uses;
CREATE POLICY "promo_code_uses_insert" ON promo_code_uses FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "promo_code_uses_read" ON promo_code_uses;
CREATE POLICY "promo_code_uses_read" ON promo_code_uses FOR SELECT USING (auth.uid() = user_id);


-- ================================================================
-- 12. PARRAINAGES + ALERTES PRIX
-- ================================================================

CREATE TABLE IF NOT EXISTS referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid REFERENCES auth.users(id) NOT NULL,
  referred_id uuid REFERENCES auth.users(id) NOT NULL UNIQUE,
  referral_code text NOT NULL,
  reward_granted boolean DEFAULT false,
  referrer_reward_code text DEFAULT NULL,
  referred_reward_code text DEFAULT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referrals_read_own" ON referrals;
CREATE POLICY "referrals_read_own" ON referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);
DROP POLICY IF EXISTS "referrals_insert" ON referrals;
CREATE POLICY "referrals_insert" ON referrals FOR INSERT WITH CHECK (auth.uid() = referred_id);

CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  item_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_price_alerts_item ON price_alerts(item_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON price_alerts(user_id);
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "price_alerts_read_own" ON price_alerts;
CREATE POLICY "price_alerts_read_own" ON price_alerts FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "price_alerts_insert" ON price_alerts;
CREATE POLICY "price_alerts_insert" ON price_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "price_alerts_delete_own" ON price_alerts;
CREATE POLICY "price_alerts_delete_own" ON price_alerts FOR DELETE USING (auth.uid() = user_id);


-- ================================================================
-- 13. CLIPS + EQUIPE VENDEUR
-- ================================================================

CREATE TABLE IF NOT EXISTS clips (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id uuid NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL DEFAULT 'Clip',
  recording_url text NOT NULL,
  start_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer NOT NULL DEFAULT 60,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clips_stream ON clips(stream_id);
CREATE INDEX IF NOT EXISTS idx_clips_seller ON clips(seller_id);
ALTER TABLE clips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clips_read_all" ON clips;
CREATE POLICY "clips_read_all" ON clips FOR SELECT USING (true);
DROP POLICY IF EXISTS "clips_insert_owner" ON clips;
CREATE POLICY "clips_insert_owner" ON clips FOR INSERT WITH CHECK (auth.uid() = seller_id);
DROP POLICY IF EXISTS "clips_delete_owner" ON clips;
CREATE POLICY "clips_delete_owner" ON clips FOR DELETE USING (auth.uid() = seller_id);

CREATE TABLE IF NOT EXISTS seller_team_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id uuid NOT NULL REFERENCES auth.users(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL CHECK (role IN ('manager', 'moderator', 'shipper')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'removed')),
  invited_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(seller_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_seller ON seller_team_members(seller_id);
CREATE INDEX IF NOT EXISTS idx_team_user ON seller_team_members(user_id);
ALTER TABLE seller_team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_read_own" ON seller_team_members;
CREATE POLICY "team_read_own" ON seller_team_members FOR SELECT USING (auth.uid() = seller_id OR auth.uid() = user_id);
DROP POLICY IF EXISTS "team_insert_seller" ON seller_team_members;
CREATE POLICY "team_insert_seller" ON seller_team_members FOR INSERT WITH CHECK (auth.uid() = seller_id);
DROP POLICY IF EXISTS "team_update_own" ON seller_team_members;
CREATE POLICY "team_update_own" ON seller_team_members FOR UPDATE USING (auth.uid() = seller_id OR auth.uid() = user_id);


-- ================================================================
-- 14. CORRECTIFS SECURITE AVANCES
-- ================================================================

-- Vue securisee pour cacher mux_stream_key
DROP VIEW IF EXISTS public.streams_public;
CREATE VIEW public.streams_public WITH (security_barrier = true) AS
SELECT
  id, seller_id, title, description, category, tags, status, thumbnail_url,
  viewer_count, peak_viewers, engagement_score, avg_watch_time_seconds,
  total_reactions, scheduled_at, started_at, ended_at, city, community_id,
  mux_stream_id, mux_playback_id,
  CASE WHEN auth.uid() = seller_id THEN mux_stream_key ELSE NULL END AS mux_stream_key,
  mux_asset_id, deleted_at, created_at
FROM public.streams;

-- Supprimer la policy dangereuse "Sellers create orders"
DROP POLICY IF EXISTS "Sellers create orders" ON public.orders;

-- Fix banned_identifiers RLS
DROP POLICY IF EXISTS "Service role full access on banned_identifiers" ON public.banned_identifiers;
DROP POLICY IF EXISTS "banned_identifiers_deny_all" ON public.banned_identifiers;
CREATE POLICY "banned_identifiers_deny_all" ON public.banned_identifiers FOR ALL USING (false);

-- FK constraints manquantes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'disputes_seller_id_fkey'
      AND table_name = 'disputes' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.disputes ADD CONSTRAINT disputes_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'shipping_proofs_seller_id_fkey'
      AND table_name = 'shipping_proofs' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.shipping_proofs ADD CONSTRAINT shipping_proofs_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id);
  END IF;
END $$;

-- Fix RLS disputes (supprime le cast ::text)
DROP POLICY IF EXISTS "Users see own disputes" ON public.disputes;
DROP POLICY IF EXISTS "Buyers create disputes" ON public.disputes;
CREATE POLICY "Users see own disputes" ON public.disputes FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyers create disputes" ON public.disputes FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Fix RLS shipping_proofs
DROP POLICY IF EXISTS "Users see proofs for own orders" ON public.shipping_proofs;
CREATE POLICY "Users see proofs for own orders" ON public.shipping_proofs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = shipping_proofs.order_id
    AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
  )
);
DROP POLICY IF EXISTS "Sellers insert proofs" ON public.shipping_proofs;
CREATE POLICY "Sellers insert proofs" ON public.shipping_proofs FOR INSERT WITH CHECK (auth.uid() = seller_id);

-- Index manquants
CREATE INDEX IF NOT EXISTS idx_followers_seller ON public.followers(seller_id);
CREATE INDEX IF NOT EXISTS idx_followers_user ON public.followers(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_sender ON public.conversation_messages(sender_id);


-- ================================================================
-- 15. ANALYTICS EVENTS (nouveau)
-- ================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}',
  client_timestamp timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_ts ON analytics_events(event_name, created_at DESC);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own events" ON analytics_events;
CREATE POLICY "Users can insert own events" ON analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can read all events" ON analytics_events;
CREATE POLICY "Service role can read all events" ON analytics_events FOR SELECT USING (auth.role() = 'service_role');


-- ================================================================
-- DONE! Toutes les migrations sont appliquees.
-- ================================================================
