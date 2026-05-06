# EverDraft Landing Page

EverDraft is currently a landing and waitlist website served by a Cloudflare Worker. The public homepage, journal page, branding, and waitlist flow remain the priority.

## Project Setup

- Static site assets live in `everdraft-site/`.
- The Cloudflare Worker entrypoint is `src/index.js`.
- The waitlist API is handled at `/api/signup` and stores submissions in Cloudflare D1.
- Wrangler configuration lives in `wrangler.jsonc`.

## Local Development

Install dependencies:

```sh
npm install
```

Run the site locally:

```sh
npm run dev
```

Check that the Worker can bundle successfully:

```sh
npm run build
```

## Supabase Setup

This is Step 1 of EverDraft's future story-sharing platform foundation. It adds safe Supabase client support only; it does not add login, story uploads, dashboards, reader pages, writer pages, or public platform features yet.

In your Supabase project dashboard:

- Find the Project URL under **Project Settings > API > Project URL**.
- Find the anon/public key under **Project Settings > API > Project API keys**.

For this Cloudflare Worker project, the Supabase values are read server-side from environment variables. No frontend-specific prefix such as `VITE_` or `NEXT_PUBLIC_` is needed here.

Add these values locally by copying `.dev.vars.example` to `.dev.vars`:

```sh
SUPABASE_URL=
SUPABASE_ANON_KEY=
ENABLE_SUPABASE_DEV_CHECK=false
```

Keep `.env.example` as documentation only. Do not commit `.env`, `.dev.vars`, or any file containing real secrets.

Add these same variables in Cloudflare:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

These exact names are what the deployed Cloudflare Worker reads. The browser receives them only through the Worker endpoint at `/api/supabase-config`; this project does not use `VITE_`, `NEXT_PUBLIC_`, or other frontend-prefixed Supabase variable names.

The Wrangler config uses `keep_vars: true` so dashboard-managed Cloudflare variables are preserved on deploy. Do not add real Supabase values to `wrangler.jsonc`.

The Supabase anon/public key is intended for public client usage when Row Level Security is configured correctly. The Supabase service role key must never be exposed in frontend code, static assets, public environment variables, or browser-delivered JavaScript.

## Optional Developer Check

The Worker includes a temporary developer-only check at `/api/dev/supabase-check`. It is disabled by default.

`ENABLE_SUPABASE_DEV_CHECK` only controls that diagnostic endpoint. It does not enable or disable Supabase Auth, `/signup/`, `/login/`, `/account/`, or `/api/supabase-config`.

To enable it locally, set:

```sh
ENABLE_SUPABASE_DEV_CHECK=true
```

The check reports whether Supabase variables are configured and whether the Worker can initialise the Supabase client. It does not return key values.

For live beta testing, leave `ENABLE_SUPABASE_DEV_CHECK=false` unless you intentionally want the public diagnostic endpoint available for a short troubleshooting window.

## Database Migrations

The existing `migrations/0001_create_waitlist_signups.sql` file is for the current Cloudflare D1 waitlist database.

## Step 2: Supabase Schema Plan

Step 2 adds reviewable database planning files for the future story-sharing platform. It still does not add public login, story uploads, dashboards, reader pages, writer pages, or other visible platform UI. The public site should remain waitlist-first.

Review the plain-English schema plan here:

- `docs/everdraft-schema-plan.md`

Review the Supabase SQL migration here:

- `supabase/migrations/001_initial_everdraft_schema.sql`

The migration creates the planned `profiles`, `stories`, `chapters`, `story_follows`, `writer_follows`, `comments`, and `ratings` tables, including initial Row Level Security policies. It also models Publication Mode, including `publication_mode = 'kdp_select'` for Kindle Unlimited / KDP Select handling, and uses `stories.is_readable` to hide readable chapter content while keeping story metadata available.

Do not apply this migration automatically from the website repo. When you are ready, open the SQL file, review it carefully, then paste or upload it manually in the Supabase SQL Editor for the intended project. No service role key is required for this repository step.

## Phase 1A: Auth Foundation

Phase 1A adds the first controlled Supabase Auth pages:

- `/signup/` for email/password account creation.
- `/login/` for email/password sign in.
- `/account/` for a protected basic profile page.
- `/logout/` for signing out.

These pages are for early account/profile testing only. Story upload, chapter posting, story discovery, dashboards, paid features, and Writer's Nook are not built yet. The public homepage remains waitlist-first and still uses "Join the Waitlist" as the primary call to action.

The browser auth helper lives at `everdraft-site/auth.js`. It loads the Supabase Project URL and anon/public key from the Worker endpoint `/api/supabase-config`, which reads:

