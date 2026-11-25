-- Envoi par la poste (25/11/2026) : le vendeur glisse un code dans le colis, l'acheteur le saisit à la
-- réception (vendeur payé tout de suite) ; sinon versement 10 jours après l'envoi. Suivi Ship24.
create table if not exists public.order_receipt_codes (
  order_id uuid primary key references public.orders(id) on delete cascade,
  code text not null,
  attempts int not null default 0,
  locked_at timestamptz,
  created_at timestamptz not null default now()
);
-- Lu et écrit uniquement par le serveur (clé service) : aucune règle d'accès pour les appareils
alter table public.order_receipt_codes enable row level security;

alter table public.orders
  add column if not exists carrier_tracker_id text,
  add column if not exists carrier_first_event_at timestamptz,
  add column if not exists carrier_delivered_at timestamptz,
  add column if not exists carrier_checked_at timestamptz,
  add column if not exists carrier_alerted_at timestamptz;
create index if not exists orders_tracking_number_idx on public.orders (tracking_number) where tracking_number is not null;
create index if not exists orders_carrier_tracker_idx on public.orders (carrier_tracker_id) where carrier_tracker_id is not null;
