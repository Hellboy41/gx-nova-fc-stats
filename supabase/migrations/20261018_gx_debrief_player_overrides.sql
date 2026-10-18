-- Débrief Studio V2 : corrections staff par joueur et par match
-- Aucune modification de matches ou match_players. Les données EA restent sources.
create table if not exists public.debrief_player_overrides (
  club_id text not null,
  match_id bigint not null references public.matches(id) on delete cascade,
  player_name text not null,
  overrides jsonb not null default '{}'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint debrief_player_overrides_pk primary key (club_id, match_id, player_name),
  constraint debrief_player_overrides_object check (jsonb_typeof(overrides) = 'object')
);
create index if not exists debrief_player_overrides_match_idx
  on public.debrief_player_overrides (match_id);
alter table public.debrief_player_overrides enable row level security;
-- Pas de politique accessible aux rôles anon/authenticated.
-- Authentification et vérification du rôle par requireActiveStaff ; accès DB via service role.
