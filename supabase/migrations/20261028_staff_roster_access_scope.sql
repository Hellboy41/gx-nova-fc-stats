-- Conserver les droits des membres existants, restreindre par défaut les nouveaux comptes.
alter table public.staff_profiles
  add column if not exists access_scope text not null default 'rosters',
  add column if not exists allowed_roster_ids text[] not null default '{}'::text[];

-- Migration non destructive : les membres actuels restent autorisés sur toute ATYOM.
update public.staff_profiles set access_scope = 'structure', allowed_roster_ids = '{}'
where access_scope = 'rosters' and cardinality(allowed_roster_ids) = 0;

alter table public.staff_profiles
  add constraint staff_profiles_access_scope_check check (access_scope in ('structure','rosters')),
  add constraint staff_profiles_admin_scope_check check (role <> 'admin' or access_scope = 'structure');

-- Même politique SELECT existante : chacun ne lit que son profil; API admin via serveur.
