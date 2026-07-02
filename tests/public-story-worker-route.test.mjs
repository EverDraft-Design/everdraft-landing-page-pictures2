import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';

const read = (path) => readFileSync(path, 'utf8');

function createAssetRecorder() {
  const calls = [];

  return {
    calls,
    binding: {
      async fetch(request) {
        calls.push(new URL(request.url).pathname);
        return new Response('asset response', {
          headers: { 'Content-Type': 'text/plain; charset=UTF-8' }
        });
      }
    }
  };
}

async function fetchPath(pathname) {
  const assets = createAssetRecorder();
  const response = await worker.fetch(
    new Request(`https://everdraft.test${pathname}`),
    { ASSETS: assets.binding }
  );
  const body = await response.text();

  return { response, body, assetCalls: assets.calls };
}

for (const slug of ['manifesting-mercy', 'another-public-story']) {
  const { response, body, assetCalls } = await fetchPath(`/story/${slug}/`);

  assert.equal(response.status, 200, `/story/${slug}/ should serve the public story page`);
  assert.equal(response.headers.get('Location'), null, `/story/${slug}/ should not redirect`);
  assert.deepEqual(assetCalls, [], `/story/${slug}/ should not be rewritten through static assets`);
  assert.match(body, /id="story-title"/, `/story/${slug}/ should include the public story shell`);
  assert.match(body, /src="\/story\/story-public\.js"/, `/story/${slug}/ should load public story handling`);
  assert.doesNotMatch(body, /href="\/story\/"/, `/story/${slug}/ should not render a fallback story href`);
}

const publicChapter = await fetchPath('/story/manifesting-mercy/chapter/1/');
assert.equal(publicChapter.response.status, 200, 'public chapter routes should still serve the chapter page');
assert.deepEqual(publicChapter.assetCalls, [], 'public chapter routes should not be rewritten through static assets');
assert.match(publicChapter.body, /id="chapter-title"/);
assert.match(publicChapter.body, /src="\/story\/chapter\/chapter-public\.js"/);

const writer = await fetchPath('/writer/example-writer/');
assert.equal(writer.response.status, 200, 'writer profile routes should still serve the writer page');
assert.deepEqual(writer.assetCalls, [], 'writer profile routes should not be rewritten through static assets');
assert.match(writer.body, /id="writer-title"/);

const baseStory = await fetchPath('/story/');
assert.equal(baseStory.response.status, 404, '/story/ should not be a redirect target for slugged stories');
assert.equal(baseStory.response.headers.get('Location'), null, '/story/ should not redirect');

const libraryJs = read('everdraft-site/library/library.js');
assert.match(libraryJs, /href="\/story\/\$\{story\.slug\}\/"/, 'Library links should preserve each story slug');

const publicStoryJs = read('everdraft-site/story/story-public.js');
assert.equal(
  publicStoryJs.includes('window.location.pathname.match(/^\\/story\\/([^/]+)\\/?$/)'),
  true,
  'public story page should extract the slug from the browser path'
);
assert.match(publicStoryJs, /getPublicStoryBySlug\(getSlug\(\)\)/, 'public story page should look up the extracted slug');

const chaptersJs = read('everdraft-site/chapters.js');
assert.match(chaptersJs, /\.eq\('slug', cleanSlug\)/, 'public story lookup should query Supabase by the cleaned slug');

const tiptapEditor = read('everdraft-site/components/ChapterEditor.js');
const publicChapterJs = read('everdraft-site/story/chapter/chapter-public.js');
assert.match(tiptapEditor, /mountChapterEditor/, 'TipTap editor mounting should remain in place');
assert.match(publicChapterJs, /sanitizeChapterHtml/, 'public chapter rendering should keep rich-text sanitising');

console.log('Public story Worker route checks passed.');
