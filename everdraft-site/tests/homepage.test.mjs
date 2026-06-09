import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const projectUrl = new URL('../', import.meta.url);
const html = await readFile(new URL('index.html', projectUrl), 'utf8');
const css = await readFile(new URL('styles.css', projectUrl), 'utf8');

test('homepage presents EverDraft as a live writing platform', () => {
  assert.match(html, /A home for stories still being written\./);
  assert.match(html, /Stories are already finding their first readers\./);
  assert.match(html, /Made for works in progress\./);
  assert.match(html, /You don’t have to be a writer to belong here\./);
  assert.match(html, /Start with one chapter\./);
  assert.doesNotMatch(html, /EARLY BETA|working hard behind the scenes|Beta testing details/i);
});

test('homepage uses the supplied artwork and platform icons', () => {
  assert.match(html, /\/?assets\/home\/hero-writing-desk\.png/);
  assert.match(html, /\/?assets\/home\/icon-sparks\.png/);
  assert.match(html, /\/?assets\/home\/icon-private-notes\.png/);
  assert.match(html, /\/?assets\/home\/icon-pinboard\.png/);
  assert.match(html, /\/?assets\/home\/icon-story-follows\.png/);
});

test('visitor calls to action use signup and Library routes', () => {
  assert.match(html, /href="\/signup\/"[^>]*>Create your free account/);
  assert.match(html, /href="\/library\/"[^>]*>Browse the Library/);
  assert.match(html, /href="\/library\/"[^>]*>Start reading/);
  assert.match(html, /href="\/signup\/"[^>]*>Create your account/);
});

test('homepage includes a live Library mount and module', () => {
  assert.match(html, /id="homeLibraryList"/);
  assert.match(html, /id="homeLibraryStatus"/);
  assert.match(html, /<script type="module" src="\/home\.js"><\/script>/);
});

test('homepage module renders a resilient four-story Library preview', async () => {
  const script = await readFile(new URL('home.js', projectUrl), 'utf8');

  assert.match(script, /import\s+\{\s*getLibraryStories\s*\}\s+from\s+'\/stories\.js'/);
  assert.match(script, /\.slice\(0,\s*4\)/);
  assert.match(script, /home-library-cover-placeholder/);
  assert.match(script, /catch\s*\(error\)/);
  assert.match(script, /\/story\/\$\{escapeHtml\(story\.slug\)\}\//);
});

test('homepage styles use the desk hero and responsive card grids', () => {
  assert.match(css, /url\("\/assets\/home\/hero-writing-desk\.png"\)/);
  assert.match(css, /\.home-feature-grid[\s\S]*grid-template-columns:\s*repeat\(4,/);
  assert.match(css, /@media \(min-width:\s*700px\)[\s\S]*\.home-feature-grid[\s\S]*repeat\(2,/);
  assert.match(css, /@media \(min-width:\s*1080px\)[\s\S]*\.home-library-grid[\s\S]*repeat\(4,/);
});
