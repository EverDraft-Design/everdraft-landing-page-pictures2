-- Phase 5 Story Journey foundation.
--
-- Journey Milestones preserve meaningful story transformations without
-- creating duplicate Library entries. They are not version history; they are
-- author-controlled records of discoveries, rewrites, and growth.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.story_journey_milestones (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  reflection text,
  visibility text not null default 'private',
  word_count integer not null default 0,
  snapshot jsonb not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint story_journey_milestones_visibility_check check (visibility in ('private', 'public')),
  constraint story_journey_milestones_word_count_check check (word_count >= 0)
);

create index if not exists story_journey_milestones_story_id_idx on public.story_journey_milestones(story_id);
create index if not exists story_journey_milestones_author_id_idx on public.story_journey_milestones(author_id);
create index if not exists story_journey_milestones_visibility_idx on public.story_journey_milestones(visibility);
create index if not exists story_journey_milestones_created_at_idx on public.story_journey_milestones(created_at);

drop trigger if exists set_story_journey_milestones_updated_at on public.story_journey_milestones;
create trigger set_story_journey_milestones_updated_at
before update on public.story_journey_milestones
for each row
execute function public.set_updated_at();

create table if not exists public.journey_badge_events (
  id uuid primary key default extensions.gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid references public.stories(id) on delete cascade,
  milestone_id uuid references public.story_journey_milestones(id) on delete cascade,
  badge_key text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create index if not exists journey_badge_events_profile_id_idx on public.journey_badge_events(profile_id);
create index if not exists journey_badge_events_story_id_idx on public.journey_badge_events(story_id);
create index if not exists journey_badge_events_badge_key_idx on public.journey_badge_events(badge_key);

alter table public.story_journey_milestones enable row level security;
alter table public.journey_badge_events enable row level security;

grant select on table public.story_journey_milestones to anon, authenticated;
grant insert, update, delete on table public.story_journey_milestones to authenticated;
grant select, insert on table public.journey_badge_events to authenticated;

drop policy if exists "Public can read public Story Journey milestones" on public.story_journey_milestones;
drop policy if exists "Authors can read their Story Journey milestones" on public.story_journey_milestones;
drop policy if exists "Authors can create Story Journey milestones" on public.story_journey_milestones;
drop policy if exists "Authors can update Story Journey milestones" on public.story_journey_milestones;
drop policy if exists "Authors can delete Story Journey milestones" on public.story_journey_milestones;

create policy "Public can read public Story Journey milestones"
on public.story_journey_milestones
for select
to anon, authenticated
using (
  visibility = 'public'
  and exists (
    select 1
    from public.stories
    where stories.id = story_journey_milestones.story_id
      and stories.is_readable = true
      and stories.status in ('ongoing', 'complete')
  )
);

create policy "Authors can read their Story Journey milestones"
on public.story_journey_milestones
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = story_journey_milestones.author_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Authors can create Story Journey milestones"
on public.story_journey_milestones
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    join public.stories on stories.author_id = profiles.id
    where profiles.id = story_journey_milestones.author_id
      and profiles.user_id = (select auth.uid())
      and stories.id = story_journey_milestones.story_id
  )
);

create policy "Authors can update Story Journey milestones"
on public.story_journey_milestones
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = story_journey_milestones.author_id
      and profiles.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.profiles
    join public.stories on stories.author_id = profiles.id
    where profiles.id = story_journey_milestones.author_id
      and profiles.user_id = (select auth.uid())
      and stories.id = story_journey_milestones.story_id
  )
);

create policy "Authors can delete Story Journey milestones"
on public.story_journey_milestones
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = story_journey_milestones.author_id
      and profiles.user_id = (select auth.uid())
  )
);

drop policy if exists "Members can read their Journey badge events" on public.journey_badge_events;
drop policy if exists "Members can create their Journey badge events" on public.journey_badge_events;

create policy "Members can read their Journey badge events"
on public.journey_badge_events
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = journey_badge_events.profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Members can create their Journey badge events"
on public.journey_badge_events
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = journey_badge_events.profile_id
      and profiles.user_id = (select auth.uid())
  )
);