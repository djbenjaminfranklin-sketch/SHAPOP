-- =============================================
-- WhatFor — Schéma complet nouvelle génération
-- =============================================

create extension if not exists "uuid-ossp";
create extension if not exists "postgis";  -- Pour géolocalisation communautés locales

-- =============================================
-- USERS & PROFILES
-- =============================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  is_seller boolean default false,
  city text,
  country text default 'IL',
  location geography(Point, 4326),  -- Coordonnées GPS pour communautés locales
  language text default 'he',
  joined_communities text[] default '{}',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Profiles viewable by all" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- =============================================
-- SELLERS (extension du profil pour vendeurs)
-- =============================================
create table public.sellers (
  id uuid references public.profiles(id) on delete cascade primary key,
  store_name text not null,
  store_description text,
  store_banner_url text,             -- Bannière générée par IA
  store_banner_colors text[] default '{}',  -- Palette de couleurs
  store_tagline text,                -- Phrase d'accroche
  store_intro_video_url text,        -- Vidéo de présentation courte (max 30s)
  stripe_account_id text,          -- Stripe Connect account
  kyc_status text check (kyc_status in ('pending', 'verified', 'rejected')) default 'pending',
  rating numeric(3,2) default 0,
  total_sales integer default 0,
  total_revenue numeric(12,2) default 0,
  categories text[] default '{}',  -- Catégories du vendeur
  -- Onboarding data
  sub_categories text[] default '{}',
  seller_type text,
  selling_locations text[] default '{}',
  platforms text[] default '{}',
  etsy_url text,
  revenue_range text,
  team_size text,
  live_hours text,
  return_address jsonb,
  bank_choice text,
  fees_accepted_at timestamptz,         -- Date d'acceptation de la grille tarifaire
  onboarding_completed_at timestamptz,
  --
  verified_at timestamptz,
  created_at timestamptz default now()
);

alter table public.sellers enable row level security;
create policy "Sellers viewable by all" on public.sellers for select using (true);
create policy "Sellers update own" on public.sellers for update using (auth.uid() = id);
create policy "Sellers insert own" on public.sellers for insert with check (auth.uid() = id);

-- =============================================
-- STREAMS / LIVES
-- =============================================
create table public.streams (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.sellers(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null,
  tags text[] default '{}',
  status text check (status in ('scheduled', 'live', 'ended')) default 'scheduled',
  thumbnail_url text,
  viewer_count integer default 0,
  peak_viewers integer default 0,
  -- Engagement metrics (mis à jour en temps réel)
  engagement_score numeric(5,2) default 0,
  avg_watch_time_seconds integer default 0,
  total_reactions integer default 0,
  -- Scheduling
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  -- Géolocalisation
  city text,
  location geography(Point, 4326),
  community_id uuid references public.communities(id),
  -- Mux live streaming
  mux_stream_id text,
  mux_playback_id text,
  mux_stream_key text,
  mux_asset_id text,
  created_at timestamptz default now()
);

alter table public.streams enable row level security;
create policy "Streams viewable by all" on public.streams for select using (true);
create policy "Sellers create streams" on public.streams for insert with check (auth.uid() = seller_id);
create policy "Sellers update own streams" on public.streams for update using (auth.uid() = seller_id);

-- =============================================
-- ITEMS (listings avec AI)
-- =============================================
create table public.items (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.sellers(id) on delete cascade not null,
  stream_id uuid references public.streams(id) on delete set null,
  title text not null,
  description text,
  category text not null,
  subcategory text,
  image_urls text[] default '{}',
  -- Prix
  starting_price numeric(10,2) not null,
  current_price numeric(10,2) not null,
  estimated_price_low numeric(10,2),   -- Estimation IA
  estimated_price_high numeric(10,2),  -- Estimation IA
  -- AI metadata
  ai_generated boolean default false,
  ai_tags text[] default '{}',
  ai_condition text,                   -- 'mint', 'near_mint', 'good', 'fair', 'poor'
  ai_confidence numeric(3,2),          -- Score de confiance IA 0-1
  -- Enchère
  status text check (status in ('draft', 'pending', 'active', 'sold', 'unsold')) default 'draft',
  winner_id uuid references public.profiles(id),
  duration_seconds integer default 60,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);

alter table public.items enable row level security;
create policy "Items viewable by all" on public.items for select using (true);
create policy "Sellers create items" on public.items for insert with check (auth.uid() = seller_id);
create policy "Sellers update own items" on public.items for update using (auth.uid() = seller_id);

-- =============================================
-- BIDS
-- =============================================
create table public.bids (
  id uuid default uuid_generate_v4() primary key,
  item_id uuid references public.items(id) on delete cascade not null,
  bidder_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(10,2) not null,
  is_winning boolean default false,
  created_at timestamptz default now()
);

alter table public.bids enable row level security;
create policy "Bids viewable by all" on public.bids for select using (true);
create policy "Users place bids" on public.bids for insert with check (auth.uid() = bidder_id);

-- =============================================
-- ORDERS
-- =============================================
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  buyer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.sellers(id) not null,
  item_id uuid references public.items(id) not null,
  stream_id uuid references public.streams(id),
  -- Montants
  amount numeric(10,2) not null,
  platform_fee numeric(10,2) not null,    -- Commission WhatFor (8%)
  processing_fee numeric(10,2) not null default 0,  -- Frais traitement Stripe (2.9% + 0.30€)
  seller_payout numeric(10,2) not null,
  -- Status
  status text check (status in ('pending_payment', 'paid', 'shipped', 'delivered', 'refunded', 'disputed')) default 'pending_payment',
  -- Shipping
  shipping_address jsonb,
  tracking_number text,
  -- Payment
  stripe_payment_intent_id text,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz default now()
);

