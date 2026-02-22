-- =============================================
-- Buyer Features Migration
-- Max-bids, Pre-bids, Offers, Loyalty, Spend Limits
-- =============================================

-- 1. Max Bids (proxy bidding)
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

CREATE POLICY "Users can view their own max_bids"
  ON public.max_bids FOR SELECT
  USING (auth.uid() = bidder_id);

CREATE POLICY "Users can insert their own max_bids"
  ON public.max_bids FOR INSERT
  WITH CHECK (auth.uid() = bidder_id);

CREATE POLICY "Users can update their own max_bids"
  ON public.max_bids FOR UPDATE
  USING (auth.uid() = bidder_id);

-- 2. Pre-Bids (bid before live)
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

CREATE POLICY "Users can view their own pre_bids"
  ON public.pre_bids FOR SELECT
  USING (auth.uid() = bidder_id);

CREATE POLICY "Users can insert their own pre_bids"
  ON public.pre_bids FOR INSERT
  WITH CHECK (auth.uid() = bidder_id);

CREATE POLICY "Users can update their own pre_bids"
  ON public.pre_bids FOR UPDATE
  USING (auth.uid() = bidder_id);

-- 3. Offers (make an offer on fixed-price items)
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

CREATE POLICY "Users can view offers they are part of"
  ON public.offers FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid()::text = seller_id);

CREATE POLICY "Buyers can insert offers"
  ON public.offers FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Participants can update offers"
  ON public.offers FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid()::text = seller_id);

-- 4. Spend Limits
CREATE TABLE IF NOT EXISTS public.spend_limits (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  weekly_limit numeric(10,2),
  monthly_limit numeric(10,2),
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.spend_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own spend_limits"
  ON public.spend_limits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spend_limits"
  ON public.spend_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spend_limits"
  ON public.spend_limits FOR UPDATE
  USING (auth.uid() = user_id);

-- 5. Loyalty Points
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  points integer DEFAULT 0,
  tier text DEFAULT 'bronze' CHECK (tier IN ('bronze','silver','gold','platinum')),
  total_earned integer DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own loyalty_points"
  ON public.loyalty_points FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loyalty_points"
  ON public.loyalty_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loyalty_points"
  ON public.loyalty_points FOR UPDATE
  USING (auth.uid() = user_id);

-- 6. Loyalty Transactions
CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  points integer NOT NULL,
  reason text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own loyalty_transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_max_bids_item_active ON public.max_bids(item_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pre_bids_item_pending ON public.pre_bids(item_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_offers_item ON public.offers(item_id);
CREATE INDEX IF NOT EXISTS idx_offers_buyer ON public.offers(buyer_id);
CREATE INDEX IF NOT EXISTS idx_offers_seller ON public.offers(seller_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON public.offers(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_loyalty_transactions_user ON public.loyalty_transactions(user_id);
