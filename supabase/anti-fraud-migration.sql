-- =============================================
-- Anti-Fraud System Migration — ShaPop
-- Phase 1-3: Disputes, Scoring, Trust, Proofs, Messaging
-- =============================================

-- =============================================
-- DISPUTES (réclamations acheteur structurées)
-- =============================================
create table if not exists public.disputes (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) not null unique,
  buyer_id uuid references public.profiles(id) not null,
  seller_id uuid not null,
  reason text check (reason in ('not_received','wrong_item','damaged','not_as_described','counterfeit')) not null,
  description text not null,
  evidence_urls text[] default '{}',
  status text check (status in ('open','under_review','resolved_buyer','resolved_seller','escalated')) default 'open',
  resolution_note text,
  auto_refund boolean default false,
  amount numeric(10,2) not null,
  opened_at timestamptz default now(),
  resolved_at timestamptz,
  created_at timestamptz default now()
);

alter table public.disputes enable row level security;
create policy "Users see own disputes" on public.disputes for select using (auth.uid() = buyer_id or auth.uid()::text = seller_id::text);
create policy "Buyers create disputes" on public.disputes for insert with check (auth.uid() = buyer_id);

create index idx_disputes_order on public.disputes(order_id);
create index idx_disputes_buyer on public.disputes(buyer_id);
create index idx_disputes_seller on public.disputes(seller_id);
create index idx_disputes_status on public.disputes(status);

-- =============================================
-- BUYER SCORES (scoring acheteur)
-- =============================================
create table if not exists public.buyer_scores (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  score integer default 100,
  total_orders integer default 0,
  total_disputes integer default 0,
  disputes_won integer default 0,
  disputes_lost integer default 0,
  total_refunds integer default 0,
  refund_amount numeric(10,2) default 0,
  last_dispute_at timestamptz,
  risk_level text check (risk_level in ('low','medium','high','blocked')) default 'low',
  updated_at timestamptz default now()
);

alter table public.buyer_scores enable row level security;
create policy "Users see own score" on public.buyer_scores for select using (auth.uid() = user_id);

create index idx_buyer_scores_risk on public.buyer_scores(risk_level);

-- =============================================
-- SELLER TRUST (niveaux de confiance vendeur)
-- =============================================
create table if not exists public.seller_trust (
  seller_id uuid references public.sellers(id) on delete cascade primary key,
  trust_level text check (trust_level in ('new','standard','trusted','premium')) default 'new',
  total_completed_orders integer default 0,
  total_disputes_against integer default 0,
  disputes_lost integer default 0,
  avg_ship_time_hours numeric(6,1) default 0,
  positive_delivery_rate numeric(5,4) default 1.0,
  holdback_percent integer default 20,
  payout_delay_days integer default 7,
  proof_level text check (proof_level in ('basic','standard','enhanced')) default 'enhanced',
  manually_set boolean default false,
  updated_at timestamptz default now()
);

alter table public.seller_trust enable row level security;
create policy "Sellers see own trust" on public.seller_trust for select using (auth.uid() = seller_id);
create policy "Trust viewable by all" on public.seller_trust for select using (true);

create index idx_seller_trust_level on public.seller_trust(trust_level);

-- =============================================
-- SHIPPING PROOFS (preuves multiples par commande)
-- =============================================
create table if not exists public.shipping_proofs (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) not null,
  seller_id uuid not null,
  type text check (type in ('photo_package','photo_content','video_packing')) not null,
  url text not null,
  uploaded_at timestamptz default now()
);

alter table public.shipping_proofs enable row level security;
create policy "Users see proofs for own orders" on public.shipping_proofs for select using (
  exists (
    select 1 from public.orders
    where orders.id = shipping_proofs.order_id
    and (orders.buyer_id = auth.uid() or orders.seller_id::text = auth.uid()::text)
  )
);
create policy "Sellers insert proofs" on public.shipping_proofs for insert with check (auth.uid()::text = seller_id::text);

create index idx_shipping_proofs_order on public.shipping_proofs(order_id);

-- =============================================
-- ALTER ORDERS — colonnes anti-fraude
-- =============================================
alter table public.orders add column if not exists claim_deadline timestamptz;
alter table public.orders add column if not exists payout_scheduled_at timestamptz;
alter table public.orders add column if not exists holdback_percent integer default 0;
alter table public.orders add column if not exists payout_status text default 'pending';

-- =============================================
-- ALTER CHAT MESSAGES — filtrage
-- =============================================
alter table public.chat_messages add column if not exists is_flagged boolean default false;
alter table public.chat_messages add column if not exists flag_reason text;

-- =============================================
-- CONVERSATIONS (messagerie interne — Phase 3)
-- =============================================
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  type text check (type in ('order','support','dispute')) not null default 'order',
  order_id uuid references public.orders(id),
  participant_1 uuid references public.profiles(id) not null,
  participant_2 uuid references public.profiles(id) not null,
  status text check (status in ('active','closed','archived')) default 'active',
  created_at timestamptz default now()
);

alter table public.conversations enable row level security;
create policy "Users see own conversations" on public.conversations for select using (auth.uid() = participant_1 or auth.uid() = participant_2);
create policy "Users create conversations" on public.conversations for insert with check (auth.uid() = participant_1 or auth.uid() = participant_2);

create index idx_conversations_p1 on public.conversations(participant_1);
create index idx_conversations_p2 on public.conversations(participant_2);
create index idx_conversations_order on public.conversations(order_id);

-- =============================================
-- CONVERSATION MESSAGES (Phase 3)
-- =============================================
create table if not exists public.conversation_messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) not null,
  message text not null,
  is_system boolean default false,
  is_flagged boolean default false,
  flag_reason text,
  attachment_urls text[] default '{}',
  created_at timestamptz default now()
);

alter table public.conversation_messages enable row level security;
create policy "Users see messages in own conversations" on public.conversation_messages for select using (
  exists (
    select 1 from public.conversations
    where conversations.id = conversation_messages.conversation_id
    and (conversations.participant_1 = auth.uid() or conversations.participant_2 = auth.uid())
  )
);
create policy "Users send messages in own conversations" on public.conversation_messages for insert with check (
  auth.uid() = sender_id
  and exists (
    select 1 from public.conversations
    where conversations.id = conversation_messages.conversation_id
    and (conversations.participant_1 = auth.uid() or conversations.participant_2 = auth.uid())
  )
);

create index idx_conversation_messages_conv on public.conversation_messages(conversation_id, created_at);

-- =============================================
-- REALTIME pour nouvelles tables
-- =============================================
alter publication supabase_realtime add table public.disputes;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_messages;
