-- Résultats enregistrés hors EA, séparés des performances joueurs et des matchs importés.
create table if not exists public.atyom_manual_results (
 roster_id text not null references public.atyom_rosters(id) on delete cascade,
 event_id text not null check(char_length(event_id) between 1 and 80),
 scheduled_event_id uuid references public.atyom_roster_events(id) on delete cascade,
 event_date date not null,
 event_time time without time zone,
 opponent_name text not null check(char_length(trim(opponent_name)) between 1 and 120),
 competition text not null default 'Compétition',
 goals_for smallint not null check(goals_for between 0 and 99),
 goals_against smallint not null check(goals_against between 0 and 99),
 result text generated always as (case when goals_for>goals_against then 'V' when goals_for<goals_against then 'D' else 'N' end) stored,
 kind text not null check(kind in ('forfeit','administrative')),
 created_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),
 primary key(roster_id,event_id),
 constraint forfeit_non_draw check(kind<>'forfeit' or goals_for<>goals_against),
 constraint result_event_link check(scheduled_event_id is null or event_id=scheduled_event_id::text)
);
create index if not exists atyom_manual_results_recent on public.atyom_manual_results(roster_id,event_date desc);
alter table public.atyom_manual_results enable row level security;
