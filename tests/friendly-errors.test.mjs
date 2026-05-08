import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

const errorHelper = read('everdraft-site/errors.js');
const authHelper = read('everdraft-site/auth.js');
const storiesHelper = read('everdraft-site/stories.js');
const chaptersHelper = read('everdraft-site/chapters.js');
const followsHelper = read('everdraft-site/follows.js');
const engagementHelper = read('everdraft-site/engagement.js');
const signupPage = read('everdraft-site/signup/signup.js');

const userFacingHelpers = [
  authHelper,
  storiesHelper,
  chaptersHelper,
  followsHelper,
  engagementHelper,
  signupPage
].join('\n');

assert.match(errorHelper, /export function getFriendlyErrorMessage/);
assert.match(errorHelper, /We couldn’t sign you in\. Please check your email and password\./);
assert.match(errorHelper, /That story link is already in use\. Please choose another slug\./);
assert.match(errorHelper, /This story already has a chapter with that number\./);
assert.match(errorHelper, /Your Spark couldn’t be updated just yet\. Please try again\./);
assert.match(errorHelper, /Your Note couldn’t be sent just yet\. Please try again\./);

assert.match(authHelper, /getFriendlyErrorMessage\(error, context\)/);
assert.match(storiesHelper, /getFriendlyErrorMessage\(error, 'story'\)/);
assert.match(chaptersHelper, /getFriendlyErrorMessage\(error, 'chapter'\)/);
assert.match(followsHelper, /getFriendlyErrorMessage\(error, 'follow'\)/);
assert.match(engagementHelper, /getFriendlyErrorMessage\(error, context\)/);

assert.doesNotMatch(userFacingHelpers, /Supabase: \$\{rawMessage\}/);
assert.doesNotMatch(userFacingHelpers, /Supabase .*permission error/);
assert.doesNotMatch(userFacingHelpers, /row-level security/);
assert.doesNotMatch(signupPage, /Supabase created the Auth user/);

const { getFriendlyErrorMessage } = await import(pathToFileURL(join(root, 'everdraft-site/errors.js')));

assert.equal(
  getFriendlyErrorMessage(new Error('new row violates row-level security policy for table "stories"'), 'story'),
  'You don’t have access to change this story.'
);
assert.equal(
  getFriendlyErrorMessage(new Error('duplicate key value violates unique constraint "stories_slug_key"'), 'story'),
  'That story link is already in use. Please choose another slug.'
);
assert.equal(
  getFriendlyErrorMessage(new Error('permission denied for table notes'), 'note'),
  'Your Note couldn’t be sent just yet. Please try again.'
);
assert.equal(
  getFriendlyErrorMessage(new Error('invalid login credentials'), 'login'),
  'We couldn’t sign you in. Please check your email and password.'
);

console.log('Friendly error handling hides raw Supabase/database details from UI helpers.');
