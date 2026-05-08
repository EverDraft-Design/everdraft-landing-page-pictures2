-- Phase 4 Notes, Pinboard, and Sparks.
--
-- EverDraft is not opening public comments or reviews in this phase.
-- This migration creates private Notes for writers, public Spark counts, and
-- removes old public comment read policies from the unused comments table.
--
-- Ownership relationship used throughout:
--   auth.uid() -> profiles.user_id -> profiles.id
--   profiles.id -> stories.author_id
--   stories.id -> chapters.story_id

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.notes (
  id uuid primary key default extensions.gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  from_profile_id uuid not null references public.profiles(id) on delete cascade,
  writer_profile_id uuid not null references public.profiles(id) on delete cascade,
  note_type text not null default 'encouragement',
  note text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint notes_type_check check (
    note_type in (
      'encouragement',
      'reader_reaction',
      'character_thought',
      'plot_thought',
      'pacing_thought',
      'clarity_note',
      'tiny_typo'
    )
  ),
  constraint notes_reader_not_writer_check check (from_profile_id <> writer_profile_id)
);

create index if not exists notes_chapter_id_idx on public.notes(chapter_id);
create index if not exists notes_story_id_idx on public.notes(story_id);
create index if not exists notes_from_profile_id_idx on public.notes(from_profile_id);
create index if not exists notes_writer_profile_id_idx on public.notes(writer_profile_id);
create index if not exists notes_note_type_idx on public.notes(note_type);

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
before update on public.notes
for each row
execute function public.set_updated_at();

create table if not exists public.story_sparks (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  constraint story_sparks_story_profile_key unique (story_id, profile_id)
);

create index if not exists story_sparks_story_id_idx on public.story_sparks(story_id);
create index if not exists story_sparks_profile_id_idx on public.story_sparks(profile_id);

create table if not exists public.chapter_sparks (
  id uuid primary key default extensions.gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  constraint chapter_sparks_chapter_profile_key unique (chapter_id, profile_id)
);

create index if not exists chapter_sparks_chapter_id_idx on public.chapter_sparks(chapter_id);
create index if not exists chapter_sparks_story_id_idx on public.chapter_sparks(story_id);
create index if not exists chapter_sparks_profile_id_idx on public.chapter_sparks(profile_id);

alter table public.notes enable row level security;
alter table public.story_sparks enable row level security;
alter table public.chapter_sparks enable row level security;

-- New public tables may not be exposed to Supabase's Data API automatically.
-- Grants expose the tables; RLS below still controls which rows are visible.
grant select, insert, delete on table public.notes to authenticated;
grant select on table public.story_sparks to anon, authenticated;
grant insert, delete on table public.story_sparks to authenticated;
grant select on table public.chapter_sparks to anon, authenticated;
grant insert, delete on table public.chapter_sparks to authenticated;

-- The legacy comments table is not used for Phase 4. Remove public comment
-- behavior without dropping the table or deleting existing data.
drop policy if exists "Public can read comments on readable published chapters" on public.comments;
drop policy if exists "Users can create their own comments" on public.comments;
drop policy if exists "Users can update their own comments" on public.comments;
drop policy if exists "Users can delete their own comments" on public.comments;

drop policy if exists "Writers can read Notes addressed to them" on public.notes;
drop policy if exists "Readers can read Notes they left" on public.notes;
drop policy if exists "Readers can create private Notes" on public.notes;
drop policy if exists "Readers can delete Notes they left" on public.notes;

create policy "Writers can read Notes addressed to them"
on public.notes
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = notes.writer_profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Readers can read Notes they left"
on public.notes
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = notes.from_profile_id
      and profiles.user_id = (select auth.uid())
  )
);

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
    where chapters.id = notes.chapter_id
      and chapters.story_id = notes.story_id
      and chapters.status = 'published'
      and stories.is_readable = true
      and stories.author_id = notes.writer_profile_id
  )
);

create policy "Readers can delete Notes they left"
on public.notes
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = notes.from_profile_id
      and profiles.user_id = (select auth.uid())
  )
);

drop policy if exists "Public can read story Sparks for counts" on public.story_sparks;
drop policy if exists "Members can create their own story Sparks" on public.story_sparks;
drop policy if exists "Members can delete their own story Sparks" on public.story_sparks;

create policy "Public can read story Sparks for counts"
on public.story_sparks
for select
to anon, authenticated
using (true);

create policy "Members can create their own story Sparks"
on public.story_sparks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = story_sparks.profile_id
      and profiles.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.stories
    where stories.id = story_sparks.story_id
      and stories.is_readable = true
      and stories.author_id <> story_sparks.profile_id
  )
);

create policy "Members can delete their own story Sparks"
on public.story_sparks
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = story_sparks.profile_id
      and profiles.user_id = (select auth.uid())
  )
);

drop policy if exists "Public can read chapter Sparks for counts" on public.chapter_sparks;
drop policy if exists "Members can create their own chapter Sparks" on public.chapter_sparks;
drop policy if exists "Members can delete their own chapter Sparks" on public.chapter_sparks;

create policy "Public can read chapter Sparks for counts"
on public.chapter_sparks
for select
to anon, authenticated
using (true);

create policy "Members can create their own chapter Sparks"
on public.chapter_sparks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = chapter_sparks.profile_id
      and profiles.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.chapters
    join public.stories on stories.id = chapters.story_id
    where chapters.id = chapter_sparks.chapter_id
      and chapters.story_id = chapter_sparks.story_id
      and chapters.status = 'published'
      and stories.is_readable = true
      and stories.author_id <> chapter_sparks.profile_id
  )
);

create policy "Members can delete their own chapter Sparks"
on public.chapter_sparks
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = chapter_sparks.profile_id
      and profiles.user_id = (select auth.uid())
  )
);
