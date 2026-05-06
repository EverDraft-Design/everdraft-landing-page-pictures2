import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const requiredFiles = [
  'everdraft-site/chapters.js',
  'everdraft-site/my/stories/show/index.html',
  'everdraft-site/my/stories/show/story-show.js',
  'everdraft-site/my/stories/chapters/new/index.html',
  'everdraft-site/my/stories/chapters/new/new-chapter.js',
  'everdraft-site/my/stories/chapters/edit/index.html',
  'everdraft-site/my/stories/chapters/edit/edit-chapter.js',
  'everdraft-site/story/index.html',
  'everdraft-site/story/story-public.js',
  'everdraft-site/story/chapter/index.html',
  'everdraft-site/story/chapter/chapter-public.js',
  'supabase/migrations/007_fix_chapter_ownership_rls.sql'
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `${file} should exist`);
}

const chaptersHelper = read('everdraft-site/chapters.js');
for (const exportName of [
  'getStoryForCurrentAuthor',
  'getChaptersForAuthorStory',
  'getChapterForAuthor',
  'createChapter',
  'updateChapter',
  'archiveChapter',
  'getPublicStoryBySlug',
  'getPublicPublishedChaptersForStory',
  'getPublicChapterBySlugAndNumber'
]) {
  assert.match(chaptersHelper, new RegExp(`export async function ${exportName}\\b`), `${exportName} should be exported`);
}

assert.match(chaptersHelper, /getStoryByIdForAuthor/);
assert.match(chaptersHelper, /story\.author_id !== profile\.id/);
assert.match(chaptersHelper, /status === 'published'/);
assert.match(chaptersHelper, /published_at = new Date\(\)\.toISOString\(\)/);
assert.doesNotMatch(chaptersHelper, /service_role|profiles\.role in|author_id = user\.id|auth\.user/);

const myStoriesIndex = read('everdraft-site/my/stories/stories-index.js');
assert.equal(myStoriesIndex.includes('/my/stories/${story.id}/'), true, 'My Stories should link to story management');
assert.equal(myStoriesIndex.includes('/my/stories/${story.id}/edit/'), true, 'My Stories should retain edit details link');

const storyShowHtml = read('everdraft-site/my/stories/show/index.html');
const storyShowJs = read('everdraft-site/my/stories/show/story-show.js');
assert.match(storyShowJs, /This story is waiting for its first chapter\./);
assert.match(storyShowJs, /\/my\/stories\/chapters\/new\/\?storyId=/);
assert.match(storyShowJs, /\/my\/stories\/chapters\/edit\/\?storyId=/);
assert.match(storyShowHtml, /Add Chapter/);
assert.match(storyShowHtml, /Edit Details/);

const newChapterHtml = read('everdraft-site/my/stories/chapters/new/index.html');
const newChapterJs = read('everdraft-site/my/stories/chapters/new/new-chapter.js');
const editChapterHtml = read('everdraft-site/my/stories/chapters/edit/index.html');
const editChapterJs = read('everdraft-site/my/stories/chapters/edit/edit-chapter.js');
assert.match(newChapterJs, /URLSearchParams\(window\.location\.search\)\.get\('storyId'\)/);
assert.match(editChapterJs, /params\.get\('storyId'\)/);
assert.match(editChapterJs, /params\.get\('chapterId'\)/);
for (const source of [newChapterHtml, editChapterHtml]) {
  for (const field of ['chapterNumber', 'title', 'content', 'status']) {
    assert.match(source, new RegExp(`name="${field}"`), `${field} should be present`);
  }
  for (const status of ['draft', 'published', 'hidden', 'archived']) {
    assert.match(source, new RegExp(`value="${status}"`), `${status} status should be present`);
  }
  assert.doesNotMatch(source, /comment|follow|rating|badge|payment|Writer's Nook|Publication Mode|KDP/i);
}

const publicStoryHtml = read('everdraft-site/story/index.html');
const publicChapterHtml = read('everdraft-site/story/chapter/index.html');
assert.match(publicStoryHtml, /This story is not currently readable on EverDraft\./);
assert.match(publicStoryHtml, /chapterList/);
assert.match(publicChapterHtml, /previousChapterLink/);
assert.match(publicChapterHtml, /nextChapterLink/);
assert.match(publicChapterHtml, /backToStoryLink/);

const worker = read('src/index.js');
for (const routePattern of [
  'isStoryManageRoute',
  'isChapterNewRoute',
  'isChapterEditRoute',
  'isPublicStoryRoute',
  'isPublicChapterRoute'
]) {
  assert.match(worker, new RegExp(routePattern), `${routePattern} should be routed`);
}

const migration007 = read('supabase/migrations/007_fix_chapter_ownership_rls.sql');
assert.match(migration007, /public\.chapters enable row level security/);
assert.match(migration007, /Public can read published readable chapters/);
assert.match(migration007, /Authors can read their own chapters/);
assert.match(migration007, /Authors can create chapters for their stories/);
assert.match(migration007, /Authors can update chapters for their stories/);
assert.match(migration007, /Authors can delete chapters for their stories/);
assert.match(migration007, /profiles\.user_id = \(select auth\.uid\(\)\)/);
assert.doesNotMatch(migration007, /profiles\.role in|chapters\.story_id = \(select auth\.uid\(\)\)/);

const readme = read('README.md');
assert.match(readme, /Phase 2B/);
assert.match(readme, /\/story\/:slug/);
assert.match(readme, /007_fix_chapter_ownership_rls\.sql/);

console.log('Phase 2B chapter and public reading checks passed.');
