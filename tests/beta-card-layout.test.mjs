import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const betaHtml = read('everdraft-site/beta/index.html');
const styles = read('everdraft-site/styles.css');

for (const label of ['STEP 1', 'STEP 2', 'STEP 3', 'STEP 4']) {
  assert.match(betaHtml, new RegExp(`<p class="eyebrow">${label}</p>`));
}

assert.match(betaHtml, /Beta Testing EverDraft/);
assert.match(betaHtml, /A Short Test Flow/);
assert.match(betaHtml, /Create an account/);
assert.match(betaHtml, /Explore the Library/);
assert.match(betaHtml, /Try a writer action/);
assert.match(betaHtml, /Share what felt confusing/);
assert.match(styles, /\.beta-flow-grid\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
assert.match(styles, /\.checklist-group\s+p\s*\{[\s\S]*line-height:\s*1\.6/);
assert.match(styles, /\.beta-flow-intro\s*\{[\s\S]*max-width:\s*680px/);
assert.doesNotMatch(betaHtml, /Account Setup|Writer Test Flow|Reader Test Flow|Navigation Test|Mobile Test/);

console.log('Beta card layout checks passed.');
