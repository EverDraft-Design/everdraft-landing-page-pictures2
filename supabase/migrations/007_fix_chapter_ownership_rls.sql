-- EverDraft chapter ownership RLS repair.
--
-- public.chapters belongs to public.stories through chapters.story_id.
-- public.stories.author_id references public.profiles.id, and profiles.user_id
-- references auth.users.id. Chapter ownership must therefore be checked through
-- the parent story, not through auth.users.id directly.

alter table public.chapters enable row level security;

-- Keep chapters available through Supabase's Data API while RLS limits rows.
grant select on table public.chapters to anon, authenticated;
grant insert, update, delete on table public.chapters to authenticated;

drop policy if exists "Public can read published readable chapters" on public.chapters;
drop policy if exists "Authors can read their own chapters" on public.chapters;
drop policy if exists "Authors can create chapters for their stories" on public.chapters;
drop policy if exists "Authors can update chapters for their stories" on public.chapters;
drop policy if exists "Authors can delete chapters for their stories" on public.chapters;

-- Public readers can only read published chapters on stories that are currently
-- readable on EverDraft. Draft, hidden, and archived chapters remain private.
create policy "Public can read published readable chapters"
on public.chapters
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.stories
    where stories.id = chapters.story_id
      and stories.is_readable = true
  )
);

-- Authors can read all chapters for stories owned by their profile.
create policy "Authors can read their own chapters"
on public.chapters
for select
to authenticated
using (
  exists (
    select 1
    from public.stories
    join public.profiles on profiles.id = stories.author_id
    where stories.id = chapters.story_id
      and profiles.user_id = (select auth.uid())
  )
);

-- Authors can create chapters only under stories owned by their profile.
create policy "Authors can create chapters for their stories"
on public.chapters
for insert
to authenticated
with check (
  exists (
    select 1
    from public.stories
    join public.profiles on profiles.id = stories.author_id
    where stories.id = chapters.story_id
      and profiles.user_id = (select auth.uid())
  )
);

-- Authors can update chapters only under stories owned by their profile, and
-- cannot move a chapter onto another user's story through an update.
create policy "Authors can update chapters for their stories"
on public.chapters
for update
to authenticated
using (
  exists (
    select 1
    from public.stories
    join public.profiles on profiles.id = stories.author_id
    where stories.id = chapters.story_id
      and profiles.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.stories
    join public.profiles on profiles.id = stories.author_id
    where stories.id = chapters.story_id
      and profiles.user_id = (select auth.uid())
  )
);

-- Deletion is not exposed in Phase 2B UI, but the policy remains owner-only
-- for future cleanup tools and to match the initial schema intent.
create policy "Authors can delete chapters for their stories"
on public.chapters
for delete
to authenticated
using (
  exists (
    select 1
    from public.stories
    join public.profiles on profiles.id = stories.author_id
    where stories.id = chapters.story_id
      and profiles.user_id = (select auth.uid())
  )
);
