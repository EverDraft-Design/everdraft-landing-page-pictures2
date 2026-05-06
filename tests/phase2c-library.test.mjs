import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const requiredFiles = [
  'everdraft-site/library/index.html',
  'everdraft-site/library/library.js',
  'everdraft-site/stories.js',
  'everdraft-site/story/index.html',
  'everdraft-site/story/story-public.js'
];

for (const file of requiredFiles) {
  assert.equal(existsSync(file), true, `${file} should exist`);
}

const libraryHtml = read('everdraft-site/library/index.html');
assert.match(libraryHtml, /The EverDraft Library/);
assert.match(libraryHtml, /A quiet shelf for stories beginning to find their readers\./);
assert.match(libraryHtml, /The Library is opening gradually as EverDraft’s story tools are built\./);
assert.match(libraryHtml, /libraryList/);
assert.match(libraryHtml, /Join the Waitlist/);
assert.doesNotMatch(libraryHtml, /comment|follow|rating|badge|Storymark|payment|Writer's Nook|Publication Mode|KDP/i);

const libraryJs = read('everdraft-site/library/library.js');
assert.match(libraryJs, /getLibraryStories/);
assert.match(libraryJs, /The shelves are still being filled\./);
assert.match(libraryJs, /Stories will appear here as writers begin publishing chapters to EverDraft\./);
assert.match(libraryJs, /\/story\/\$\{story\.slug\}\//);
assert.match(libraryJs, /Read Story|View Story/);
assert.match(libraryJs, /chapter_count/);
assert.match(libraryJs, /pen_name \|\| author\.display_name \|\| author\.username \|\| 'EverDraft Writer'/);
assert.match(libraryJs, /library-cover-frame/);
assert.match(libraryJs, /library-cover-placeholder/);
assert.match(libraryJs, /story\.cover_url/);
assert.doesNotMatch(libraryJs, /story\.cover_url \|\| story\.banner_url/);
assert.doesNotMatch(libraryJs, /email|service_role|secret|token|comment|follow|rating|badge|Storymark|payment|Writer's Nook|Publication Mode|KDP/i);

const storiesHelper = read('everdraft-site/stories.js');
assert.match(storiesHelper, /export async function getLibraryStories\(\)/);
assert.match(storiesHelper, /\.in\('status', \['ongoing', 'complete'\]\)/);
assert.match(storiesHelper, /\.eq\('is_readable', true\)/);
assert.match(storiesHelper, /\.not\('title', 'is', null\)/);
assert.match(storiesHelper, /\.not\('slug', 'is', null\)/);
assert.match(storiesHelper, /id, username, display_name, pen_name/);
assert.match(storiesHelper, /status', 'published'/);
assert.doesNotMatch(storiesHelper, /email|service_role|profiles\.role in|auth\.user|user\.id.*author_id/);

const homepage = read('everdraft-site/index.html');
assert.match(homepage, /Join the Waitlist/);
assert.match(homepage, /href="\/library\/"/);
assert.doesNotMatch(homepage, /story feed|latest stories|browse all stories/i);

const accountHtml = read('everdraft-site/account/index.html');
const myStoriesHtml = read('everdraft-site/my/stories/index.html');
assert.match(accountHtml, /href="\/library\/"/);
assert.match(myStoriesHtml, /href="\/library\/"/);

const worker = read('src/index.js');
assert.match(worker, /isLibraryRoute/);
assert.match(worker, /libraryPage/);
assert.match(worker, /publicStoryPage/);
assert.match(worker, /publicChapterPage/);
assert.match(worker, /\/library\/index\.html/);

const readme = read('README.md');
assert.match(readme, /Phase 2C/);
assert.match(readme, /\/library/);
assert.match(readme, /ongoing/);
assert.match(readme, /complete/);
assert.match(readme, /is_readable = true/);
assert.match(readme, /no search yet/i);

const styles = read('everdraft-site/styles.css');
assert.match(styles, /library-cover-frame/);
assert.match(styles, /aspect-ratio:\s*2\s*\/\s*3/);
assert.match(styles, /object-fit:\s*contain/);
assert.match(styles, /library-card-body/);

console.log('Phase 2C Library checks passed.');
