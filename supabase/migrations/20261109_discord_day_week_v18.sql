-- ATYOM V18: une publication distincte par jour/semaine et par type, sans casser les messages hebdomadaires existants.
alter table public.atyom_discord_publications
  add column if not exists period text not null default 'week';
alter table public.atyom_discord_publications
  add column if not exists date_key date;
update public.atyom_discord_publications set date_key=week_start where date_key is null;
alter table public.atyom_discord_publications alter column date_key set not null;
alter table public.atyom_discord_publications
  add constraint atyom_discord_publications_period_check check (period in ('day','week'));
alter table public.atyom_discord_publications drop constraint atyom_discord_publications_pkey;
alter table public.atyom_discord_publications
  add primary key (channel_id,kind,period,date_key);
create index if not exists atyom_discord_publications_refresh_idx
  on public.atyom_discord_publications(channel_id,week_start,kind,period,date_key);
alter table public.atyom_discord_publications enable row level security;
