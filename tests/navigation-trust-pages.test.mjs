import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function listHtmlFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) listHtmlFiles(full, files);
    else if (full.endsWith('.html')) files.push(full);
  }
  return files;
}

const headerPages = listHtmlFiles(fileURLToPath(new URL('../everdraft-site', import.meta.url)));
for (const file of headerPages) {
  const html = readFileSync(file, 'utf8');
  if (!html.includes('<header class="navbar">')) continue;
  assert.match(html, /class="site-nav"/, `${file} should use grouped site nav`);
  assert.match(html, /class="brand-word">EVERDRAFT<\/span>/, `${file} should include the header wordmark`);
  assert.match(html, /<summary class="nav-link">About<\/summary>/, `${file} should include About dropdown`);
  assert.match(html, /class="mobile-nav"/, `${file} should include compact mobile menu`);
}

const homepage = read('everdraft-site/index.html');
assert.match(homepage, /EARLY BETA/);
assert.match(homepage, /Visit the Library/);
assert.match(homepage, /Create your account/);
assert.doesNotMatch(homepage, /Keep Me in the Loop|heroForm|waitlistForm/);
assert.doesNotMatch(homepage, /LAUNCHING SOON/);
assert.doesNotMatch(homepage, /Join the Waitlist/);
assert.match(homepage, /<summary class="nav-link">About<\/summary>/);

const betaHtml = read('everdraft-site/beta/index.html');
for (const label of ['Beta Access', 'Contact', 'Writer Ownership', 'Community Guidelines']) {
  assert.match(betaHtml, new RegExp(label));
}

const ownership = read('everdraft-site/writer-ownership/index.html');
assert.match(ownership, /<h1 id="ownership-title">Writer Ownership<\/h1>/);
assert.match(ownership, /Your work remains yours/);
assert.match(ownership, /href="\/contact\/">Contact EverDraft/);

const guidelines = read('everdraft-site/community-guidelines/index.html');
assert.match(guidelines, /Community Guidelines and Expectations/);
assert.match(guidelines, /Reader Notes and Feedback/);
assert.match(guidelines, /Not Welcome on EverDraft/);
assert.match(guidelines, /href="\/contact\/">Contact EverDraft/);

const styles = read('everdraft-site/styles.css');
assert.match(styles, /@import url\("https:\/\/fonts\.googleapis\.com\/css2\?family=Cinzel/);
assert.match(styles, /\.brand-word\s*\{[\s\S]*font-family:\s*"Cinzel"/);
assert.match(styles, /\.brand-word\s*\{[\s\S]*letter-spacing:\s*\.16em/);
assert.match(styles, /\.brand-logo\s*\{[\s\S]*height:\s*102px/);
assert.match(styles, /\.brand-logo\s*\{[\s\S]*margin-block:\s*-27px/);
assert.match(styles, /@media\s*\(max-width:\s*640px\)[\s\S]*\.brand-logo\s*\{[\s\S]*height:\s*56px/);
assert.match(styles, /@media\s*\(max-width:\s*420px\)[\s\S]*\.brand-word\s*\{[\s\S]*display:\s*none/);
assert.match(styles, /\.nav-dropdown-menu/);
assert.match(styles, /\.mobile-nav-panel/);
assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.desktop-nav\s*\{[\s\S]*display:\s*none/);
assert.match(styles, /@media \(max-width: 640px\)[\s\S]*\.mobile-nav\s*\{[\s\S]*display:\s*block/);

const readme = read('README.md');
assert.match(readme, /About dropdown/);
assert.match(readme, /\/writer-ownership\//);
assert.match(readme, /\/community-guidelines\//);
assert.match(readme, /not legal documents/);

console.log('Navigation grouping and trust page checks passed.');
