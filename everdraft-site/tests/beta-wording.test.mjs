import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const projectUrl = new URL('../', import.meta.url);
const htmlFiles = execFileSync(
  'rg',
  ['--files', '-g', '*.html'],
  { cwd: projectUrl, encoding: 'utf8' }
).trim().split('\n').filter(Boolean);

const pages = await Promise.all(htmlFiles.map(async (file) => ({
  file,
  source: await readFile(new URL(file, projectUrl), 'utf8')
})));
const publicJavaScriptFiles = execFileSync(
  'rg',
  ['--files', '-g', '*.js', '-g', '!tests/**'],
  { cwd: projectUrl, encoding: 'utf8' }
).trim().split('\n').filter(Boolean);
const publicSources = [
  ...pages,
  ...await Promise.all(publicJavaScriptFiles.map(async (file) => ({
    file,
    source: await readFile(new URL(file, projectUrl), 'utf8')
  })))
];

test('public pages do not describe EverDraft as a beta product', () => {
  const platformBetaPhrases = [
    /Beta Access/i,
    /Beta Testing EverDraft/i,
    /EARLY BETA ACCESS/i,
    /BETA SUPPORT/i,
    /still in early beta/i,
    /early beta testing/i,
    /early beta feedback/i,
    /early beta season/i,
    /settle into the beta/i,
    /beta editor/i,
    /ready for early testing/i
  ];

  for (const { file, source } of publicSources) {
    for (const phrase of platformBetaPhrases) {
      assert.doesNotMatch(source, phrase, `${file} still contains platform beta wording`);
    }
  }
});

test('the historical beta reader role remains in the founder article', async () => {
  const article = await readFile(
    new URL('journal/first-draft-of-everdraft/index.html', projectUrl),
    'utf8'
  );

  assert.match(article, /Beta readers gave their time and thoughts/);
  assert.match(article, /readers, writers, beta readers, editors/);
});

test('the existing beta route is retained but branded as Early Access', async () => {
  const earlyAccessPage = await readFile(new URL('beta/index.html', projectUrl), 'utf8');

  assert.match(earlyAccessPage, /<title>Early Access - EverDraft<\/title>/);
  assert.match(earlyAccessPage, />Early Access</);
  assert.match(earlyAccessPage, /href="\/beta\/"/);
});
