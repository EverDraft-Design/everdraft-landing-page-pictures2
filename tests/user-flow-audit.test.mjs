import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const homepage = read('everdraft-site/index.html');
const betaHtml = read('everdraft-site/beta/index.html');
const homepageScript = read('everdraft-site/script.js');
const readme = read('README.md');

assert.match(homepage, /Keep Me in the Loop/);
assert.match(homepage, /EverDraft is in early beta/);
assert.match(homepage, /Explore the Library/);
assert.match(homepage, /Create an Account/);
assert.doesNotMatch(homepage, /Join the Waitlist/);
assert.match(homepageScript, /You’re in the loop\. Thank you for following EverDraft’s next chapter\./);
assert.doesNotMatch(homepage, /Are you a writer, reader, or both\?/i);
assert.match(homepage, /What brings you to EverDraft\?/);
assert.match(homepage, /Drafting stories/);
assert.match(homepage, /Reading stories/);
assert.match(homepage, /A bit of both/);

assert.match(betaHtml, /Library/);
assert.match(betaHtml, /Pinboard/);
assert.match(betaHtml, /Sparks/);
assert.match(betaHtml, /Reader Notes/);
assert.doesNotMatch(betaHtml, /Coming Later[\s\S]*Follows/);
assert.doesNotMatch(betaHtml, /Coming Later[\s\S]*Private Notes and Sparks/);

assert.match(readme, /Sparks/);
assert.match(readme, /Reader Notes/);
assert.doesNotMatch(readme, /Guided feedback comments/);

console.log('User-flow audit copy checks passed.');
