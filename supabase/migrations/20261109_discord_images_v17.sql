-- ATYOM V17 — Webhooks Discord chiffrés et publications par semaine/roster.
create table if not exists public.atyom_discord_channels (
 id uuid primary key default gen_random_uuid(),
 roster_id text not null references public.atyom_rosters(id) on delete cascade,
 label text not null check (char_length(trim(label)) between 2 and 60),
 webhook_id text not null check (webhook_id ~ '^[0-9]{15,24}$'),
 webhook_ciphertext text not null,
 discord_channel_id text,
 auto_programme boolean not null default true,
 auto_results boolean not null default true,
 created_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(roster_id,webhook_id)
);
create table if not exists public.atyom_discord_publications (
 channel_id uuid not null references public.atyom_discord_channels(id) on delete cascade,
 kind text not null check(kind in ('programme','results')),
 week_start date not null,
 message_id text not null check(message_id ~ '^[0-9]{15,24}$'),
 last_synced_at timestamptz,
 last_error text,
 updated_at timestamptz not null default now(),
 primary key(channel_id,kind,week_start)
);
create index if not exists atyom_discord_channels_roster on public.atyom_discord_channels(roster_id);
create index if not exists atyom_discord_publications_recent on public.atyom_discord_publications(week_start desc);
alter table public.atyom_discord_channels enable row level security;
alter table public.atyom_discord_publications enable row level security;
-- Pas de policy pour les clients ; seule la service role du serveur interroge ces tables.
