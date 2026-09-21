import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const requiredFiles = [
  'supabase/migrations/011_pinboard_replies_notifications.sql',
  'supabase/migrations/012_make_note_replies_final.sql',
  'everdraft-site/engagement.js',
  'everdraft-site/account/index.html',
  'everdraft-site/account/account.js',
  'everdraft-site/account/pinboard/index.html',
  'everdraft-site/account/pinboard/pinboard.js',
  'everdraft-site/story/chapter/index.html',
  'everdraft-site/story/chapter/chapter-public.js'
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `${file} should exist`);
}

const migration = read(requiredFiles[0]);
assert.match(migration, /create table if not exists public\.note_replies/i);
assert.match(migration, /note_id uuid not null unique references public\.notes\(id\) on delete cascade/i);
assert.match(migration, /create table if not exists public\.notifications/i);
assert.match(migration, /notification_type in \('pinboard_note'\)/i);
assert.match(migration, /alter table public\.note_replies enable row level security/i);
assert.match(migration, /alter table public\.notifications enable row level security/i);
assert.match(migration, /Note participants can read replies/i);
assert.match(migration, /Writers can create replies to their Notes/i);
assert.match(migration, /Members can read their notifications/i);
assert.match(migration, /grant update \(read_at\) on table public\.notifications/i);
assert.match(migration, /create or replace function public\.notify_writer_of_new_note\(\)/i);
assert.match(migration, /after insert on public\.notes/i);
assert.match(migration, /on conflict \(note_id, notification_type\) do nothing/i);
assert.doesNotMatch(migration, /drop table|truncate|delete from|service_role/i);

const engagement = read('everdraft-site/engagement.js');
for (const helper of [
  'saveNoteReply',
  'deleteNoteReply',
  'getMyNotesForChapter',
  'getUnreadPinboardNotificationCount',
  'markPinboardNotificationsRead'
]) {
  assert.match(engagement, new RegExp(`export async function ${helper}\\(`));
}
assert.match(engagement, /\.from\('note_replies'\)/);
assert.match(engagement, /\.from\('notifications'\)/);
assert.match(engagement, /notification_type', 'pinboard_note'/);
assert.match(engagement, /\.from\('note_replies'\)[\s\S]*\.insert\(/);
assert.doesNotMatch(engagement, /\.from\('note_replies'\)[\s\S]*\.upsert\(/);

const finalReplyMigration = read('supabase/migrations/012_make_note_replies_final.sql');
assert.match(finalReplyMigration, /revoke update on table public\.note_replies from authenticated/i);
assert.match(finalReplyMigration, /drop policy if exists "Writers can update their Note replies"/i);
assert.doesNotMatch(finalReplyMigration, /drop table|truncate|delete from/i);

const pinboard = read('everdraft-site/account/pinboard/pinboard.js');
assert.match(pinboard, /saveNoteReply/);
assert.match(pinboard, /deleteNoteReply/);
assert.match(pinboard, /markPinboardNotificationsRead/);
assert.match(pinboard, /Send Reply/);
assert.match(pinboard, /Remove Reply/);
assert.match(pinboard, /can be removed but not edited/);
assert.doesNotMatch(pinboard, /Update Reply|EDIT YOUR REPLY/);
assert.match(pinboard, /replyPreview/);
assert.match(pinboard, /reply-status-badge">Replied/);

const accountHtml = read('everdraft-site/account/index.html');
const accountJs = read('everdraft-site/account/account.js');
assert.match(accountHtml, /data-notification-count/);
assert.match(accountHtml, /notification-link/);
assert.match(accountJs, /getUnreadPinboardNotificationCount/);

const chapterHtml = read('everdraft-site/story/chapter/index.html');
const chapterJs = read('everdraft-site/story/chapter/chapter-public.js');
assert.match(chapterHtml, /noteHistory/);
assert.match(chapterJs, /getMyNotesForChapter/);
assert.match(chapterJs, /WRITER REPLY/);
assert.match(chapterJs, /The writer has not replied yet/);

const styles = read('everdraft-site/styles.css');
assert.match(styles, /\.notification-count/);
assert.match(styles, /\.pinboard-reply/);
assert.match(styles, /\.pinboard-reply-summary/);
assert.match(styles, /\.reply-status-badge/);
assert.match(styles, /\.reader-note-history/);
assert.match(styles, /\.writer-reply/);

const readme = read('README.md');
assert.match(readme, /Phase 5: Pinboard Replies and In-App Notifications/);
assert.match(readme, /011_pinboard_replies_notifications\.sql/);
assert.match(readme, /Existing Notes are preserved/);

console.log('Phase 5 Pinboard reply and notification checks passed.');
