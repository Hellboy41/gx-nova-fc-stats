-- V24 : modèles de soirées indépendants par roster, jamais de scores ni de compositions.
create table if not exists public.programme_evening_templates (
  id uuid primary key default gen_random_uuid(),
  roster_id text not null,
  name varchar(80) not null,
  slots jsonb not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programme_evening_templates_slots_array check (jsonb_typeof(slots) = 'array'),
  constraint programme_evening_templates_name_nonempty check (char_length(trim(name)) >= 2)
);
create unique index if not exists programme_evening_templates_unique_roster_name
  on public.programme_evening_templates (roster_id, lower(name));
create index if not exists programme_evening_templates_roster_idx
  on public.programme_evening_templates (roster_id, updated_at desc);

-- Toutes les opérations passent par les routes serveur contrôlant le rôle et le roster.
alter table public.programme_evening_templates enable row level security;
revoke all on public.programme_evening_templates from anon, authenticated;
