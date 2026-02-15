-- =============================================
-- ShaPop — Schema de base de donnees
-- Coller dans Supabase SQL Editor et executer
-- =============================================

create extension if not exists "uuid-ossp";

-- PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  is_seller boolean default false,
  city text,
  country text default 'IL',
  language text default 'he',
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Profiles viewable by all" on public.profiles for select using (true);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- SELLERS
create table public.sellers (
  id uuid references public.profiles(id) on delete cascade primary key,
  store_name text not null,
  store_description text,
  store_banner_url text,
  store_banner_colors text[] default '{}',
  store_tagline text,
  store_intro_video_url text,
  stripe_account_id text,
  kyc_status text check (kyc_status in ('pending', 'verified', 'rejected')) default 'pending',
  rating numeric(3,2) default 0,
  total_sales integer default 0,
  total_revenue numeric(12,2) default 0,
  categories text[] default '{}',
  verified_at timestamptz,
  created_at timestamptz default now()
);

alter table public.sellers enable row level security;
create policy "Sellers viewable by all" on public.sellers for select using (true);
create policy "Sellers update own" on public.sellers for update using (auth.uid() = id);
create policy "Sellers insert own" on public.sellers for insert with check (auth.uid() = id);

-- COMMUNITIES
create table public.communities (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text unique not null,
  description text,
  city text not null,
  region text,
  country text default 'IL',
  image_url text,
  member_count integer default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

alter table public.communities enable row level security;
create policy "Communities viewable by all" on public.communities for select using (true);
create policy "Users create communities" on public.communities for insert with check (auth.uid() = created_by);

-- STREAMS
create table public.streams (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text,
  category text not null,
  tags text[] default '{}',
  status text check (status in ('scheduled', 'live', 'ended')) default 'scheduled',
  thumbnail_url text,
  viewer_count integer default 0,
  peak_viewers integer default 0,
  engagement_score numeric(5,2) default 0,
  avg_watch_time_seconds integer default 0,
  total_reactions integer default 0,
  scheduled_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  city text,
  community_id uuid references public.communities(id),
  created_at timestamptz default now()
);

alter table public.streams enable row level security;
create policy "Streams viewable by all" on public.streams for select using (true);
create policy "Sellers create streams" on public.streams for insert with check (auth.uid() = seller_id);
create policy "Sellers update own streams" on public.streams for update using (auth.uid() = seller_id);

-- ITEMS
create table public.items (
  id uuid default uuid_generate_v4() primary key,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  stream_id uuid references public.streams(id) on delete set null,
  title text not null,
  description text,
  category text not null,
  subcategory text,
  image_urls text[] default '{}',
  starting_price numeric(10,2) not null,
  current_price numeric(10,2) not null,
  estimated_price_low numeric(10,2),
  estimated_price_high numeric(10,2),
  ai_generated boolean default false,
  ai_tags text[] default '{}',
  ai_condition text,
  ai_confidence numeric(3,2),
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

-- BIDS
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

-- ORDERS
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  buyer_id uuid references public.profiles(id) not null,
  seller_id uuid references public.profiles(id) not null,
  item_id uuid references public.items(id) not null,
  stream_id uuid references public.streams(id),
  amount numeric(10,2) not null,
  platform_fee numeric(10,2) not null,
  seller_payout numeric(10,2) not null,
  status text check (status in ('pending_payment', 'paid', 'shipped', 'delivered', 'refunded', 'disputed')) default 'pending_payment',
  shipping_address jsonb,
  tracking_number text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz default now()
);

alter table public.orders enable row level security;
create policy "Users see own orders" on public.orders for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "System creates orders" on public.orders for insert with check (auth.uid() = buyer_id);

-- PAYMENTS
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

-- COMMUNITY MEMBERS
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

-- EVENTS
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

-- USER PREFERENCES
create table public.user_preferences (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  favorite_categories text[] default '{}',
  favorite_sellers uuid[] default '{}',
  price_range_min numeric(10,2) default 0,
  price_range_max numeric(10,2) default 10000,
  preferred_cities text[] default '{}',
  last_updated timestamptz default now()
);

alter table public.user_preferences enable row level security;
create policy "Users see own prefs" on public.user_preferences for select using (auth.uid() = user_id);
create policy "Users update own prefs" on public.user_preferences for update using (auth.uid() = user_id);
create policy "Users insert own prefs" on public.user_preferences for insert with check (auth.uid() = user_id);

-- ENGAGEMENT METRICS
create table public.engagement_metrics (
  id uuid default uuid_generate_v4() primary key,
  stream_id uuid references public.streams(id) on delete cascade not null,
  timestamp timestamptz not null,
  viewer_count integer default 0,
  active_chatters integer default 0,
  bids_count integer default 0,
  reactions_count integer default 0,
  new_followers integer default 0,
  engagement_rate numeric(5,4) default 0,
  sentiment_score numeric(3,2) default 0,
  energy_level text check (energy_level in ('low', 'medium', 'high', 'peak')) default 'medium'
);

alter table public.engagement_metrics enable row level security;
create policy "Metrics viewable by all" on public.engagement_metrics for select using (true);

-- CHAT MESSAGES
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

-- REALTIME
alter publication supabase_realtime add table public.streams;
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.bids;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.engagement_metrics;

-- INDEXES
create index idx_streams_status on public.streams(status);
create index idx_streams_seller on public.streams(seller_id);
create index idx_streams_category on public.streams(category);
create index idx_streams_city on public.streams(city);
create index idx_streams_engagement on public.streams(engagement_score desc);

create index idx_items_stream on public.items(stream_id);
create index idx_items_seller on public.items(seller_id);
create index idx_items_status on public.items(status);
create index idx_items_category on public.items(category);

create index idx_bids_item on public.bids(item_id);
create index idx_bids_bidder on public.bids(bidder_id);
create index idx_bids_amount on public.bids(item_id, amount desc);

create index idx_orders_buyer on public.orders(buyer_id);
create index idx_orders_seller on public.orders(seller_id);

create index idx_chat_stream on public.chat_messages(stream_id);
create index idx_chat_created on public.chat_messages(stream_id, created_at);

create index idx_engagement_stream on public.engagement_metrics(stream_id, timestamp desc);

create index idx_communities_city on public.communities(city);
