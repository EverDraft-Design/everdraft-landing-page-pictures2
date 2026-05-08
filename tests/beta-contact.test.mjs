import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const betaHtml = read('everdraft-site/beta/index.html');
const accountHtml = read('everdraft-site/account/index.html');
const readme = read('README.md');

for (const source of [betaHtml, accountHtml, readme]) {
  assert.match(source, /hello@everdraft\.net/);
}

assert.match(betaHtml, /Found something odd\?/);
assert.match(betaHtml, /mailto:hello@everdraft\.net/);
assert.match(betaHtml, /EverDraft is still in early beta/);

assert.match(accountHtml, /Need help or want to report a testing issue\?/);
assert.match(accountHtml, /mailto:hello@everdraft\.net/);

assert.doesNotMatch(betaHtml, /<form/i);
assert.doesNotMatch(accountHtml, /contactForm|supportForm|feedbackForm/i);

console.log('Beta contact email checks passed.');
