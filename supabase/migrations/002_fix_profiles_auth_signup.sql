-- EverDraft Phase 1A signup hardening.
--
-- This migration is safe to run after the initial schema. It preserves existing
-- data, keeps profiles linked through profiles.user_id -> auth.users.id, and
-- makes the profile RLS policies explicit for the signup/account flow.

-- Prevent future blank display names while allowing existing beta test rows to
-- remain until they are reviewed and cleaned manually.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_display_name_present'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_display_name_present
    check (display_name is not null and length(btrim(display_name)) > 0)
    not valid;
  end if;
end;
$$;

-- Keep the role contract explicit for future projects where the initial
-- migration may have been edited by hand.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_present'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_role_present
    check (role in ('reader', 'writer', 'both', 'admin'))
    not valid;
  end if;
end;
$$;

-- RLS fix: profile ownership must compare profiles.user_id to auth.uid().
-- profiles.id is an internal profile id and should not be used as the Auth id.
drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
