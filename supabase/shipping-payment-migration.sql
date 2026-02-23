-- Add column to store the Stripe PaymentIntent ID for shipping charges
-- Shipping is now charged off-session when the seller enters the weight and generates the label
alter table public.orders add column if not exists shipping_payment_intent_id text;
