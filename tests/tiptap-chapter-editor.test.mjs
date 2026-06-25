import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const componentPath = 'everdraft-site/components/ChapterEditor.js';
const contentHelperPath = 'everdraft-site/components/chapter-content.js';
const bundlePath = 'everdraft-site/components/ChapterEditor.bundle.js';

assert.equal(existsSync(componentPath), true, 'ChapterEditor.js should physically exist in this repository');
assert.equal(existsSync(contentHelperPath), true, 'chapter-content.js should physically exist in this repository');

const component = read(componentPath);
const contentHelper = read(contentHelperPath);
const newHtml = read('everdraft-site/my/stories/chapters/new/index.html');
const editHtml = read('everdraft-site/my/stories/chapters/edit/index.html');
const newScript = read('everdraft-site/my/stories/chapters/new/new-chapter.js');
const editScript = read('everdraft-site/my/stories/chapters/edit/edit-chapter.js');
const publicScript = read('everdraft-site/story/chapter/chapter-public.js');
const styles = read('everdraft-site/styles.css');
const worker = read('src/index.js');
const packageJson = JSON.parse(read('package.json'));

for (const packageName of [
  '@tiptap/react',
  '@tiptap/starter-kit',
  '@tiptap/extension-text-align',
  '@tiptap/pm'
]) {
  assert.match(component, new RegExp(packageName.replace('/', '\\/')), `${packageName} should be imported locally`);
}

for (const label of [
  'Undo',
  'Redo',
  'Bold',
  'Italic',
  'Underline',
  'Strikethrough',
  'Align left',
  'Align centre',
  'Align right',
  'Block quote',
  'Scene break',
  'Clear formatting'
]) {
  assert.match(component, new RegExp(label), `${label} should be available in the toolbar`);
}

assert.match(component, /textarea\.dispatchEvent\(new Event\('input', \{ bubbles: true \}\)\)/);
assert.match(component, /sanitizeChapterHtml/);
assert.match(component, /setHorizontalRule/);
assert.match(component, /clearNodes/);

for (const html of [newHtml, editHtml]) {
  assert.match(html, /id="chapterEditorMount"/);
  assert.match(html, /id="content"[^>]+class="chapter-editor-field"/);
  assert.match(html, /ChapterEditor\.bundle\.js/);
  assert.doesNotMatch(html, /cdn|esm\.sh/i);
}

for (const script of [newScript, editScript]) {
  assert.match(script, /mountChapterEditor/);
  assert.match(script, /chapterEditor\.setContent/);
  assert.match(script, /chapterContentToText/);
  assert.match(script, /new FormData\(form\)/);
  assert.match(script, /beforeunload/);
}

assert.match(editScript, /archiveChapter/);
assert.match(publicScript, /sanitizeChapterHtml/);
assert.match(publicScript, /normalizeChapterContent/);
assert.doesNotMatch(publicScript, /renderParagraphs/);

assert.match(contentHelper, /DOMParser/);
assert.match(contentHelper, /script|iframe|object|embed/i);
assert.match(contentHelper, /on[a-z]/i);
assert.match(contentHelper, /ALLOWED_TAGS/);
assert.match(contentHelper, /textAlign/);

assert.match(styles, /\.chapter-editor-shell/);
assert.match(styles, /\.chapter-editor-toolbar/);
assert.match(styles, /\.chapter-editor-surface/);
assert.match(styles, /\.chapter-editor-field/);
assert.match(styles, /@media\s*\(max-width:\s*640px\)/);
assert.match(styles, /focus-visible/);

assert.match(worker, /chapterEditorMount/);
assert.match(worker, /ChapterEditor\.bundle\.js/);
assert.match(worker, /chapter-editor-field/);

assert.match(packageJson.scripts['build:editor'], /esbuild/);
assert.match(packageJson.scripts.build, /build:editor/);
assert.equal(existsSync(bundlePath), true, 'the locally bundled browser editor should exist after the editor build');

console.log('Tiptap chapter editor checks passed.');
