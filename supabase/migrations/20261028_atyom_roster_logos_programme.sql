-- Logos indépendants et programmation de chaque nouveau roster ATYOM.
alter table public.atyom_rosters add column if not exists logo_path text;
create table if not exists public.atyom_roster_events (
  id uuid primary key default gen_random_uuid(),
  roster_id text not null references public.atyom_rosters(id) on delete cascade,
  event_date date not null,
  event_time time without time zone not null,
  competition text not null check (char_length(trim(competition)) between 2 and 90),
  opponent_name text not null check (char_length(trim(opponent_name)) between 2 and 120),
  event_type text not null default 'competition' check (event_type in ('competition','tournament','friendly')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(roster_id,event_date,event_time)
);
create index if not exists atyom_roster_events_date on public.atyom_roster_events(roster_id,event_date,event_time);
alter table public.atyom_roster_events enable row level security;
-- Interdiction de lire les événements directement depuis une session client ; API serveur seulement.
