-- Add stripe_customer_id to profiles for card-on-file before bidding
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
