-- EverDraft story ownership RLS repair.
--
-- public.stories.author_id references public.profiles.id, not auth.users.id.
-- Logged-in members should be able to create and update stories only through
-- their own profile row, regardless of legacy reader/writer/both role values.

alter table public.stories enable row level security;

-- Keep the table available through Supabase's Data API while RLS controls rows.
grant select on table public.stories to anon, authenticated;
grant insert, update on table public.stories to authenticated;

-- Remove older or conflicting story policies before recreating the intended
-- public-read and owner-write model. This is non-destructive to story data.
drop policy if exists "Public can read story metadata" on public.stories;
drop policy if exists "Writers can create their own stories" on public.stories;
drop policy if exists "Members can create their own stories" on public.stories;
drop policy if exists "Authors can update their own stories" on public.stories;

-- Story metadata is currently public by design; public story reading pages are
-- still not built in Phase 2A.
create policy "Public can read story metadata"
on public.stories
for select
to anon, authenticated
using (true);

-- New stories must be linked to the signed-in member's public profile id.
create policy "Members can create their own stories"
on public.stories
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and author_id in (
    select profiles.id
    from public.profiles
    where profiles.user_id = (select auth.uid())
  )
);

-- Existing stories can only be updated by the member who owns the author
-- profile. The with check repeats the same ownership constraint so author_id
-- cannot be moved to another profile through an update.
create policy "Authors can update their own stories"
on public.stories
for update
to authenticated
using (
  (select auth.uid()) is not null
  and author_id in (
    select profiles.id
    from public.profiles
    where profiles.user_id = (select auth.uid())
  )
)
with check (
  (select auth.uid()) is not null
  and author_id in (
    select profiles.id
    from public.profiles
    where profiles.user_id = (select auth.uid())
  )
);
