import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const styles = read('everdraft-site/styles.css');
const publicChapterHtml = read('everdraft-site/story/chapter/index.html');
const newChapterHtml = read('everdraft-site/my/stories/chapters/new/index.html');
const editChapterHtml = read('everdraft-site/my/stories/chapters/edit/index.html');

assert.match(publicChapterHtml, /id="chapterContent" class="chapter-content reading-content"/);
assert.match(styles, /\.reading-content\s*\{[\s\S]*max-width:\s*68ch/);
assert.match(styles, /\.reading-content\s*\{[\s\S]*line-height:\s*1\.8/);
assert.match(styles, /\.reading-content\s*\{[\s\S]*text-align:\s*justify/);
assert.match(styles, /\.reading-content\s*\{[\s\S]*text-align-last:\s*left/);
assert.match(styles, /\.reading-content\s*\{[\s\S]*hyphens:\s*auto/);
assert.match(styles, /\.chapter-content p\s*\{[\s\S]*margin:\s*0\s+0\s+1\.35rem/);
assert.match(styles, /@media\s*\(max-width:\s*640px\)[\s\S]*\.reading-content\s*\{[\s\S]*text-align:\s*left/);

for (const source of [newChapterHtml, editChapterHtml]) {
  assert.match(source, /<textarea[^>]+id="content"[^>]+spellcheck="true"/);
  assert.match(source, /Your browser may underline spelling suggestions while you write\./);
  assert.doesNotMatch(source, /LanguageTool|Grammarly|grammar API|external proofreading/i);
}

console.log('Reading comfort and spellcheck checks passed.');
