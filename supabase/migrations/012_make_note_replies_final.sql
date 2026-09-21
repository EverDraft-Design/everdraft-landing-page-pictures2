-- Make private writer replies final once sent.
-- Writers may remove a reply, but cannot rewrite it after the reader has seen it.

revoke update on table public.note_replies from authenticated;
drop policy if exists "Writers can update their Note replies" on public.note_replies;