```sh
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

During beta testing, signup and login pages display the actual Supabase error message returned by Auth or profile creation so configuration, email confirmation, RLS, and duplicate-account issues are easier to diagnose.

Signup must create the Supabase Auth user first. Only after Auth returns a real user id does EverDraft upsert the matching `public.profiles` row with `user_id`, `username`, `display_name`, and `pen_name`. If email confirmation is enabled and Supabase does not return an active session immediately, the browser cannot create the profile row under RLS until the user confirms their email and signs in.

For email-confirmation projects, apply `supabase/migrations/003_create_profile_on_auth_signup.sql`. It adds a Postgres trigger on `auth.users` that creates the matching `public.profiles` row from signup metadata as soon as Supabase Auth creates the user, and backfills Auth users that were created before the trigger existed.

EverDraft account identity now includes a locked public username. New signups must choose a lowercase username using 3-30 letters, numbers, hyphens, or underscores. The username is saved to `public.profiles.username`, must be unique, and cannot be changed after creation. Existing beta users whose profile has no username can set one once from `/account/` or `/onboarding/`. Users do not choose reader/writer/both roles, and admin status is not selectable in the UI.

To test locally:

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Add your Supabase Project URL and anon/public key to `.dev.vars`.
3. Run `npm run dev`.
4. Open `/signup/` and create a test account.
5. If email confirmations are enabled in Supabase, confirm the email before logging in.
6. Open `/login/`, sign in, then open `/account/`.
7. Edit the basic profile fields and save.

Supabase Auth settings to check:

- Email provider is enabled.
- Site URL and redirect URLs include your local Wrangler URL, such as `http://127.0.0.1:8787`.
- Email confirmation is configured the way you want for testing.
- The `profiles` table migration has been applied and RLS policies are present.

The legacy `profiles.role` column may remain in the database for compatibility, but it is no longer shown to users or used for normal member access.

## Phase 1B: Profile Onboarding

Phase 1B adds a small protected onboarding route:

- `/onboarding/`

The onboarding page helps a signed-in user complete their basic `profiles` row with display name, pen name, and bio. It does not add story uploads, discovery, payments, Writer's Nook, or public profile pages.

New signups with an immediate session are sent to `/onboarding/`. If Supabase email confirmation is enabled, the user will still need to confirm their email and sign in before onboarding can run.

No Phase 1B migration was needed. The existing `profiles` table and RLS policies already support this flow.

## Phase 2A: Member Story Dashboard

Phase 2A adds a minimal protected member area for story metadata:

- `/my/stories/` lists the signed-in member's own stories.
- `/my/stories/new/` creates a story shell.
- `/my/stories/:storyId/edit/` edits story metadata for the author.

Any signed-in member with a profile can create or edit their own stories. Access is based on authentication and ownership, not reader/writer/both role values.

The story form supports:

- title
- slug
- blurb
- genre
- status
- cover URL
- banner URL

Slugs are auto-generated from the title when left blank. New stories use `publication_mode = none` and `is_readable = true`. Publication Mode, KDP/KU controls, image upload, chapter posting, public story pages, discovery, follows, comments, and ratings are not part of this phase.

To test locally:

1. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.dev.vars`.
2. Run `npm run dev`.
3. Sign in as any member account with a completed profile.
4. Open `/my/stories/`.
5. Create a story at `/my/stories/new/`.
6. Edit the story metadata from the list.

Migration `supabase/migrations/006_fix_story_ownership_rls.sql` repairs live story permissions if Supabase still rejects story saves with a row-level security or permission error. It recreates story read/create/update policies so `public.stories.author_id` is checked against the signed-in member's `public.profiles.id`, found through `profiles.user_id = auth.uid()`. Apply it manually after the earlier profile/account migrations. It does not delete story data.

## Phase 2B: Chapters and Public Reading

Phase 2B adds private chapter management for owned stories plus basic public reading pages:

- `/my/stories/:storyId/` manages one owned story and its chapters.
- `/my/stories/:storyId/chapters/new/` creates a chapter draft.
- `/my/stories/:storyId/chapters/:chapterId/edit/` edits an owned chapter.
- `/story/:slug/` shows public story metadata and published chapters.
- `/story/:slug/chapter/:chapterNumber/` shows one published readable chapter.

Chapter ownership is enforced through the parent story: the signed-in Auth user must have a `public.profiles` row where `profiles.user_id = auth.uid()`, and that profile id must match `stories.author_id`. Chapters do not store Auth user ids.

Chapter forms support `chapter_number`, title, content, and status. Status values are `draft`, `published`, `hidden`, and `archived`. The chapter editor intentionally uses a calm plain-text writing area for this beta phase, with word count, Save Draft, a last-saved note, and a browser warning for unsaved changes. Plain text avoids unsafe HTML while preserving line breaks and paragraph spacing on public reading pages. Publishing requires content; when a chapter is first saved as `published`, `published_at` is set if it was empty. Moving a chapter away from `published` does not erase `published_at`, so the original publish date remains available for beta review.

Public story pages show story metadata, cover/banner image URLs when present, author pen name or display name, and only published chapters while `stories.is_readable = true`. If a story is not readable, EverDraft shows the metadata and a gentle unavailable message without chapter content.

Known limitations: no comments, follows, ratings, Storymarks, image upload, payments, admin dashboard, Writer's Nook, or Publication Mode/KDP UI are included in this phase.

Migration `supabase/migrations/007_fix_chapter_ownership_rls.sql` refreshes chapter RLS policies for public reads and owner-only authoring. Apply it manually in the Supabase SQL Editor after migration 006 if your live project has older chapter policies.

## Signup Repair Notes

The signup flow expects the deployed Cloudflare variables `SUPABASE_URL` and `SUPABASE_ANON_KEY`. It calls Supabase Auth first, then creates or updates the matching profile row using `profiles.user_id = auth.users.id`.

A safety migration is available at:

- `supabase/migrations/002_fix_profiles_auth_signup.sql`
- `supabase/migrations/003_create_profile_on_auth_signup.sql`
- `supabase/migrations/004_add_locked_username_to_profiles.sql`
- `supabase/migrations/005_remove_member_role_gate.sql`
- `supabase/migrations/006_fix_story_ownership_rls.sql`
- `supabase/migrations/007_fix_chapter_ownership_rls.sql`

Review and apply these manually in the Supabase SQL Editor if your live project may have older or edited profile RLS policies, if Auth users are being created without profile rows, or if story/chapter saves fail with a permission/RLS error. Migration 002 recreates the profile insert/update policies using `user_id = auth.uid()` and adds a non-destructive check to stop future blank display names. Migration 003 creates profiles automatically from `auth.users` when email confirmation prevents the browser from receiving an immediate session. Migration 004 adds the locked `username` field and updates the Auth signup trigger so new profiles include usernames. Migration 005 keeps `profiles.role` as a legacy/internal field, prevents browser self-service role changes, removes the original story creation role gate, and updates the Auth trigger so new profiles no longer depend on intended-role metadata. Migration 006 recreates story metadata policies around profile ownership instead of legacy role values. Migration 007 recreates chapter policies around parent story ownership and published/readable public access. None of these migrations delete existing data.

To test locked usernames:

1. Apply migration 004 in Supabase SQL Editor after migrations 002 and 003.
2. Open `/signup/`.
3. Try an invalid username with spaces or uppercase letters and confirm it is rejected.
4. Create an account with a valid username such as `first_draft`.
5. Confirm `public.profiles.username` is saved.
6. Try another signup with the same username and confirm Supabase rejects it.
7. Open `/account/` and confirm the username is read-only after it is set.

If old blank beta rows already exist in `public.profiles`, remove them manually from Supabase **Table Editor > profiles** after confirming they are test rows. Look for rows with an empty `display_name` or missing `user_id`. Do not delete profiles for real users.

## Beta Testing Pathway

The public EverDraft site remains waitlist-first, but the current beta routes are now easier to find for manual testing:

- `/beta/` is the testing hub for the current early platform tools.
- `/signup/` creates a Supabase Auth account.
- `/login/` signs in to an existing account.
- `/account/` manages the basic profile and links to member beta tools.
- `/onboarding/` gives the same profile setup flow in a guided format.
- `/my/stories/` lists the signed-in member's own private stories.
- `/my/stories/new/` creates a private story shell.
- `/my/stories/:storyId/` manages an owned story and opens its chapter shelf.
- `/my/stories/:storyId/chapters/new/` opens the Add Chapter form.
- `/my/stories/:storyId/chapters/:chapterId/edit/` edits an owned chapter.
- `/story/:slug/` and `/story/:slug/chapter/:chapterNumber/` are public reading routes for published readable chapters.

Current working beta features:

- Account creation and login.
- Basic profile editing with display name, pen name, and bio.
- Story dashboard for signed-in members when story routes are enabled.
- Private story metadata creation and editing.
- Private chapter drafting and publishing for owned stories.
- Public story and chapter reading pages for published readable chapters.

Coming later:

- Public story discovery.
- Follows.
- Guided feedback comments.
- Completion ratings.
- Storymarks and badges.
- Publication Mode controls.
- Writer's Nook.
- Payments and admin tools.

Manual member testing flow:

1. Run `npm run dev`.
2. Open `/beta/`.
3. Create an account at `/signup/`.
4. Confirm there is no reader/writer/both selection.
5. Visit `/account/` and save profile details.
6. Open `/my/stories/` if private story routes are enabled.
7. Create a story at `/my/stories/new/` if that route is enabled.
8. Edit the story from the My Stories list.
9. Open the story management page and add a chapter.
10. Publish the chapter and confirm it appears at `/story/:slug/`.
11. Open `/story/:slug/chapter/:chapterNumber/`.
12. Sign out, then sign back in at `/login/`.

The homepage now acknowledges that private beta platform tools are being built, but "Join the Waitlist" remains the primary public call to action. Do not describe EverDraft as publicly launched until public story reading and discovery are intentionally added.
