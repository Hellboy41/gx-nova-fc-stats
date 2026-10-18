-- GX NOVA Débrief Studio V1. À appliquer sur Supabase avant de tester la sauvegarde.
-- Une entrée par soirée. Les données EA (matches, match_players) restent intactes.
create table if not exists public.evening_debriefs (
  id bigint generated always as identity primary key,
  club_id text not null,
  evening_date date not null,
  chapters jsonb not null default '[]'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint evening_debriefs_unique_evening unique (club_id, evening_date),
  constraint evening_debriefs_chapters_array check (jsonb_typeof(chapters) = 'array')
);

create index if not exists evening_debriefs_club_date_idx
  on public.evening_debriefs (club_id, evening_date desc);

alter table public.evening_debriefs enable row level security;
-- Pas de politique anon/authenticated : accès serveur exclusivement via la clé service role
-- après contrôle requireActiveStaff.
