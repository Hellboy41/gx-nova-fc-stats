-- Installation ré-exécutable : ne jamais réinitialiser les droits déjà attribués.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_profiles' and column_name = 'access_scope'
  ) then
    alter table public.staff_profiles
      add column access_scope text not null default 'rosters',
      add column allowed_roster_ids text[] not null default '{}'::text[];
    -- Une seule fois : les comptes préexistants gardent leur accès global.
    update public.staff_profiles
      set access_scope = 'structure', allowed_roster_ids = '{}'::text[];
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.staff_profiles'::regclass and conname='staff_profiles_access_scope_check') then
    alter table public.staff_profiles add constraint staff_profiles_access_scope_check
      check (access_scope in ('structure','rosters'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.staff_profiles'::regclass and conname='staff_profiles_admin_scope_check') then
    alter table public.staff_profiles add constraint staff_profiles_admin_scope_check
      check (role <> 'admin' or access_scope='structure');
  end if;
end $$;
-- La politique RLS SELECT sur son propre profil reste inchangée.
