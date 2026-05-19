import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const homepage = read('everdraft-site/index.html');
const allHtml = [
  'everdraft-site/index.html',
  'everdraft-site/beta/index.html',
  'everdraft-site/journal/index.html',
  'everdraft-site/signup/index.html'
].map(read).join('\n');

assert.doesNotMatch(homepage, /heroForm|waitlistForm|submitWaitlist|Keep Me in the Loop/);
assert.match(homepage, /href="\/signup\/"[^>]*>Create your account/);
assert.match(homepage, /href="\/library\/"[^>]*>Visit the Library/);
assert.match(homepage, /href="\/beta\/"[^>]*>Beta testing details/);
assert.doesNotMatch(homepage, /class="account-cta"|Step into EverDraft\./);
assert.doesNotMatch(allHtml, /href="\/#waitlist"/);
assert.equal(existsSync(new URL('../everdraft-site/script.js', import.meta.url)), false);
assert.equal(existsSync(new URL('../functions/api/signup.js', import.meta.url)), false);

console.log('Waitlist removal checks passed.');
