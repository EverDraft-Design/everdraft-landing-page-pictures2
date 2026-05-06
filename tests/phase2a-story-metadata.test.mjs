import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const storiesHelper = read('everdraft-site/stories.js');
const storiesIndex = read('everdraft-site/my/stories/stories-index.js');
const myStoriesHtml = read('everdraft-site/my/stories/index.html');
const newStoryHtml = read('everdraft-site/my/stories/new/index.html');
const editStoryHtml = read('everdraft-site/my/stories/edit/index.html');
const editStoryJs = read('everdraft-site/my/stories/edit/edit-story.js');
const worker = read('src/index.js');
const readme = read('README.md');
const migration005 = read('supabase/migrations/005_remove_member_role_gate.sql');

assert.match(myStoriesHtml, /My Stories/);
assert.match(newStoryHtml, /Create Story/);
assert.match(editStoryHtml, /Edit Story/);

assert.match(storiesIndex, /story\.slug/);
assert.match(storiesIndex, /Your shelf is waiting for its first draft\./);
assert.equal(storiesIndex.includes('/my/stories/${story.id}/edit/'), true);
assert.doesNotMatch(storiesIndex, /preview/i);

for (const source of [newStoryHtml, editStoryHtml]) {
  for (const field of ['title', 'slug', 'blurb', 'genre', 'status', 'coverUrl', 'bannerUrl']) {
    assert.match(source, new RegExp(`name="${field}"`), `${field} should be present`);
  }
  for (const status of ['draft', 'ongoing', 'complete', 'hiatus', 'archived']) {
    assert.match(source, new RegExp(`value="${status}"`), `${status} status should be present`);
  }
  assert.doesNotMatch(source, /publication_mode|kdp|kdp_select|Manage Chapters|Preview Story/i);
}

assert.match(storiesHelper, /author_id: profile\.id/);
assert.doesNotMatch(storiesHelper, /auth\.user|user\.id.*author_id|profiles\.role in|writer', 'both/);
assert.match(storiesHelper, /publication_mode: 'none'/);
assert.match(storiesHelper, /is_readable: true/);
assert.match(storiesHelper, /\.eq\('author_id', profile\.id\)/);
assert.match(storiesHelper, /function cleanStoryPayload/);

assert.doesNotMatch(editStoryJs, /chapter|preview/i);
assert.doesNotMatch(worker, /chapterEditPage|storyPreviewPage|isChapterEditRoute|isStoryPreviewRoute|chapters\/edit|\/preview\//);

assert.match(migration005, /drop policy if exists "Writers can create their own stories"/);
assert.match(migration005, /create policy "Members can create their own stories"/);
assert.doesNotMatch(migration005, /profiles\.role in \('writer', 'both'/);

assert.match(readme, /Phase 2A/);
assert.doesNotMatch(readme, /Phase 2B|Phase 2C|chapter management|author preview links/i);

console.log('Phase 2A story metadata checks passed.');
