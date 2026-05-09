-- EverDraft member access role cleanup.
--
-- Every signed-in EverDraft member can use normal account/profile and private
-- story tools. Keep profiles.role as a legacy/internal column for backward
-- compatibility, but stop using reader/writer/both as an access gate.

create schema if not exists private;

alter table public.profiles
alter column role set default 'reader';

-- Users should not be able to promote themselves to admin, or change any
-- legacy role value, through browser profile updates.
create or replace function public.prevent_profile_role_self_change()
returns trigger
language plpgsql
as $$
begin
  if old.role is distinct from new.role
    and (select auth.uid()) = old.user_id
  then
    new.role = old.role;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_role_self_change on public.profiles;

create trigger prevent_profile_role_self_change
before update on public.profiles
for each row
execute function public.prevent_profile_role_self_change();

-- New Auth users no longer send or need intended_role metadata. The database
-- role column keeps its legacy default internally.
create or replace function private.create_everdraft_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_username text;
  profile_display_name text;
begin
  profile_username := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));

  if profile_username !~ '^[a-z0-9_-]{3,30}$' then
    raise exception 'EverDraft username is required and must be 3-30 lowercase URL-safe characters.';
  end if;

  profile_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    profile_username
  );

  insert into public.profiles (
    user_id,
    username,
    display_name,
    pen_name,
    bio
  )
  values (
    new.id,
    profile_username,
    profile_display_name,
    profile_display_name,
    ''
  )
  on conflict (user_id) do update
  set
    username = coalesce(public.profiles.username, excluded.username),
    display_name = excluded.display_name,
    pen_name = coalesce(nullif(public.profiles.pen_name, ''), excluded.pen_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists create_everdraft_profile_after_auth_signup on auth.users;

create trigger create_everdraft_profile_after_auth_signup
after insert on auth.users
for each row
execute function private.create_everdraft_profile_for_auth_user();

-- Normal story creation is member-owned, not role-owned.
drop policy if exists "Writers can create their own stories" on public.stories;
drop policy if exists "Members can create their own stories" on public.stories;

create policy "Members can create their own stories"
on public.stories
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = stories.author_id
      and profiles.user_id = (select auth.uid())
  )
);
