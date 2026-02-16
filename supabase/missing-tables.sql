-- Run this SQL in the Supabase SQL Editor to create missing tables
-- (Dashboard > SQL Editor > New Query > Paste & Run)

-- =============================================
-- ADDRESSES
-- =============================================
create table if not exists public.addresses (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  street text not null,
  city text not null,
  zip text not null,
  phone text,
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table public.addresses enable row level security;

-- Drop policies first in case they partially exist
drop policy if exists "Users see own addresses" on public.addresses;
drop policy if exists "Users insert own addresses" on public.addresses;
drop policy if exists "Users update own addresses" on public.addresses;
drop policy if exists "Users delete own addresses" on public.addresses;

create policy "Users see own addresses" on public.addresses for select using (auth.uid() = user_id);
create policy "Users insert own addresses" on public.addresses for insert with check (auth.uid() = user_id);
create policy "Users update own addresses" on public.addresses for update using (auth.uid() = user_id);
create policy "Users delete own addresses" on public.addresses for delete using (auth.uid() = user_id);

create index if not exists idx_addresses_user on public.addresses(user_id);

-- =============================================
-- DEVICE TOKENS (push notifications)
-- =============================================
create table if not exists public.device_tokens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  token text not null,
  platform text check (platform in ('ios', 'android', 'web')) not null default 'ios',
  notify_live boolean default true,
  notify_orders boolean default true,
  notify_deals boolean default false,
  notify_messages boolean default true,
  notify_reminders boolean default true,
  notify_community boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, token)
);

alter table public.device_tokens enable row level security;

drop policy if exists "Users see own tokens" on public.device_tokens;
drop policy if exists "Users insert own tokens" on public.device_tokens;
drop policy if exists "Users update own tokens" on public.device_tokens;
drop policy if exists "Users delete own tokens" on public.device_tokens;

create policy "Users see own tokens" on public.device_tokens for select using (auth.uid() = user_id);
create policy "Users insert own tokens" on public.device_tokens for insert with check (auth.uid() = user_id);
create policy "Users update own tokens" on public.device_tokens for update using (auth.uid() = user_id);
create policy "Users delete own tokens" on public.device_tokens for delete using (auth.uid() = user_id);

-- =============================================
-- FOLLOWERS
-- =============================================
create table if not exists public.followers (
  user_id uuid references public.profiles(id) on delete cascade not null,
  seller_id uuid references public.sellers(id) on delete cascade not null,
  created_at timestamptz default now(),
  primary key (user_id, seller_id)
);

alter table public.followers enable row level security;

drop policy if exists "Anyone can see followers" on public.followers;
drop policy if exists "Users follow sellers" on public.followers;
drop policy if exists "Users unfollow sellers" on public.followers;

create policy "Anyone can see followers" on public.followers for select using (true);
create policy "Users follow sellers" on public.followers for insert with check (auth.uid() = user_id);
create policy "Users unfollow sellers" on public.followers for delete using (auth.uid() = user_id);

-- =============================================
-- ORDERS — Shipping proof column
-- =============================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_proof_url text;

-- =============================================
-- ADMIN — User moderation columns
-- =============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_suspended boolean default false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean default false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspension_reason text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;

-- =============================================
-- ADMIN — Seller risk columns
-- =============================================
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS payments_blocked boolean default false;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS reserve_percent integer default 0;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS documents_requested boolean default false;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS sale_limit numeric(10,2);

-- =============================================
-- ADMIN NOTES (internal notes on users)
-- =============================================
create table if not exists public.admin_notes (
  id uuid default uuid_generate_v4() primary key,
  target_user_id uuid references public.profiles(id) on delete cascade not null,
  admin_id uuid not null,
  admin_email text not null,
  note text not null,
  created_at timestamptz default now()
);

-- No RLS — only accessed via service key on server
alter table public.admin_notes enable row level security;

create index if not exists idx_admin_notes_target on public.admin_notes(target_user_id);

-- =============================================
-- ADMIN AUDIT LOG
-- =============================================
create table if not exists public.admin_audit_log (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid not null,
  admin_email text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  details jsonb default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_audit_log_created on public.admin_audit_log(created_at desc);
create index if not exists idx_audit_log_target on public.admin_audit_log(target_type, target_id);
