-- PayPal Payouts migration
-- Allows Israeli sellers (and others not supported by Stripe Connect) to receive payouts via PayPal

-- Sellers: add PayPal email column
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS paypal_email text;

-- Orders: payout method tracking (stripe or paypal)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payout_method text DEFAULT 'stripe';

-- PayPal payouts tracking table
CREATE TABLE IF NOT EXISTS public.paypal_payouts (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_id uuid REFERENCES public.orders(id) NOT NULL,
  seller_id uuid REFERENCES public.sellers(id) NOT NULL,
  paypal_email text NOT NULL,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'EUR',
  paypal_batch_id text,
  paypal_item_id text,
  status text DEFAULT 'pending',  -- pending/ready/processing/completed/failed
  error_message text,
  attempts integer DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Index for fast lookup by order
CREATE INDEX IF NOT EXISTS idx_paypal_payouts_order_id ON public.paypal_payouts(order_id);
-- Index for processing pending payouts
CREATE INDEX IF NOT EXISTS idx_paypal_payouts_status ON public.paypal_payouts(status);
-- Index for seller lookup
CREATE INDEX IF NOT EXISTS idx_paypal_payouts_seller_id ON public.paypal_payouts(seller_id);
