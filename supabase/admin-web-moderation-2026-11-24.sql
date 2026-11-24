-- Admin web (24/11/2026) : modération des articles, file des signalements,
-- lecture des e-mails / téléphones des comptes (réservée au serveur).

-- 1. Articles : masqués / supprimés (suppression douce) par la modération
alter table public.items add column if not exists moderation_status text
  check (moderation_status in ('hidden', 'removed'));
alter table public.items add column if not exists moderated_at timestamptz;
alter table public.items add column if not exists moderated_by uuid;
alter table public.items add column if not exists moderation_reason text;
create index if not exists items_moderation_status_idx on public.items (moderation_status) where moderation_status is not null;

-- Un article modéré n'est plus visible du public : seuls son vendeur, son gagnant
-- et l'acheteur d'une commande liée le voient encore (historique de commande intact).
drop policy if exists "Items viewable by all" on public.items;
create policy "Items viewable by all" on public.items for select using (
  moderation_status is null
  or auth.uid() = seller_id
  or auth.uid() = winner_id
  or exists (select 1 from public.orders o where o.item_id = items.id and o.buyer_id = auth.uid())
);

-- 2. Signalements : statut de traitement + contexte précis (tous facultatifs)
alter table public.reports add column if not exists status text not null default 'open'
  check (status in ('open', 'resolved', 'dismissed'));
alter table public.reports add column if not exists item_id uuid references public.items(id) on delete set null;
alter table public.reports add column if not exists stream_id uuid references public.streams(id) on delete set null;
alter table public.reports add column if not exists message_id uuid;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists resolved_by uuid;
alter table public.reports add column if not exists resolution_action text;
alter table public.reports add column if not exists resolution_note text;
create index if not exists reports_status_idx on public.reports (status, created_at desc);

-- 3. E-mail / téléphone des comptes pour l'admin (auth.users n'est pas exposé)
create or replace function public.admin_auth_users(p_search text default null, p_ids uuid[] default null)
returns table (id uuid, email text, phone text, created_at timestamptz, last_sign_in_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select u.id, u.email::text, u.phone::text, u.created_at, u.last_sign_in_at
  from auth.users u
  where (p_ids is null or u.id = any(p_ids))
    and (p_search is null or u.email ilike '%' || p_search || '%' or u.phone ilike '%' || p_search || '%')
  limit 500
$$;
revoke all on function public.admin_auth_users(text, uuid[]) from public, anon, authenticated;
grant execute on function public.admin_auth_users(text, uuid[]) to service_role;
