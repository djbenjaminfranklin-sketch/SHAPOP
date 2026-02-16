-- Migration: Ban by email + phone with OTP verification
-- Adds banned_identifiers table and phone fields to profiles

-- 1. Table banned_identifiers
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

-- 2. Add phone fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON profiles (phone_number);

-- 3. RLS policies for banned_identifiers (service role only)
ALTER TABLE banned_identifiers ENABLE ROW LEVEL SECURITY;

-- No public access — only the server (service role) can read/write
CREATE POLICY "Service role full access on banned_identifiers"
  ON banned_identifiers
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
