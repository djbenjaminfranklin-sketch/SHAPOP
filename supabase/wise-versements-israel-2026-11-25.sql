-- Vendeurs israéliens payés par Wise Business (décision du 25/11/2026, Airwallex refusé) :
-- l'acheteur paie par Stripe (sur le compte ShaPop), un lot de virements ILS est préparé chaque jour,
-- Benjamin le valide (SCA) dans l'appli Wise.
alter table public.sellers
  add column if not exists payout_iban text,
  add column if not exists payout_holder_name text,
  add column if not exists payout_iban_updated_at timestamptz,
  add column if not exists wise_recipient_id text;
alter table public.orders
  add column if not exists wise_status text,            -- queued | in_batch | paid | excluded
  add column if not exists wise_batch_id uuid,
  add column if not exists wise_transfer_id text,
  add column if not exists wise_excluded_reason text;
create index if not exists orders_wise_status_idx on public.orders (wise_status) where wise_status is not null;
create table if not exists public.wise_batches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  wise_batch_group_id text,
  status text not null default 'prepared',
  transfer_count int not null default 0,
  total_ils numeric not null default 0,
  excluded jsonb not null default '[]'::jsonb,
  error text
);
alter table public.wise_batches enable row level security;
