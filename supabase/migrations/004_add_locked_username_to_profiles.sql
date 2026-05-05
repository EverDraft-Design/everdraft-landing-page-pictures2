-- EverDraft locked public username support.
--
-- Usernames are stable public handles for accountability before story posting,
-- comments, ratings, and feedback are opened. Existing beta rows may keep a
-- null username until the account page prompts the user to set one once.

alter table public.profiles
add column if not exists username text;

create schema if not exists private;

create unique index if not exists profiles_username_key
on public.profiles(username)
where username is not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_format'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
    add constraint profiles_username_format
    check (username is null or username ~ '^[a-z0-9_-]{3,30}$')
    not valid;
  end if;
end;
$$;

-- Prevent username changes once a profile has one. Existing beta users with a
-- null username can set it once from /account or /onboarding.
create or replace function public.prevent_profile_username_change()
returns trigger
language plpgsql
as $$
begin
  if old.username is not null and new.username is distinct from old.username then
    raise exception 'Profile username cannot be changed after creation.';
  end if;

  if new.username is not null then
    new.username = lower(btrim(new.username));
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_username_change on public.profiles;

create trigger prevent_profile_username_change
before update on public.profiles
for each row
execute function public.prevent_profile_username_change();

-- Update the Auth signup trigger from migration 003 so new Auth users get a
-- username-backed profile even when email confirmation prevents an immediate
-- browser session.
create or replace function private.create_everdraft_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_username text;
  profile_display_name text;
  profile_role text;
begin
  profile_username := lower(btrim(coalesce(new.raw_user_meta_data ->> 'username', '')));

  if profile_username !~ '^[a-z0-9_-]{3,30}$' then
    raise exception 'EverDraft username is required and must be 3-30 lowercase URL-safe characters.';
  end if;

  profile_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    profile_username
  );

  profile_role := case
    when new.raw_user_meta_data ->> 'intended_role' in ('reader', 'writer', 'both')
      then new.raw_user_meta_data ->> 'intended_role'
    else 'reader'
  end;

  insert into public.profiles (
    user_id,
    username,
    display_name,
    pen_name,
    role,
    bio
  )
  values (
    new.id,
    profile_username,
    profile_display_name,
    profile_display_name,
    profile_role,
    ''
  )
  on conflict (user_id) do update
  set
    username = coalesce(public.profiles.username, excluded.username),
    display_name = excluded.display_name,
    pen_name = coalesce(nullif(public.profiles.pen_name, ''), excluded.pen_name),
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists create_everdraft_profile_after_auth_signup on auth.users;

create trigger create_everdraft_profile_after_auth_signup
after insert on auth.users
for each row
execute function private.create_everdraft_profile_for_auth_user();
