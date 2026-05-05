-- EverDraft initial Supabase platform schema.
--
-- This migration prepares the future story-sharing data model only. It does
-- not add public login, dashboards, story submission, or reader UI.

create extension if not exists pgcrypto with schema extensions;

-- Keep updated_at fields fresh on records that are edited over time.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles are public-facing reader/writer identities linked to Supabase Auth.
create table public.profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text,
  pen_name text,
  role text not null default 'reader',
  bio text,
  avatar_url text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint profiles_user_id_key unique (user_id),
  constraint profiles_role_check check (role in ('reader', 'writer', 'both', 'admin'))
);

create index profiles_user_id_idx on public.profiles(user_id);
create index profiles_role_idx on public.profiles(role);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

-- Stories hold metadata even when readable chapter content is hidden.
--
-- Publication Mode:
-- - none: no external publication mode is active.
-- - kdp: Kindle Direct Publishing or a similar external book listing.
-- - kdp_select: Kindle Unlimited / KDP Select mode.
-- - other: another publishing or exclusivity arrangement.
--
-- is_readable controls public chapter readability. In KDP Select / Kindle
-- Unlimited mode, EverDraft can keep the story landing page visible while
-- hiding readable chapter content by setting is_readable = false.
create table public.stories (
  id uuid primary key default extensions.gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  slug text not null,
  blurb text,
  genre text,
  status text not null default 'draft',
  cover_url text,
  banner_url text,
  is_readable boolean not null default true,
  publication_mode text not null default 'none',
  external_book_url text,
  published_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint stories_slug_key unique (slug),
  constraint stories_status_check check (status in ('draft', 'ongoing', 'complete', 'hiatus', 'archived')),
  constraint stories_publication_mode_check check (publication_mode in ('none', 'kdp', 'kdp_select', 'other'))
);

create index stories_author_id_idx on public.stories(author_id);
create index stories_status_idx on public.stories(status);
create index stories_publication_mode_idx on public.stories(publication_mode);

create trigger set_stories_updated_at
before update on public.stories
for each row
execute function public.set_updated_at();

-- Chapters hold the actual story content and can be published independently.
create table public.chapters (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  title text not null,
  chapter_number integer not null,
  content text,
  status text not null default 'draft',
  published_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint chapters_story_chapter_number_key unique (story_id, chapter_number),
  constraint chapters_chapter_number_check check (chapter_number > 0),
  constraint chapters_status_check check (status in ('draft', 'published', 'hidden', 'archived'))
);

create index chapters_story_id_idx on public.chapters(story_id);
create index chapters_status_idx on public.chapters(status);

create trigger set_chapters_updated_at
before update on public.chapters
for each row
execute function public.set_updated_at();

-- Story follows are separate from writer follows because a reader may want
-- updates for one specific work without following the author's full profile.
create table public.story_follows (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  constraint story_follows_story_user_key unique (story_id, user_id)
);

create index story_follows_story_id_idx on public.story_follows(story_id);
create index story_follows_user_id_idx on public.story_follows(user_id);

-- Writer follows are profile-level follows for future writer updates, Writer's
-- Nook activity, launch announcements, and new story notifications.
create table public.writer_follows (
  id uuid primary key default extensions.gen_random_uuid(),
  writer_id uuid not null references public.profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  constraint writer_follows_writer_user_key unique (writer_id, user_id),
  constraint writer_follows_no_self_follow_check check (writer_id <> user_id)
);

create index writer_follows_writer_id_idx on public.writer_follows(writer_id);
create index writer_follows_user_id_idx on public.writer_follows(user_id);

-- Comments are chapter-level feedback. feedback_type stays optional so the UI
-- can later offer categories such as encouragement, pacing, character, plot,
-- clarity, grammar, or emotional_reaction.
create table public.comments (
  id uuid primary key default extensions.gen_random_uuid(),
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  comment text not null,
  feedback_type text,
  created_at timestamp with time zone not null default now(),
  constraint comments_feedback_type_check check (
    feedback_type is null
    or feedback_type in (
      'encouragement',
      'pacing',
      'character',
      'plot',
      'clarity',
      'grammar',
      'emotional_reaction'
    )
  )
);

create index comments_chapter_id_idx on public.comments(chapter_id);
create index comments_user_id_idx on public.comments(user_id);
create index comments_feedback_type_idx on public.comments(feedback_type);

-- Ratings are story-level and completion-gated. A trigger below enforces that
-- ratings can only be created or moved onto stories with status = 'complete'.
create table public.ratings (
  id uuid primary key default extensions.gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null,
  review_text text,
  created_at timestamp with time zone not null default now(),
  constraint ratings_story_user_key unique (story_id, user_id),
  constraint ratings_rating_check check (rating between 1 and 5)
);

create index ratings_story_id_idx on public.ratings(story_id);
create index ratings_user_id_idx on public.ratings(user_id);
create index ratings_rating_idx on public.ratings(rating);

create or replace function public.ensure_rating_story_is_complete()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.stories
    where id = new.story_id
      and status = 'complete'
  ) then
    raise exception 'Ratings are only allowed for completed stories.';
  end if;

  return new;
end;
$$;

create trigger ensure_rating_story_is_complete
before insert or update of story_id on public.ratings
for each row
execute function public.ensure_rating_story_is_complete();

create or replace function public.ensure_rated_story_stays_complete()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'complete'
    and new.status <> 'complete'
    and exists (
      select 1
      from public.ratings
      where ratings.story_id = new.id
    )
  then
    raise exception 'Stories with ratings must remain complete unless ratings are removed first.';
  end if;

  return new;
end;
$$;

create trigger ensure_rated_story_stays_complete
before update of status on public.stories
for each row
execute function public.ensure_rated_story_stays_complete();