alter table public.orders enable row level security;
create policy "Users see own orders" on public.orders for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "Buyers create orders" on public.orders for insert with check (auth.uid() = buyer_id);
create policy "Sellers create orders" on public.orders for insert with check (auth.uid() = seller_id);
create policy "Users update own orders" on public.orders for update using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- =============================================
-- PAYMENTS
-- =============================================
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) not null,
  user_id uuid references public.profiles(id) not null,
  amount numeric(10,2) not null,
  currency text default 'ILS',
  type text check (type in ('charge', 'refund', 'payout')) not null,
  status text check (status in ('pending', 'processing', 'completed', 'failed')) default 'pending',
  stripe_id text,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.payments enable row level security;
create policy "Users see own payments" on public.payments for select using (auth.uid() = user_id);

-- =============================================
-- COMMUNITIES (locales)
-- =============================================
create table public.communities (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  description text,
  city text not null,
  region text,
  country text default 'IL',
  location geography(Point, 4326),
  image_url text,
  member_count integer default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.communities enable row level security;
create policy "Communities viewable by all" on public.communities for select using (true);
create policy "Users create communities" on public.communities for insert with check (auth.uid() = created_by);

create table public.community_members (
  community_id uuid references public.communities(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text check (role in ('member', 'moderator', 'admin')) default 'member',
  joined_at timestamptz default now(),
  primary key (community_id, user_id)
);

alter table public.community_members enable row level security;
create policy "Membership viewable by all" on public.community_members for select using (true);
create policy "Users join communities" on public.community_members for insert with check (auth.uid() = user_id);

-- =============================================
-- EVENTS (communautaires)
-- =============================================
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  organizer_id uuid references public.profiles(id) not null,
  title text not null,
  description text,
  event_type text check (event_type in ('live_group', 'meetup', 'special_sale', 'tournament')) not null,
  scheduled_at timestamptz not null,
  stream_id uuid references public.streams(id),
  max_participants integer,
  created_at timestamptz default now()
);

alter table public.events enable row level security;
create policy "Events viewable by all" on public.events for select using (true);
create policy "Users create events" on public.events for insert with check (auth.uid() = organizer_id);

-- =============================================
-- USER PREFERENCES (pour matching IA)
-- =============================================
create table public.user_preferences (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  favorite_categories text[] default '{}',
  favorite_sellers uuid[] default '{}',
  price_range_min numeric(10,2) default 0,
  price_range_max numeric(10,2) default 10000,
  preferred_cities text[] default '{}',
  -- Embedding IA (vecteur de préférences)
  preference_embedding vector(384),  -- Nécessite pgvector
  last_updated timestamptz default now()
);

alter table public.user_preferences enable row level security;
create policy "Users see own prefs" on public.user_preferences for select using (auth.uid() = user_id);
create policy "Users update own prefs" on public.user_preferences for update using (auth.uid() = user_id);
create policy "Users insert own prefs" on public.user_preferences for insert with check (auth.uid() = user_id);

-- =============================================
-- ADDRESSES (user shipping/return addresses)
-- =============================================
create table public.addresses (
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
create policy "Users see own addresses" on public.addresses for select using (auth.uid() = user_id);
create policy "Users insert own addresses" on public.addresses for insert with check (auth.uid() = user_id);
create policy "Users update own addresses" on public.addresses for update using (auth.uid() = user_id);
create policy "Users delete own addresses" on public.addresses for delete using (auth.uid() = user_id);

create index idx_addresses_user on public.addresses(user_id);

-- =============================================
-- ENGAGEMENT METRICS (temps réel)
-- =============================================
create table public.engagement_metrics (
  id uuid default uuid_generate_v4() primary key,
  stream_id uuid references public.streams(id) on delete cascade not null,
  -- Métriques agrégées par minute
  timestamp timestamptz not null,
  viewer_count integer default 0,
  active_chatters integer default 0,
  bids_count integer default 0,
  reactions_count integer default 0,
  new_followers integer default 0,
  -- Scores calculés
  engagement_rate numeric(5,4) default 0,  -- (actions / viewers)
  sentiment_score numeric(3,2) default 0,  -- -1 à 1
  energy_level text check (energy_level in ('low', 'medium', 'high', 'peak')) default 'medium'
);

alter table public.engagement_metrics enable row level security;
create policy "Metrics viewable by all" on public.engagement_metrics for select using (true);

-- =============================================
-- CHAT MESSAGES
-- =============================================
create table public.chat_messages (
  id uuid default uuid_generate_v4() primary key,
  stream_id uuid references public.streams(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  type text check (type in ('message', 'reaction', 'bid_notification', 'system')) default 'message',
  created_at timestamptz default now()
);

alter table public.chat_messages enable row level security;
create policy "Chat viewable by all" on public.chat_messages for select using (true);
create policy "Users send messages" on public.chat_messages for insert with check (auth.uid() = user_id);

-- =============================================
-- REALTIME
-- =============================================
alter publication supabase_realtime add table public.streams;
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.engagement_metrics;

-- =============================================
-- INDEXES
-- =============================================
create index idx_streams_status on public.streams(status);
create index idx_streams_seller on public.streams(seller_id);
create index idx_streams_category on public.streams(category);
create index idx_streams_city on public.streams(city);
create index idx_streams_engagement on public.streams(engagement_score desc);
create index idx_streams_scheduled on public.streams(scheduled_at) where status = 'scheduled';
create index idx_streams_location on public.streams using gist(location);

create index idx_items_stream on public.items(stream_id);
create index idx_items_seller on public.items(seller_id);
create index idx_items_status on public.items(status);
create index idx_items_category on public.items(category);

create index idx_bids_item on public.bids(item_id);
create index idx_bids_bidder on public.bids(bidder_id);
create index idx_bids_amount on public.bids(item_id, amount desc);

create index idx_orders_buyer on public.orders(buyer_id);
create index idx_orders_seller on public.orders(seller_id);
create index idx_orders_status on public.orders(status);

create index idx_chat_stream on public.chat_messages(stream_id);
create index idx_chat_created on public.chat_messages(stream_id, created_at);

create index idx_communities_city on public.communities(city);
create index idx_communities_location on public.communities using gist(location);

create index idx_engagement_stream on public.engagement_metrics(stream_id, timestamp desc);
