import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const signupHtml = read('everdraft-site/signup/index.html');
const signupJs = read('everdraft-site/signup/signup.js');
const accountHtml = read('everdraft-site/account/index.html');
const accountJs = read('everdraft-site/account/account.js');
const onboardingHtml = read('everdraft-site/onboarding/index.html');
const onboardingJs = read('everdraft-site/onboarding/onboarding.js');
const authJs = read('everdraft-site/auth.js');
const storiesJs = read('everdraft-site/stories.js');
const chaptersJs = read('everdraft-site/chapters.js');
const betaHtml = read('everdraft-site/beta/index.html');
const migrationPath = 'supabase/migrations/005_remove_member_role_gate.sql';

for (const [name, source] of [
  ['signup page', signupHtml],
  ['account page', accountHtml],
  ['onboarding page', onboardingHtml],
]) {
  assert.equal(source.includes('name="role"'), false, `${name} should not expose a role field`);
  assert.equal(/reader|writer|both/i.test(source), false, `${name} should not show reader/writer/both role choices`);
}

assert.equal(signupJs.includes("formData.get('role')"), false, 'signup should not read role from the form');
assert.equal(signupJs.includes('VALID_SIGNUP_ROLES'), false, 'signup should not validate reader/writer/both');
assert.equal(signupJs.includes('intended_role'), false, 'signup should not send intended role metadata');
assert.equal(accountJs.includes("formData.get('role')"), false, 'account editing should not read role from the form');
assert.equal(onboardingJs.includes("formData.get('role')"), false, 'onboarding should not read role from the form');

assert.equal(authJs.includes('VALID_PROFILE_ROLES'), false, 'profile helper should not require user-facing roles');
assert.equal(authJs.includes('intended_role'), false, 'auth metadata should not carry intended_role');
assert.equal(authJs.includes('role:'), false, 'browser profile payloads should not let users set roles');
assert.equal(authJs.includes('profile.role'), false, 'profile completeness should not depend on role');

assert.equal(storiesJs.includes("['writer', 'both']"), false, 'story helpers should not gate by writer/both roles');
assert.equal(storiesJs.includes('requireWriterProfile'), false, 'story helpers should use member profile ownership, not writer role');
assert.equal(chaptersJs.includes('requireWriterProfile'), false, 'chapter helpers should use member profile ownership, not writer role');

for (const source of [
  storiesJs,
  chaptersJs,
  betaHtml,
  read('everdraft-site/my/stories/index.html'),
  read('everdraft-site/my/stories/new/index.html'),
  read('everdraft-site/my/stories/edit/index.html'),
  read('everdraft-site/my/stories/preview/index.html'),
  read('everdraft-site/my/stories/chapters/index.html'),
  read('everdraft-site/my/stories/chapters/new/index.html'),
  read('everdraft-site/my/stories/chapters/edit/index.html'),
]) {
  assert.equal(/writer accounts|Writer or Both|reader-only|role `writer`|role `both`/i.test(source), false);
}

assert.equal(existsSync(migrationPath), true, 'role-gate migration should be present');
const migration = read(migrationPath);
assert.match(migration, /drop policy if exists "Writers can create their own stories"/);
assert.match(migration, /profiles\.user_id = \(select auth\.uid\(\)\)/);
assert.doesNotMatch(migration, /profiles\.role in \('writer', 'both'/);

console.log('Phase 1 member access checks passed.');