-- Enable Row Level Security on every public table. Supabase exposes the public
-- schema through the Data API, so tables must not rely on app code alone.
alter table public.profiles enable row level security;
alter table public.stories enable row level security;
alter table public.chapters enable row level security;
alter table public.story_follows enable row level security;
alter table public.writer_follows enable row level security;
alter table public.comments enable row level security;
alter table public.ratings enable row level security;

-- profiles: Public readers can see public profile information.
create policy "Public can read profiles"
on public.profiles
for select
to anon, authenticated
using (true);

-- profiles: Authenticated users can create exactly their own profile row.
create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = user_id);

-- profiles: Authenticated users can update their own profile, but not move it
-- onto another auth user.
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- stories: Public users can read story metadata. This intentionally leaves
-- metadata visible even when is_readable = false for KDP Select or other modes.
create policy "Public can read story metadata"
on public.stories
for select
to anon, authenticated
using (true);

-- stories: Authenticated writers can create stories linked to their own writer
-- profile. The admin role is included for future moderation or staff tools.
create policy "Writers can create their own stories"
on public.stories
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = stories.author_id
      and profiles.user_id = (select auth.uid())
      and profiles.role in ('writer', 'both', 'admin')
  )
);

-- stories: Authors can update only their own stories.
create policy "Authors can update their own stories"
on public.stories
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = stories.author_id
      and profiles.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = stories.author_id
      and profiles.user_id = (select auth.uid())
  )
);

-- chapters: Public users can read published chapters only when the parent
-- story is readable. Draft and hidden chapters are not public.
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

-- chapters: Authors can read their own chapters regardless of chapter status
-- or story readability, so drafts and hidden content remain manageable.
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

-- chapters: Authors can create chapters for their own stories.
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

-- chapters: Authors can update chapters for their own stories.
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

-- chapters: Authors can delete chapters for their own stories.
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

-- story_follows: Keep raw follow rows private to the authenticated follower.
-- Public aggregate follower counts can be added later through a view or RPC.
create policy "Users can read their own story follows"
on public.story_follows
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = story_follows.user_id
      and profiles.user_id = (select auth.uid())
  )
);

-- story_follows: Authenticated users can follow stories as their own profile.
create policy "Users can create their own story follows"
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
);

-- story_follows: Authenticated users can unfollow stories they followed.
create policy "Users can delete their own story follows"
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

-- writer_follows: Keep raw writer follow rows private to the authenticated
-- follower.
create policy "Users can read their own writer follows"
on public.writer_follows
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = writer_follows.user_id
      and profiles.user_id = (select auth.uid())
  )
);

-- writer_follows: Authenticated users can follow writers as their own profile.
-- The table-level check constraint prevents self-follows.
create policy "Users can create their own writer follows"
on public.writer_follows
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = writer_follows.user_id
      and profiles.user_id = (select auth.uid())
  )
);

-- writer_follows: Authenticated users can unfollow writers they followed.
create policy "Users can delete their own writer follows"
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

-- comments: Public users can read comments only on published chapters whose
-- parent story is currently readable.
create policy "Public can read comments on readable published chapters"
on public.comments
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.chapters
    join public.stories on stories.id = chapters.story_id
    where chapters.id = comments.chapter_id
      and chapters.status = 'published'
      and stories.is_readable = true
  )
);

-- comments: Authenticated users can comment as their own profile on public,
-- readable, published chapters.
create policy "Users can create their own comments"
on public.comments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = comments.user_id
      and profiles.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.chapters
    join public.stories on stories.id = chapters.story_id
    where chapters.id = comments.chapter_id
      and chapters.status = 'published'
      and stories.is_readable = true
  )
);

-- comments: Users can update only their own comments.
create policy "Users can update their own comments"
on public.comments
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = comments.user_id
      and profiles.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = comments.user_id
      and profiles.user_id = (select auth.uid())
  )
);

-- comments: Users can delete only their own comments.
create policy "Users can delete their own comments"
on public.comments
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = comments.user_id
      and profiles.user_id = (select auth.uid())
  )
);

-- ratings: Public users can read ratings and reviews.
create policy "Public can read ratings"
on public.ratings
for select
to anon, authenticated
using (true);

-- ratings: Authenticated users can create ratings only as their own profile and
-- only for completed stories. The trigger enforces the completed-story rule too.
create policy "Users can create ratings for complete stories"
on public.ratings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = ratings.user_id
      and profiles.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.stories
    where stories.id = ratings.story_id
      and stories.status = 'complete'
  )
);

-- ratings: Users can update only their own ratings, and a rating must remain
-- attached to a completed story.
create policy "Users can update their own ratings"
on public.ratings
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = ratings.user_id
      and profiles.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = ratings.user_id
      and profiles.user_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.stories
    where stories.id = ratings.story_id
      and stories.status = 'complete'
  )
);

-- ratings: Users can delete only their own ratings.
create policy "Users can delete their own ratings"
on public.ratings
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = ratings.user_id
      and profiles.user_id = (select auth.uid())
  )
);

comment on table public.stories is
  'Story metadata remains public even when readable chapter content is hidden through is_readable or publication_mode.';
comment on column public.stories.is_readable is
  'Controls whether published chapters can be publicly read. Set false for KDP Select / Kindle Unlimited style exclusivity.';
comment on column public.stories.publication_mode is
  'Publication path: none, kdp, kdp_select, or other. kdp_select represents Kindle Unlimited / KDP Select mode.';
comment on table public.story_follows is
  'Readers following one specific story for chapter or completion updates.';
comment on table public.writer_follows is
  'Readers following a writer profile for future author-level updates.';
comment on table public.ratings is
  'Story-level ratings and reviews. Enforced for completed stories only.';
