import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const homepage = read('everdraft-site/index.html');
const styles = read('everdraft-site/styles.css');

assert.match(homepage, /<section class="hero home-hero" aria-labelledby="hero-title">/);
assert.match(homepage, /<div class="home-hero-content">/);
assert.match(homepage, /Where Stories Spark, Grow & Glow/);
assert.match(homepage, /Create your account/);
assert.match(homepage, /Visit the Library/);
assert.match(homepage, /Beta testing details/);
assert.doesNotMatch(homepage, /class="account-cta"/);

assert.match(styles, /\.home-hero\s*\{[\s\S]*url\("\/assets\/everdraft-forest-hero\.png"\)/);
assert.match(styles, /\.home-hero\s*\{[\s\S]*min-height:\s*max\(720px,\s*85vh\)/);
assert.match(styles, /\.home-hero\s*\{[\s\S]*text-align:\s*left/);
assert.match(styles, /\.home-hero\s+\.hero-actions\s*\{[\s\S]*justify-content:\s*flex-start/);
assert.match(styles, /@media\s*\(max-width:\s*640px\)[\s\S]*\.home-hero\s*\{[\s\S]*center top \/ cover no-repeat/);

console.log('Homepage forest hero checks passed.');
