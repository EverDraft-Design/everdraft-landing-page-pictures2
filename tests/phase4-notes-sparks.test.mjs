import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const requiredFiles = [
  'everdraft-site/engagement.js',
  'everdraft-site/spark-controls.js',
  'everdraft-site/account/pinboard/index.html',
  'everdraft-site/account/pinboard/pinboard.js',
  'everdraft-site/library/library.js',
  'everdraft-site/story/story-public.js',
  'everdraft-site/story/chapter/index.html',
  'everdraft-site/story/chapter/chapter-public.js',
  'everdraft-site/account/index.html',
  'everdraft-site/account/account.js',
  'everdraft-site/my/stories/show/story-show.js',
  'supabase/migrations/009_phase4_notes_sparks.sql'
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `${file} should exist`);
}

const engagement = read('everdraft-site/engagement.js');
for (const helper of [
  'getStorySparkCount',
  'hasCurrentUserSparkedStory',
  'sparkStory',
  'unsparkStory',
  'toggleStorySpark',
  'getChapterSparkCount',
  'hasCurrentUserSparkedChapter',
  'sparkChapter',
  'unsparkChapter',
  'toggleChapterSpark',
  'createChapterNote',
  'getMyPinboardNotes',
  'getNoteSummaryForStory'
]) {
  assert.match(engagement, new RegExp(`export async function ${helper}\\(`), `${helper} should be exported`);
}
assert.match(engagement, /\.from\('notes'\)/);
assert.match(engagement, /\.from\('story_sparks'\)/);
assert.match(engagement, /\.from\('chapter_sparks'\)/);
assert.match(engagement, /sparkChapter\(chapterId\)/);
assert.match(engagement, /Please complete your account profile before leaving Notes or Sparks\./);
assert.match(engagement, /Notes are for readers/);
assert.doesNotMatch(engagement, /service_role|secret|token|review|rating|comment/i);

const sparkControls = read('everdraft-site/spark-controls.js');
assert.match(sparkControls, /export async function mountStorySparkControl/);
assert.match(sparkControls, /export async function mountChapterSparkControl/);
assert.match(sparkControls, /Add Spark/);
assert.match(sparkControls, /Remove Spark/);
assert.match(sparkControls, /Sign in to Spark/);
assert.match(sparkControls, /spark-control/);
assert.match(sparkControls, /sparked/);
assert.doesNotMatch(sparkControls, /heart|like|review|rating|comment|service_role|secret|token/i);

const libraryJs = read('everdraft-site/library/library.js');
assert.match(libraryJs, /from '\/spark-controls\.js'/);
assert.match(libraryJs, /mountStorySparkControl/);
assert.match(libraryJs, /library-spark-control/);
assert.doesNotMatch(libraryJs, /Follow Writer|Unfollow Writer|writer follower|review|rating|comment/i);

const storyPublic = read('everdraft-site/story/story-public.js');
assert.match(storyPublic, /from '\/spark-controls\.js'/);
assert.match(storyPublic, /mountStorySparkControl/);
assert.match(storyPublic, /storySparkControl/);
assert.doesNotMatch(storyPublic, /Follow Writer|Unfollow Writer|writer follower|review|rating|comment/i);

const chapterHtml = read('everdraft-site/story/chapter/index.html');
assert.match(chapterHtml, /chapterSparkControl/);
assert.match(chapterHtml, /noteForm/);
assert.match(chapterHtml, /Leave a Note/);
assert.match(chapterHtml, /Notes are only visible to the writer/);
assert.doesNotMatch(chapterHtml, /comment|review|rating/i);

const chapterPublic = read('everdraft-site/story/chapter/chapter-public.js');
assert.match(chapterPublic, /from '\/spark-controls\.js'/);
assert.match(chapterPublic, /mountChapterSparkControl/);
assert.match(chapterPublic, /createChapterNote/);
assert.match(chapterPublic, /Your Note has been pinned to the writer’s Pinboard, with a Spark attached\./);
assert.match(chapterPublic, /Sign in to leave a Note/);
assert.match(chapterPublic, /This is your chapter/);
assert.doesNotMatch(chapterPublic, /review|rating|comment/i);

const pinboardHtml = read('everdraft-site/account/pinboard/index.html');
assert.match(pinboardHtml, /Pinboard/);
assert.match(pinboardHtml, /pinboardList/);
assert.match(pinboardHtml, /Reader Notes/);
assert.doesNotMatch(pinboardHtml, /dashboard|comment|review|rating/i);

const pinboardJs = read('everdraft-site/account/pinboard/pinboard.js');
assert.match(pinboardJs, /getMyPinboardNotes/);
assert.match(pinboardJs, /note_type/);
assert.match(pinboardJs, /from_profile/);
assert.match(pinboardJs, /No Notes yet/);
assert.doesNotMatch(pinboardJs, /email|service_role|secret|token|review|rating|comment/i);

const accountHtml = read('everdraft-site/account/index.html');
assert.match(accountHtml, /\/account\/pinboard\//);
assert.match(accountHtml, /Pinboard/);

const accountJs = read('everdraft-site/account/account.js');
assert.match(accountJs, /pinboardSummary/);
assert.match(accountJs, /getMyPinboardNotes/);

const storyShow = read('everdraft-site/my/stories/show/story-show.js');
assert.match(storyShow, /getNoteSummaryForStory/);
assert.match(storyShow, /Sparks/);
assert.match(storyShow, /Notes/);

const migration = read('supabase/migrations/009_phase4_notes_sparks.sql');
assert.match(migration, /create table if not exists public\.notes/i);
assert.match(migration, /create table if not exists public\.story_sparks/i);
assert.match(migration, /create table if not exists public\.chapter_sparks/i);
assert.match(migration, /unique \(story_id, profile_id\)/i);
assert.match(migration, /unique \(chapter_id, profile_id\)/i);
assert.match(migration, /alter table public\.notes enable row level security/i);
assert.match(migration, /grant select on table public\.story_sparks to anon, authenticated/i);
assert.match(migration, /grant select on table public\.chapter_sparks to anon, authenticated/i);
assert.match(migration, /Writers can read Notes addressed to them/i);
assert.match(migration, /Readers can create private Notes/i);
assert.match(migration, /profiles\.user_id = \(select auth\.uid\(\)\)/);
assert.match(migration, /drop policy if exists "Public can read comments on readable published chapters"/);
assert.doesNotMatch(migration, /drop table|truncate|delete from|service_role/i);

const worker = read('src/index.js');
assert.match(worker, /isPinboardRoute/);
assert.match(worker, /\/account\/pinboard\/index\.html/);
assert.match(worker, /pinboardPage/);

const readme = read('README.md');
assert.match(readme, /Phase 4/);
assert.match(readme, /Notes are private to writers/);
assert.match(readme, /Pinboard/);
assert.match(readme, /Sparks are public encouragement counts/);
assert.match(readme, /supabase\/migrations\/009_phase4_notes_sparks\.sql/);
assert.match(readme, /not ratings or reviews/i);

const styles = read('everdraft-site/styles.css');
assert.match(styles, /\.spark-control/);
assert.match(styles, /\.note-panel/);
assert.match(styles, /\.pinboard-card/);

console.log('Phase 4 Notes, Pinboard, and Sparks checks passed.');
