import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const requiredFiles = [
  'everdraft-site/follows.js',
  'everdraft-site/follow-controls.js',
  'everdraft-site/library/library.js',
  'everdraft-site/story/index.html',
  'everdraft-site/story/story-public.js',
  'everdraft-site/story/chapter/index.html',
  'everdraft-site/story/chapter/chapter-public.js',
  'everdraft-site/account/index.html',
  'everdraft-site/account/account.js',
  'supabase/migrations/008_fix_follow_rls.sql'
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `${file} should exist`);
}

const follows = read('everdraft-site/follows.js');
for (const helper of [
  'followStory',
  'unfollowStory',
  'isFollowingStory',
  'getStoryFollowerCount',
  'followWriter',
  'unfollowWriter',
  'isFollowingWriter',
  'getWriterFollowerCount',
  'getMyFollowedStories',
  'getMyFollowedWriters'
]) {
  assert.match(follows, new RegExp(`export async function ${helper}\\(`), `${helper} should be exported`);
}
assert.match(follows, /\.from\('story_follows'\)/);
assert.match(follows, /\.from\('writer_follows'\)/);
assert.match(follows, /onConflict:\s*'story_id,user_id'/);
assert.match(follows, /onConflict:\s*'writer_id,user_id'/);
assert.match(follows, /writerProfileId === profile\.id/);
assert.match(follows, /Please sign in to continue\./);
assert.match(follows, /Please complete your account profile before following stories or writers\./);
assert.doesNotMatch(follows, /service_role|secret|token|profiles\.role|auth\.user|email/i);

const followControls = read('everdraft-site/follow-controls.js');
assert.match(followControls, /export async function mountFollowControls\(/);
assert.match(followControls, /Follow Story/);
assert.match(followControls, /Unfollow Story/);
assert.match(followControls, /Follow Writer/);
assert.match(followControls, /Unfollow Writer/);
assert.match(followControls, /Sign in to follow this story/);
assert.match(followControls, /Sign in to follow this writer/);
assert.match(followControls, /follow-compact-panel/);
assert.match(followControls, /follow-compact-buttons/);
assert.match(followControls, /follow-compact-counts/);
assert.match(followControls, /story\.author_id === currentProfile\.id/);
assert.match(followControls, /getStoryFollowerCount/);
assert.match(followControls, /getWriterFollowerCount/);
assert.doesNotMatch(followControls, /service_role|secret|token|profiles\.role|auth\.user|email/i);

const libraryJs = read('everdraft-site/library/library.js');
assert.match(libraryJs, /from '\/follow-controls\.js'/);
assert.match(libraryJs, /library-follow-controls/);
assert.match(libraryJs, /mountLibraryFollowControls/);
assert.match(libraryJs, /compact:\s*true/);
assert.match(libraryJs, /Read Story/);
assert.doesNotMatch(libraryJs, /comment|rating|badge|Storymark|payment|Writer's Nook|Publication Mode|KDP/i);

const storyHtml = read('everdraft-site/story/index.html');
assert.match(storyHtml, /storyFollowControls/);

const storyPublic = read('everdraft-site/story/story-public.js');
assert.match(storyPublic, /from '\/follow-controls\.js'/);
assert.match(storyPublic, /mountFollowControls\(storyFollowControls, story/);
assert.doesNotMatch(storyPublic, /comment|rating|badge|Storymark|payment|Writer's Nook|Publication Mode|KDP/i);

const chapterHtml = read('everdraft-site/story/chapter/index.html');
assert.match(chapterHtml, /chapterFollowControls/);

const chapterPublic = read('everdraft-site/story/chapter/chapter-public.js');
assert.match(chapterPublic, /from '\/follow-controls\.js'/);
assert.match(chapterPublic, /mountFollowControls\(chapterFollowControls, story/);
assert.doesNotMatch(chapterPublic, /comment|rating|badge|Storymark|payment|Writer's Nook|Publication Mode|KDP/i);

const accountHtml = read('everdraft-site/account/index.html');
assert.match(accountHtml, /followingStoriesList/);
assert.match(accountHtml, /followingWritersList/);
assert.match(accountHtml, /Followed Stories/);
assert.match(accountHtml, /Followed Writers/);

const accountJs = read('everdraft-site/account/account.js');
assert.match(accountJs, /getMyFollowedStories/);
assert.match(accountJs, /getMyFollowedWriters/);
assert.match(accountJs, /Stories you follow will appear here\./);
assert.match(accountJs, /Writers you follow will appear here\./);
assert.doesNotMatch(accountJs, /service_role|secret|token|profiles\.role|auth\.user|email.*follow/i);

const migration = read('supabase/migrations/008_fix_follow_rls.sql');
assert.match(migration, /alter table public\.story_follows enable row level security/i);
assert.match(migration, /alter table public\.writer_follows enable row level security/i);
assert.match(migration, /grant select on table public\.story_follows to anon, authenticated/i);
assert.match(migration, /grant select on table public\.writer_follows to anon, authenticated/i);
assert.match(migration, /writer_id <> user_id/);
assert.match(migration, /stories\.author_id <> story_follows\.user_id/);
assert.match(migration, /profiles\.user_id = \(select auth\.uid\(\)\)/);
assert.doesNotMatch(migration, /drop table|delete from|truncate|service_role/i);

const worker = read('src/index.js');
assert.match(worker, /storyFollowControls/);
assert.match(worker, /chapterFollowControls/);

const readme = read('README.md');
assert.match(readme, /Phase 3/);
assert.match(readme, /follow a story/i);
assert.match(readme, /follow a writer/i);
assert.match(readme, /\/library/);
assert.match(readme, /\/story\/:slug/);
assert.match(readme, /\/story\/:slug\/chapter\/:chapterNumber/);
assert.match(readme, /supabase\/migrations\/008_fix_follow_rls\.sql/);

const styles = read('everdraft-site/styles.css');
assert.match(styles, /\.follow-actions\.follow-actions-compact\s*\{/);
assert.match(styles, /grid-template-columns:\s*1fr/);
assert.match(styles, /follow-compact-buttons/);
assert.match(styles, /flex-wrap:\s*wrap/);
assert.match(styles, /follow-compact-counts/);

console.log('Phase 3 follow checks passed.');
