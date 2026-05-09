-- Phase 3 follows: allow public follower counts while keeping writes owned.
--
-- Follow rows use public.profiles ids:
--   auth.uid() -> profiles.user_id -> profiles.id -> story_follows.user_id
--   auth.uid() -> profiles.user_id -> profiles.id -> writer_follows.user_id
--
-- The browser never writes Auth user ids into these tables and never uses a
-- service key. Story self-follows are blocked by checking stories.author_id
-- against the follower profile id. Writer self-follows remain blocked by the
-- table check constraint and the insert policy below.

alter table public.story_follows enable row level security;
alter table public.writer_follows enable row level security;

grant select on table public.story_follows to anon, authenticated;
grant insert, delete on table public.story_follows to authenticated;
grant select on table public.writer_follows to anon, authenticated;
grant insert, delete on table public.writer_follows to authenticated;

drop policy if exists "Users can read their own story follows" on public.story_follows;
drop policy if exists "Users can create their own story follows" on public.story_follows;
drop policy if exists "Users can delete their own story follows" on public.story_follows;
drop policy if exists "Public can read story follows for counts" on public.story_follows;
drop policy if exists "Members can create their own story follows" on public.story_follows;
drop policy if exists "Members can delete their own story follows" on public.story_follows;

create policy "Public can read story follows for counts"
on public.story_follows
for select
to anon, authenticated
using (true);

create policy "Members can create their own story follows"
on public.story_follows
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = story_follows.user_id
      and profiles.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.stories
    where stories.id = story_follows.story_id
      and stories.author_id <> story_follows.user_id
  )
);

create policy "Members can delete their own story follows"
on public.story_follows
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = story_follows.user_id
      and profiles.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can read their own writer follows" on public.writer_follows;
drop policy if exists "Users can create their own writer follows" on public.writer_follows;
drop policy if exists "Users can delete their own writer follows" on public.writer_follows;
drop policy if exists "Public can read writer follows for counts" on public.writer_follows;
drop policy if exists "Members can create their own writer follows" on public.writer_follows;
drop policy if exists "Members can delete their own writer follows" on public.writer_follows;

alter table public.writer_follows
  drop constraint if exists writer_follows_no_self_follow_check;

alter table public.writer_follows
  add constraint writer_follows_no_self_follow_check
  check (writer_id <> user_id)
  not valid;

create policy "Public can read writer follows for counts"
on public.writer_follows
for select
to anon, authenticated
using (true);

create policy "Members can create their own writer follows"
on public.writer_follows
for insert
to authenticated
with check (
  writer_id <> user_id
  and exists (
    select 1
    from public.profiles
    where profiles.id = writer_follows.user_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Members can delete their own writer follows"
on public.writer_follows
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = writer_follows.user_id
      and profiles.user_id = (select auth.uid())
  )
);
