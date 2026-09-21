-- Private Pinboard replies and in-app notifications for new Reader Notes.
--
-- Replies remain visible only to the writer who received the Note and the
-- reader who sent it. Notifications are created only for Notes added after
-- this migration, so existing Pinboards do not become an unread backlog.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.note_replies (
  id uuid primary key default extensions.gen_random_uuid(),
  note_id uuid not null unique references public.notes(id) on delete cascade,
  writer_profile_id uuid not null references public.profiles(id) on delete cascade,
  reply text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint note_replies_reply_not_blank check (length(trim(reply)) > 0),
  constraint note_replies_reply_length check (char_length(reply) <= 2000)
);

create index if not exists note_replies_writer_profile_id_idx
on public.note_replies(writer_profile_id);

drop trigger if exists set_note_replies_updated_at on public.note_replies;
create trigger set_note_replies_updated_at
before update on public.note_replies
for each row
execute function public.set_updated_at();

create table if not exists public.notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  note_id uuid references public.notes(id) on delete cascade,
  notification_type text not null default 'pinboard_note',
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  constraint notifications_type_check check (notification_type in ('pinboard_note')),
  constraint notifications_note_type_unique unique (note_id, notification_type)
);

create index if not exists notifications_recipient_unread_idx
on public.notifications(recipient_profile_id, read_at, created_at desc);

alter table public.note_replies enable row level security;
alter table public.notifications enable row level security;

grant select, insert, update, delete on table public.note_replies to authenticated;
grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

drop policy if exists "Note participants can read replies" on public.note_replies;
drop policy if exists "Writers can create replies to their Notes" on public.note_replies;
drop policy if exists "Writers can update their Note replies" on public.note_replies;
drop policy if exists "Writers can delete their Note replies" on public.note_replies;

create policy "Note participants can read replies"
on public.note_replies
for select
to authenticated
using (
  exists (
    select 1
    from public.notes
    join public.profiles on profiles.user_id = (select auth.uid())
    where notes.id = note_replies.note_id
      and profiles.id in (notes.writer_profile_id, notes.from_profile_id)
  )
);

create policy "Writers can create replies to their Notes"
on public.note_replies
for insert
to authenticated
with check (
  exists (
    select 1
    from public.notes
    join public.profiles on profiles.id = notes.writer_profile_id
    where notes.id = note_replies.note_id
      and notes.writer_profile_id = note_replies.writer_profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Writers can update their Note replies"
on public.note_replies
for update
to authenticated
using (
  exists (
    select 1
    from public.notes
    join public.profiles on profiles.id = notes.writer_profile_id
    where notes.id = note_replies.note_id
      and notes.writer_profile_id = note_replies.writer_profile_id
      and profiles.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.notes
    join public.profiles on profiles.id = notes.writer_profile_id
    where notes.id = note_replies.note_id
      and notes.writer_profile_id = note_replies.writer_profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Writers can delete their Note replies"
on public.note_replies
for delete
to authenticated
using (
  exists (
    select 1
    from public.notes
    join public.profiles on profiles.id = notes.writer_profile_id
    where notes.id = note_replies.note_id
      and notes.writer_profile_id = note_replies.writer_profile_id
      and profiles.user_id = (select auth.uid())
  )
);

drop policy if exists "Members can read their notifications" on public.notifications;
drop policy if exists "Members can mark their notifications read" on public.notifications;

create policy "Members can read their notifications"
on public.notifications
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = notifications.recipient_profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create policy "Members can mark their notifications read"
on public.notifications
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = notifications.recipient_profile_id
      and profiles.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = notifications.recipient_profile_id
      and profiles.user_id = (select auth.uid())
  )
);

create or replace function public.notify_writer_of_new_note()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.notifications (
    recipient_profile_id,
    actor_profile_id,
    note_id,
    notification_type
  ) values (
    new.writer_profile_id,
    new.from_profile_id,
    new.id,
    'pinboard_note'
  )
  on conflict (note_id, notification_type) do nothing;

  return new;
end;
$$;

revoke all on function public.notify_writer_of_new_note() from public;

drop trigger if exists notify_writer_of_new_note on public.notes;
create trigger notify_writer_of_new_note
after insert on public.notes
for each row
execute function public.notify_writer_of_new_note();
