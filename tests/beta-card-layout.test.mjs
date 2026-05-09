import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const betaHtml = read('everdraft-site/beta/index.html');
const styles = read('everdraft-site/styles.css');

for (const label of ['ACCOUNTS', 'PROFILE', 'STORIES', 'READING']) {
  assert.match(betaHtml, new RegExp(`<p class="eyebrow">${label}</p>`));
}

assert.match(styles, /\.beta-grid\s+\.story-card\s*\{[\s\S]*display:\s*flex/);
assert.match(styles, /\.beta-grid\s+\.story-card\s*\{[\s\S]*flex-direction:\s*column/);
assert.match(styles, /\.beta-grid\s+\.story-card\s*\{[\s\S]*height:\s*100%/);
assert.match(styles, /\.beta-grid\s+\.story-card\s+\.auth-actions\s*\{[\s\S]*margin-top:\s*auto/);
assert.match(styles, /\.beta-grid\s+\.story-card\s+\.auth-actions\s*\{[\s\S]*justify-content:\s*center/);
assert.match(styles, /\.beta-grid\s+\.story-card\s+\.auth-actions\s*\{[\s\S]*align-items:\s*center/);

console.log('Beta card layout checks passed.');
