-- Phase 4 writer comfort setting for private Reader Notes.
--
-- Notes remain private and existing Notes are preserved. This adds a
-- default-on profile setting so writers can turn new Reader Notes off while
-- keeping Sparks active. The Notes insert policy is recreated to enforce the
-- setting at the database layer as well as in the browser UI.

alter table public.profiles
add column if not exists notes_enabled boolean not null default true;

drop policy if exists "Readers can create private Notes" on public.notes;

create policy "Readers can create private Notes"
on public.notes
for insert
to authenticated
with check (
  from_profile_id <> writer_profile_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = notes.from_profile_id
      and profiles.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.chapters
    join public.stories on stories.id = chapters.story_id
    join public.profiles as writer_profile on writer_profile.id = stories.author_id
    where chapters.id = notes.chapter_id
      and chapters.story_id = notes.story_id
      and chapters.status = 'published'
      and stories.is_readable = true
      and stories.author_id = notes.writer_profile_id
      and writer_profile.notes_enabled = true
  )
);
