-- Catalogue ATYOM : rosters contrôlés côté serveur, résultats nouveaux rosters isolés.
create table if not exists public.atyom_rosters (
  id text primary key,
  organisation_id text not null default 'atyom-pilot' check (organisation_id = 'atyom-pilot'),
  name text not null check (char_length(trim(name)) between 2 and 80),
  ea_club_id text not null unique check (ea_club_id ~ '^[1-9][0-9]{0,19}$'),
  game_edition text not null default 'FC27' check (char_length(trim(game_edition)) between 2 and 20),
  workspace_mode text not null default 'monitoring' check (workspace_mode in ('legacy','monitoring')),
  status text not null default 'active' check (status in ('active','archived')),
  primary_color text not null default '#22d3ee' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#facc15' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint atyom_legacy_id check (workspace_mode <> 'legacy' or (id = 'gx-nova-legacy' and ea_club_id = '1663')),
  constraint atyom_roster_id_shape check (id = 'gx-nova-legacy' or id ~ '^roster-[a-f0-9]{32}$')
);
create index if not exists atyom_rosters_org_status on public.atyom_rosters(organisation_id,status);
alter table public.atyom_rosters enable row level security;
insert into public.atyom_rosters(id,name,ea_club_id,game_edition,workspace_mode,status)
values('gx-nova-legacy','GX NØVA','1663','FC27','legacy','active')
on conflict(id) do nothing;
create table if not exists public.atyom_roster_results (
  roster_id text not null references public.atyom_rosters(id) on delete cascade,
  ea_match_id text not null,
  played_at timestamptz not null,
  opponent_name text not null,
  goals_for integer not null check(goals_for>=0),
  goals_against integer not null check(goals_against>=0),
  result text not null check(result in ('V','N','D')),
  imported_at timestamptz not null default now(),
  primary key(roster_id,ea_match_id)
);
create index if not exists atyom_roster_results_recency on public.atyom_roster_results(roster_id,played_at desc);
alter table public.atyom_roster_results enable row level security;
-- Sans policy directe : l'API utilise la service role après vérification du compte et du roster.
