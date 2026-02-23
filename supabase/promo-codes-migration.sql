-- Promo Codes table
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

-- Promo Code usage tracking
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id uuid REFERENCES promo_codes(id) NOT NULL,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  order_id uuid DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(promo_code_id, user_id)
);

-- Add promo code columns to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_code_id uuid DEFAULT NULL REFERENCES promo_codes(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS promo_discount numeric DEFAULT 0;

-- RPC to increment usage count atomically
CREATE OR REPLACE FUNCTION increment_promo_code_uses(code_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = code_id;
END;
$$ LANGUAGE plpgsql;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(promo_code_id, user_id);

-- RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_code_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "promo_codes_read" ON promo_codes FOR SELECT USING (true);
CREATE POLICY "promo_code_uses_insert" ON promo_code_uses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "promo_code_uses_read" ON promo_code_uses FOR SELECT USING (auth.uid() = user_id);
