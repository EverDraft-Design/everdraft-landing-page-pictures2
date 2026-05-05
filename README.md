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
