import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const styles = read('everdraft-site/styles.css');
const journal = read('everdraft-site/journal/index.html');
const beta = read('everdraft-site/beta/index.html');
const account = read('everdraft-site/account/index.html');
const onboarding = read('everdraft-site/onboarding/index.html');
const readme = read('README.md');

assert.match(journal, /Beta Access/);
assert.match(journal, /Read more/);

assert.match(styles, /\.social-nav\s*\{[\s\S]*flex-wrap:\s*wrap/);
assert.match(styles, /@media\s*\(max-width:\s*640px\)[\s\S]*\.navbar[\s\S]*justify-content:\s*center/);
assert.match(styles, /@media\s*\(max-width:\s*640px\)[\s\S]*\.nav-link[\s\S]*padding:\s*\.4rem\s+\.68rem/);
assert.match(styles, /\.journal-featured-card\s+\.button-link\s*\{[\s\S]*justify-self:\s*center/);

assert.doesNotMatch(beta, /Profile Onboarding/);
assert.doesNotMatch(beta, /href="\/onboarding\/"/);
assert.match(beta, /Open Account/);

assert.doesNotMatch(account, /Review Onboarding/);
assert.doesNotMatch(account, /href="\/onboarding\/"/);

assert.match(onboarding, /Complete Your Profile/);
assert.match(onboarding, /PROFILE SETUP/);
assert.match(onboarding, /Open Account/);
assert.doesNotMatch(onboarding, /Story tools are still closed/);

assert.match(readme, /first-time profile completion fallback/);
assert.match(readme, /`\/account\/` remains the main place to manage profile details/);

console.log('Mobile polish checks passed.');
