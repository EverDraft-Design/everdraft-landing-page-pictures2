-- EverDraft Auth signup profile trigger.
--
-- Supabase Auth may create a user without returning an active browser session
-- when email confirmation is enabled. In that case, client-side RLS cannot
-- insert public.profiles yet because auth.uid() is not available in the
-- browser request. This trigger creates the profile inside Postgres as soon as
-- auth.users receives the new user.

create schema if not exists private;

-- Keep the expected profile shape intact if a beta column was removed while
-- testing in the Table Editor.
alter table public.profiles
add column if not exists avatar_url text;

create or replace function private.create_everdraft_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_display_name text;
  profile_role text;
begin
  profile_display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    new.email,
    'EverDraft reader'
  );

  profile_role := case
    when new.raw_user_meta_data ->> 'intended_role' in ('reader', 'writer', 'both')
      then new.raw_user_meta_data ->> 'intended_role'
    else 'reader'
  end;

  insert into public.profiles (
    user_id,
    display_name,
    pen_name,
    role,
    bio
  )
  values (
    new.id,
    profile_display_name,
    profile_display_name,
    profile_role,
    ''
  )
  on conflict (user_id) do update
  set
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

-- Backfill any beta Auth users that were created before this trigger existed.
-- This is non-destructive and will not overwrite existing profile rows.
insert into public.profiles (
  user_id,
  display_name,
  pen_name,
  role,
  bio
)
select
  users.id,
  coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'display_name'), ''),
    users.email,
    'EverDraft reader'
  ) as display_name,
  coalesce(
    nullif(btrim(users.raw_user_meta_data ->> 'display_name'), ''),
    users.email,
    'EverDraft reader'
  ) as pen_name,
  case
    when users.raw_user_meta_data ->> 'intended_role' in ('reader', 'writer', 'both')
      then users.raw_user_meta_data ->> 'intended_role'
    else 'reader'
  end as role,
  '' as bio
from auth.users
where not exists (
  select 1
  from public.profiles
  where profiles.user_id = users.id
)
on conflict (user_id) do nothing;

-- Keep profile ownership policies explicit for browser updates after login.
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
