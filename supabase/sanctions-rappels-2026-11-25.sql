-- Sanctions vendeur (avertissement → paiement à la réception 30 jours → bannissement) et rappels (25/11/2026)
alter table public.sellers
  add column if not exists sanction_level int not null default 0,
  add column if not exists sanction_until timestamptz;
alter table public.orders
  add column if not exists reminders jsonb not null default '{}'::jsonb;
