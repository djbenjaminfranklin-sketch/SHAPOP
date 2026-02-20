-- Cadeau Surprise (Giveaway) tables for live streams

create table public.giveaways (
  id uuid default uuid_generate_v4() primary key,
  stream_id uuid references public.streams(id) on delete cascade not null,
  seller_id uuid not null,
  title text not null default 'Cadeau Surprise',
  prize_description text not null,
  status text check (status in ('active', 'drawn', 'cancelled')) default 'active',
  winner_id uuid references auth.users(id),
  winner_name text,
  entry_count integer default 0,
  created_at timestamptz default now(),
  drawn_at timestamptz
);

create table public.giveaway_entries (
  id uuid default uuid_generate_v4() primary key,
  giveaway_id uuid references public.giveaways(id) on delete cascade not null,
  user_id uuid references auth.users(id) not null,
  display_name text,
  entered_at timestamptz default now(),
  unique(giveaway_id, user_id)
);

-- Activer le temps reel
alter publication supabase_realtime add table public.giveaways;
alter publication supabase_realtime add table public.giveaway_entries;

-- RLS
alter table public.giveaways enable row level security;
alter table public.giveaway_entries enable row level security;

create policy "Giveaways are viewable by everyone"
  on public.giveaways for select using (true);

create policy "Sellers can manage their giveaways"
  on public.giveaways for all using (auth.uid() = seller_id);

create policy "Entries are viewable by everyone"
  on public.giveaway_entries for select using (true);

create policy "Users can enter giveaways"
  on public.giveaway_entries for insert with check (auth.uid() = user_id);
