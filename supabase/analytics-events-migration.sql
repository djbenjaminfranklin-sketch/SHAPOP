-- Analytics events table for client-side event ingestion
-- Used by POST /api/analytics endpoint

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_name text not null,
  properties jsonb not null default '{}',
  client_timestamp timestamptz not null,
  created_at timestamptz not null default now()
);

-- Index for querying by user
create index if not exists idx_analytics_events_user_id on analytics_events(user_id);

-- Index for querying by event name + time range (dashboards)
create index if not exists idx_analytics_events_name_ts on analytics_events(event_name, created_at desc);

-- RLS: users can only insert their own events, only service role can read all
alter table analytics_events enable row level security;

create policy "Users can insert own events"
  on analytics_events for insert
  with check (auth.uid() = user_id);

create policy "Service role can read all events"
  on analytics_events for select
  using (auth.role() = 'service_role');
