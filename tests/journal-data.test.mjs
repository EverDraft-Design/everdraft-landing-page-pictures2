import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const journalHtml = read('everdraft-site/journal/index.html');
const journalDataSource = read('everdraft-site/assets/journal-data.js');
const { featuredArticle, journalArticles } = await import('../everdraft-site/assets/journal-data.js');

assert.match(journalHtml, /id="journal-grid"/);
assert.match(journalHtml, /type="module" src="\/assets\/journal-data\.js"/);
assert.match(journalHtml, /data-filter="all"/);
assert.match(journalHtml, /data-filter="everdraft-notes"/);
assert.match(journalHtml, /data-filter="writers-lantern"/);
assert.doesNotMatch(journalHtml, /<article class="journal-card">/);

assert.match(journalDataSource, /ADD NEW JOURNAL ARTICLES BELOW THIS LINE/);
assert.match(journalDataSource, /Copy one full article block, paste it underneath/);
assert.match(journalDataSource, /VALID_CATEGORY_SLUGS/);
assert.match(journalDataSource, /isValidArticle/);

assert.equal(featuredArticle.category, 'FEATURED NOTE');
assert.equal(featuredArticle.url, '/journal/featured-article');

assert.equal(journalArticles.length, 6);
assert.deepEqual(
  journalArticles.map((article) => article.title),
  [
    'Write, Grow, Connect',
    'What to Do With a Story Sitting in Google Docs',
    'Where Can I Find Support as a Writer?',
    'Where Can I Share My Unfinished Story?',
    'How Do I Get Feedback on My Writing?',
    'The First Draft of EverDraft'
  ]
);

assert.deepEqual(
  journalArticles.map((article) => article.url),
  [
    '/journal/write-grow-connect',
    '/journal/story-sitting-in-google-docs',
    '/journal/writer-support',
    '/journal/share-unfinished-story',
    '/journal/get-feedback-on-writing',
    '/journal/first-draft-of-everdraft'
  ]
);

for (const article of journalArticles) {
  assert.ok(article.category);
  assert.ok(['everdraft-notes', 'writers-lantern'].includes(article.categorySlug));
  assert.ok(article.title);
  assert.ok(article.date);
  assert.ok(article.excerpt);
  assert.ok(article.url.startsWith('/journal/'));
}

assert.deepEqual(
  journalArticles.map((article) => article.categorySlug),
  [
    'everdraft-notes',
    'writers-lantern',
    'writers-lantern',
    'writers-lantern',
    'writers-lantern',
    'everdraft-notes'
  ]
);

assert.match(journalDataSource, /card\.dataset\.category\s*=\s*article\.categorySlug/);
assert.match(journalDataSource, /setupJournalFilters/);
assert.match(journalDataSource, /filterButton\.classList\.toggle\('is-active'/);
assert.match(journalDataSource, /filterButton\.classList\.toggle\('active'/);
assert.match(journalDataSource, /aria-pressed/);
assert.match(journalDataSource, /card\.hidden\s*=\s*selectedFilter !== 'all'/);

console.log('Journal data checks passed.');
