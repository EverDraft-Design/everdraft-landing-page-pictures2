import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const myStories = read('everdraft-site/my/stories/index.html');
assert.match(myStories, /Back to Account/);
assert.match(myStories, /href="\/account\/"/);

const newStory = read('everdraft-site/my/stories/new/index.html');
assert.match(newStory, /Back to My Stories/);
assert.match(newStory, /href="\/my\/stories\/"/);

const storyShow = read('everdraft-site/my/stories/show/index.html');
assert.match(storyShow, /Back to My Stories/);
assert.match(storyShow, /href="\/my\/stories\/"/);

const editStory = read('everdraft-site/my/stories/edit/index.html');
assert.match(editStory, /Back to My Stories/);
assert.match(editStory, /href="\/my\/stories\/"/);

const newChapter = read('everdraft-site/my/stories/chapters/new/index.html');
assert.match(newChapter, /Back to Story Management/);
assert.match(newChapter, /storyManagementLink/);

const editChapter = read('everdraft-site/my/stories/chapters/edit/index.html');
assert.match(editChapter, /Back to Story Management/);
assert.match(editChapter, /storyManagementLink/);

const newChapterJs = read('everdraft-site/my/stories/chapters/new/new-chapter.js');
assert.match(newChapterJs, /storyManagementLink\.href = `\/my\/stories\/\$\{storyId\}\/`/);

const editChapterJs = read('everdraft-site/my/stories/chapters/edit/edit-chapter.js');
assert.match(editChapterJs, /storyManagementLink\.href = `\/my\/stories\/\$\{storyId\}\/`/);

const library = read('everdraft-site/library/index.html');
assert.match(library, /Return Home/);
assert.match(library, /href="\/"/);

const publicStory = read('everdraft-site/story/index.html');
assert.match(publicStory, /Return to Library/);
assert.match(publicStory, /href="\/library\/"/);

const publicChapter = read('everdraft-site/story/chapter/index.html');
assert.match(publicChapter, /Back to Story/);
assert.match(publicChapter, /Return to Library/);

const writer = read('everdraft-site/writer/index.html');
assert.match(writer, /Back to Library/);
assert.match(writer, /href="\/library\/"/);

const worker = read('src/index.js');
assert.match(worker, /Back to Account/);
assert.match(worker, /Back to My Stories/);
assert.match(worker, /Back to Story Management/);
assert.match(worker, /Return to Library/);
assert.match(worker, /Return Home/);

const readme = read('README.md');
assert.match(readme, /Navigation flow/);
assert.match(readme, /Account → My Stories \/ Pinboard/);
assert.match(readme, /Library → Story → Chapter/);

console.log('Navigation flow checks passed.');
