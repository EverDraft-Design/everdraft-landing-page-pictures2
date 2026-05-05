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

The Supabase anon/public key is intended for public client usage when Row Level Security is configured correctly. The Supabase service role key must never be exposed in frontend code, static assets, public environment variables, or browser-delivered JavaScript.

## Optional Developer Check

The Worker includes a temporary developer-only check at `/api/dev/supabase-check`. It is disabled by default.

To enable it locally, set:

```sh
ENABLE_SUPABASE_DEV_CHECK=true
```

The check reports whether Supabase variables are configured and whether the Worker can initialise the Supabase client. It does not return key values.

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

Signup must create the Supabase Auth user first. Only after Auth returns a real user id does EverDraft upsert the matching `public.profiles` row with `user_id`, `display_name`, `role`, and `pen_name`. If email confirmation is enabled and Supabase does not return an active session immediately, the browser cannot create the profile row under RLS until the user confirms their email and signs in.

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

No Phase 1A database migration was needed because the existing `profiles` table already supports `user_id`, `display_name`, `pen_name`, `role`, `bio`, and `avatar_url`, and its RLS policies already allow users to create and update their own profile.

## Phase 1B: Profile Onboarding

Phase 1B adds a small protected onboarding route:

- `/onboarding/`

The onboarding page helps a signed-in user complete their basic `profiles` row with display name, pen name, role, and bio. It does not add story uploads, dashboards, discovery, payments, Writer's Nook, or public profile pages.

New signups with an immediate session are sent to `/onboarding/`. If Supabase email confirmation is enabled, the user will still need to confirm their email and sign in before onboarding can run.

No Phase 1B migration was needed. The existing `profiles` table and RLS policies already support this flow.

## Phase 2A: Writer Story Dashboard

Phase 2A adds a minimal protected writer area for story metadata:

- `/my/stories/` lists the signed-in writer's own stories.
- `/my/stories/new/` creates a story shell.
- `/my/stories/:storyId/edit/` edits story metadata for the author.

Only users with profile role `writer` or `both` can create or edit stories. Reader-only users see a friendly message directing them to update their profile role first.

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
3. Sign in as a user whose profile role is `writer` or `both`.
4. Open `/my/stories/`.
5. Create a story at `/my/stories/new/`.
6. Edit the story metadata from the list.

No Phase 2A database migration was needed because the existing `stories` table and RLS policies already support author-owned story creation and updates.

## Phase 2B: Private Chapter Drafts

Phase 2B adds private chapter drafting under an author's own story:

- `/my/stories/chapters/?storyId=...` lists chapters for one owned story.
- `/my/stories/chapters/new/?storyId=...` creates a private chapter draft.
- `/my/stories/:storyId/chapters/:chapterId/edit/` edits an owned chapter draft.

Only users with profile role `writer` or `both` can use these pages, and the chapter helpers verify the parent story belongs to the current author before reading or writing chapters.

The chapter form supports:

- title
- chapter number
- status
- content

This phase still does not add public reader chapter pages, comments, follows, ratings, discovery, payments, badges, admin tools, or Writer's Nook. No Phase 2B migration was needed because the existing `chapters` table and RLS policies already support author-owned chapter creation and updates.

## Phase 2C: Private Author Preview

Phase 2C adds an author-only story preview route:

- `/my/stories/:storyId/preview/`

The preview shows story metadata and the author's own non-archived chapter drafts in a reader-like layout, but it is still protected behind login, writer/both role checks, and story ownership checks. It is not a public story page and is not linked from the homepage.

Use this route from the private story list or story edit page to review draft presentation before any future public reader experience exists.

This phase still does not add public discovery, public story pages, public chapter reading, comments, follows, ratings, payments, badges, admin tools, or Writer's Nook. No Phase 2C migration was needed.

## Signup Repair Notes

The signup flow expects the deployed Cloudflare variables `SUPABASE_URL` and `SUPABASE_ANON_KEY`. It calls Supabase Auth first, then creates or updates the matching profile row using `profiles.user_id = auth.users.id`.

A safety migration is available at:

- `supabase/migrations/002_fix_profiles_auth_signup.sql`

Review and apply it manually in the Supabase SQL Editor if your live project may have older or edited profile RLS policies. It recreates the profile insert/update policies using `user_id = auth.uid()` and adds a non-destructive check to stop future blank display names. It does not delete existing data.

If old blank beta rows already exist in `public.profiles`, remove them manually from Supabase **Table Editor > profiles** after confirming they are test rows. Look for rows with an empty `display_name`, missing `user_id`, or a role that does not match a real test account. Do not delete profiles for real users.

## Beta Testing Pathway

The public EverDraft site remains waitlist-first, but the current beta routes are now easier to find for manual testing:

- `/beta/` is the testing hub for the current early platform tools.
- `/signup/` creates a Supabase Auth account.
- `/login/` signs in to an existing account.
- `/account/` manages the basic profile and links to role-appropriate beta tools.
- `/onboarding/` gives the same profile setup flow in a guided format.
- `/my/stories/` lists the signed-in writer's own private stories.
- `/my/stories/new/` creates a private story shell.
- Story edit, chapter management, chapter draft editing, and author preview links are reached from the private My Stories flow after a story exists.

Current working beta features:

- Reader/writer account creation and login.
- Basic profile editing with display name, pen name, role, and bio.
- Writer story dashboard for users with role `writer` or `both`.
- Private story metadata creation and editing.
- Private chapter drafts for owned stories.
- Author-only story preview.

Coming later:

- Public story reading pages.
- Public story discovery.
- Follows.
- Guided feedback comments.
- Completion ratings.
- Storymarks and badges.
- Publication Mode controls.
- Writer's Nook.
- Payments and admin tools.

Manual writer/both testing flow:

1. Run `npm run dev`.
2. Open `/beta/`.
3. Create an account at `/signup/`.
4. Choose role `writer` or `both`.
5. Visit `/account/` and save profile details.
6. Open `/my/stories/`.
7. Create a story at `/my/stories/new/`.
8. Edit the story from the My Stories list.
9. Manage private chapters from the story edit page.
10. Preview the private author-only story view.
11. Sign out, then sign back in at `/login/`.

Manual reader testing flow:

1. Create or update an account with role `reader`.
2. Open `/account/`.
3. Confirm profile editing works.
4. Open `/my/stories/`.
5. Confirm the reader-only message appears instead of story creation tools.

The homepage now acknowledges that private beta platform tools are being built, but "Join the Waitlist" remains the primary public call to action. Do not describe EverDraft as publicly launched until public story reading and discovery are intentionally added.
