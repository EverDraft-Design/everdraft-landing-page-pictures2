import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const homepage = read('everdraft-site/index.html');
const betaHtml = read('everdraft-site/beta/index.html');
const readme = read('README.md');

assert.match(homepage, /Create your account/);
assert.doesNotMatch(homepage, /Keep Me in the Loop|heroForm|waitlistForm/);
assert.match(homepage, /EverDraft is in early beta/);
assert.match(homepage, /Visit the Library/);
assert.match(homepage, /Beta testing details/);
assert.match(homepage, /class="hero home-hero"/);
assert.doesNotMatch(homepage, /class="account-cta"|Step into EverDraft\./);
assert.doesNotMatch(homepage, /Join the Waitlist/);
assert.doesNotMatch(homepage, /Are you a writer, reader, or both\?/i);

assert.match(betaHtml, /Library/);
assert.match(betaHtml, /Beta Testing EverDraft/);
assert.match(betaHtml, /A Short Test Flow/);
assert.match(betaHtml, /Create an account/);
assert.match(betaHtml, /Explore the Library/);
assert.match(betaHtml, /Try a writer action/);
assert.match(betaHtml, /Share what felt confusing/);
assert.doesNotMatch(betaHtml, /Writer Test Flow|Reader Test Flow|Navigation Test|Mobile Test/);
assert.doesNotMatch(betaHtml, /Coming Later[\s\S]*Follows/);
assert.doesNotMatch(betaHtml, /Coming Later[\s\S]*Private Notes and Sparks/);

assert.match(readme, /Sparks/);
assert.match(readme, /Reader Notes/);
assert.doesNotMatch(readme, /Guided feedback comments/);

console.log('User-flow audit copy checks passed.');
