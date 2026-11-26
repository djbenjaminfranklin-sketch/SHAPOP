-- Articles de luxe contre les contrefaçons (26/11/2026, règle validée par Benjamin).
-- Luxe = prix ≥ 500 € (ou l'équivalent, conversion fixe) OU grande marque OU case cochée par le vendeur.
-- Publication refusée sans certification d'authenticité (date + vendeur enregistrés par la base).
-- Même règle que server/src/luxury.ts (liste des marques et taux : garder les deux alignés ;
-- le test luxury.test.ts vérifie que ce fichier contient bien la liste du serveur).

alter table public.items
  add column if not exists is_luxury boolean not null default false,
  add column if not exists brand text,
  add column if not exists authenticity_certified_at timestamptz,
  add column if not exists authenticity_certified_by uuid;

alter table public.orders
  add column if not exists is_luxury boolean not null default false,
  add column if not exists counterfeit_penalty numeric,
  add column if not exists penalty_deducted numeric not null default 0;

-- Pénalité en attente (50 % du prix d'un faux), prélevée sur les prochains versements du vendeur
alter table public.sellers
  add column if not exists penalty_due numeric not null default 0,
  add column if not exists penalty_currency text;

-- Faux confirmé par l'équipe : date de la décision + preuves à conserver (jamais supprimées)
alter table public.disputes
  add column if not exists counterfeit_confirmed_at timestamptz,
  add column if not exists evidence_retained boolean not null default false;

-- Devise du pays du vendeur (comme currencyForCountry côté serveur)
create or replace function public.shapop_currency_for_country(c text) returns text
language sql immutable set search_path = public as $$
  select case
    when upper(coalesce(c,'')) in ('AT','BE','CY','DE','EE','ES','FI','FR','GR','HR','IE','IT','LT','LU','LV','MT','NL','PT','SI','SK','MC','AD','SM','VA','ME','XK') then 'EUR'
    when upper(c) = 'IL' then 'ILS' when upper(c) = 'US' then 'USD' when upper(c) = 'GB' then 'GBP'
    when upper(c) = 'CH' then 'CHF' when upper(c) = 'CA' then 'CAD' when upper(c) = 'AU' then 'AUD'
    when upper(c) = 'RU' then 'RUB' when upper(c) = 'UA' then 'UAH' when upper(c) = 'JP' then 'JPY'
    when upper(c) = 'CN' then 'CNY' when upper(c) = 'IN' then 'INR' when upper(c) = 'BR' then 'BRL'
    when upper(c) = 'MX' then 'MXN' when upper(c) = 'AE' then 'AED' when upper(c) = 'MA' then 'MAD'
    when upper(c) = 'TR' then 'TRY' when upper(c) = 'PL' then 'PLN' when upper(c) = 'SE' then 'SEK'
    when upper(c) = 'NO' then 'NOK' when upper(c) = 'DK' then 'DKK' when upper(c) = 'CZ' then 'CZK'
    when upper(c) = 'HU' then 'HUF' when upper(c) = 'RO' then 'RON' when upper(c) = 'ZA' then 'ZAR'
    else 'USD' end
$$;

-- Seuil « luxe » (500 €) dans la devise, conversion simple et fixe (comme EUR_RATES côté serveur)
create or replace function public.shapop_luxury_threshold(cur text) returns numeric
language sql immutable set search_path = public as $$
  select 500 * case upper(coalesce(cur,'USD'))
    when 'EUR' then 1 when 'ILS' then 4 when 'USD' then 1.1 when 'GBP' then 0.85 when 'CHF' then 0.95
    when 'CAD' then 1.5 when 'AUD' then 1.7 when 'RUB' then 100 when 'UAH' then 45 when 'JPY' then 165
    when 'CNY' then 8 when 'INR' then 95 when 'BRL' then 6 when 'MXN' then 20 when 'AED' then 4
    when 'MAD' then 11 when 'TRY' then 40 when 'PLN' then 4.3 when 'SEK' then 11.5 when 'NOK' then 12
    when 'DKK' then 7.5 when 'CZK' then 25 when 'HUF' then 400 when 'RON' then 5 when 'ZAR' then 20
    else 1.1 end
$$;

-- Grande marque de luxe dans le texte (mot entier, sans tenir compte des majuscules ni des accents)
create or replace function public.shapop_has_luxury_brand(t text) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(
    translate(lower(coalesce(t,'')), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿё’`', 'aaaaaaceeeeiiiinooooouuuuyyе''''')
      ~ $re$(^|[^[:alnum:]])(louis ?vuitton|לואי ויטון|луи виттон|chanel|שאנל|шанель|hermes|הרמס|эрмес|гермес|gucci|גוצ['׳]?י|гуччи|dior|דיור|диор|prada|פראדה|прада|miu ?miu|balenciaga|בלנסיאגה|баленсиага|saint ?-?laurent|ysl|סן לורן|сен-?лоран|celine|fendi|פנדי|фенди|bottega ?veneta|givenchy|живанши|valentino|versace|ורסאצ['׳]?ה|версаче|burberry|ברברי|барберри|loewe|moncler|монклер|off-white|offwhite|dolce ?(&|and|e) ?gabbana|d&g|mc ?queen|louboutin|לובוטן|лубутен|goyard|balmain|chrome ?hearts|rolex|רולקס|ролекс|cartier|קרטייה|картье|audemars ?piguet|patek ?philippe|patek|richard ?mille|vacheron|jaeger ?-?le ?coultre|hublot|omega(?! ?-?3)|breitling|tag ?heuer|iwc|panerai|chopard|piaget|van ?cleef|bulgari|bvlgari|булгари|tiffany|boucheron|harry ?winston|messika|montblanc)($|[^[:alnum:]])$re$,
    false)
$$;

-- Garde-fou en base : aucune mise en vente d'un article de luxe sans certification d'authenticité,
-- quel que soit le chemin (serveur, appli, ancienne version de l'appli).
create or replace function public.items_luxury_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cur text;
begin
  if tg_op = 'UPDATE'
     and new.title is not distinct from old.title
     and new.description is not distinct from old.description
     and new.brand is not distinct from old.brand
     and new.starting_price is not distinct from old.starting_price
     and new.buy_now_price is not distinct from old.buy_now_price
     and new.is_luxury is not distinct from old.is_luxury
     and new.status is not distinct from old.status
     and new.authenticity_certified_at is not distinct from old.authenticity_certified_at then
    return new;
  end if;

  -- Certification : la date et le vendeur sont fixés par la base, puis ne changent plus
  if tg_op = 'UPDATE' and old.authenticity_certified_at is not null then
    new.authenticity_certified_at := old.authenticity_certified_at;
    new.authenticity_certified_by := old.authenticity_certified_by;
  elsif new.authenticity_certified_at is not null then
    new.authenticity_certified_at := now();
    new.authenticity_certified_by := new.seller_id;
  end if;

  select public.shapop_currency_for_country(p.country) into cur from public.profiles p where p.id = new.seller_id;
  new.is_luxury := coalesce(new.is_luxury, false)
    or public.shapop_has_luxury_brand(concat_ws(' ', new.title, new.brand, new.description))
    or coalesce(new.starting_price, 0) >= public.shapop_luxury_threshold(cur)
    or coalesce(new.buy_now_price, 0) >= public.shapop_luxury_threshold(cur);

  if new.is_luxury and new.authenticity_certified_at is null and new.status in ('draft', 'pending', 'active') then
    raise exception 'authenticity_certification_required'
      using hint = 'Article de luxe : le vendeur doit certifier son authenticité avant la mise en vente.';
  end if;
  return new;
end
$$;

drop trigger if exists items_luxury_guard on public.items;
create trigger items_luxury_guard before insert or update on public.items
  for each row execute function public.items_luxury_guard();

revoke execute on function public.items_luxury_guard() from public, anon, authenticated;
