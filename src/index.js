import { getSupabaseClient, hasSupabaseConfig } from './supabase.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

async function saveWaitlistSignup(request, env) {
  if (!env.DB) {
    return jsonResponse({ error: 'Waitlist database is not configured.' }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const email = cleanText(payload.email, 254).toLowerCase();
  const name = cleanText(payload.name, 120);
  const role = cleanText(payload.role, 24);
  const genres = cleanText(payload.genres, 300);
  const betaAccess = cleanText(payload.betaAccess, 12);
  const notes = cleanText(payload.notes, 1000);

  if (!EMAIL_PATTERN.test(email)) {
    return jsonResponse({ error: 'A valid email address is required.' }, 400);
  }

  if (!name || !role || !betaAccess) {
    return jsonResponse({ error: 'Name, role, and beta access are required.' }, 400);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO waitlist_signups (
        email,
        name,
        role,
        genres,
        beta_access,
        notes,
        user_agent,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        role = excluded.role,
        genres = excluded.genres,
        beta_access = excluded.beta_access,
        notes = excluded.notes,
        user_agent = excluded.user_agent,
        updated_at = datetime('now')
    `)
      .bind(
        email,
        name,
        role,
        genres,
        betaAccess,
        notes,
        request.headers.get('User-Agent') || ''
      )
      .run();

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Failed to save waitlist signup', error);
    return jsonResponse({ error: 'Unable to save waitlist signup.' }, 500);
  }
}

async function checkSupabaseConnection(env) {
  if (env.ENABLE_SUPABASE_DEV_CHECK !== 'true') {
    return jsonResponse({ error: 'Supabase developer check is disabled.' }, 404);
  }

  const configured = hasSupabaseConfig(env);
  const supabase = getSupabaseClient(env);

  return jsonResponse({
    configured,
    clientInitialised: Boolean(supabase)
  });
}

function getSupabaseBrowserConfig(env) {
  return jsonResponse({
    configured: hasSupabaseConfig(env),
    url: env.SUPABASE_URL || '',
    anonKey: env.SUPABASE_ANON_KEY || ''
  });
}

function rewriteAssetRequest(request, pathname) {
  const url = new URL(request.url);
  url.pathname = pathname;
  return new Request(url.toString(), request);
}

function chapterEditPage() {
  return new Response(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Edit Chapter — EverDraft</title>
    <meta name="description" content="Edit a private EverDraft chapter draft." />
    <link rel="icon" type="image/png" href="/favicon/favicon.png" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="site-bg" aria-hidden="true"></div>
    <header class="navbar">
      <a href="/" class="brand" aria-label="EverDraft home">
        <img src="/favicon/favicon.png" alt="EverDraft logo" class="brand-logo" />
      </a>
      <nav aria-label="Primary navigation" class="social-nav">
        <a id="backToChaptersLink" href="/my/stories/" class="nav-link">Chapters</a>
        <a href="/#waitlist" class="nav-link nav-link-primary">Join the Waitlist</a>
      </nav>
    </header>
    <main class="auth-main story-main">
      <section class="auth-panel story-panel" aria-labelledby="edit-chapter-title">
        <p class="eyebrow">PRIVATE CHAPTER</p>
        <h1 id="edit-chapter-title">Edit Chapter Draft</h1>
        <p class="hero-copy">Private chapter drafting only. No public reading view is open yet.</p>
        <div id="readerNotice" class="notice-panel" hidden>You can only edit chapters for stories you created.</div>
        <div id="missingNotice" class="notice-panel" hidden>This chapter was not found, or it does not belong to your story.</div>
        <form id="chapterForm" class="auth-form story-form" hidden>
          <label for="title">Chapter title</label>
          <input id="title" name="title" type="text" required />
          <div class="form-grid">
            <div>
              <label for="chapterNumber">Chapter number</label>
              <input id="chapterNumber" name="chapterNumber" type="number" min="1" step="1" required />
            </div>
            <div>
              <label for="status">Status</label>
              <select id="status" name="status">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <label for="content">Content</label>
          <textarea id="content" name="content" rows="14"></textarea>
          <div class="auth-actions">
            <button type="submit" id="saveChapterButton">Save Chapter</button>
            <button type="button" id="archiveChapterButton" class="secondary-button">Archive Chapter</button>
          </div>
          <p id="chapterStatus" class="form-status" aria-live="polite"></p>
        </form>
      </section>
    </main>
    <script type="module" src="/my/stories/chapters/edit/edit-chapter.js"></script>
  </body>
</html>`, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store'
    }
  });
}

function storyPreviewPage() {
  return new Response(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Story Preview — EverDraft</title>
    <meta name="description" content="Preview a private EverDraft story draft." />
    <link rel="icon" type="image/png" href="/favicon/favicon.png" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="site-bg" aria-hidden="true"></div>
    <header class="navbar">
      <a href="/" class="brand" aria-label="EverDraft home">
        <img src="/favicon/favicon.png" alt="EverDraft logo" class="brand-logo" />
      </a>
      <nav aria-label="Primary navigation" class="social-nav">
        <a id="editStoryLink" href="/my/stories/" class="nav-link">Edit Story</a>
        <a href="/#waitlist" class="nav-link nav-link-primary">Join the Waitlist</a>
      </nav>
    </header>
    <main class="auth-main story-main">
      <article class="auth-panel story-panel preview-panel" aria-labelledby="preview-title">
        <p class="eyebrow">PRIVATE PREVIEW</p>
        <h1 id="preview-title">Story Preview</h1>
        <p id="previewMeta" class="hero-copy">Loading story...</p>
        <div id="readerNotice" class="notice-panel" hidden>You can only preview stories you created.</div>
        <div id="missingNotice" class="notice-panel" hidden>This story was not found, or it does not belong to your account.</div>
        <section id="storyPreview" class="preview-body" hidden>
          <div id="storySummary" class="preview-summary"></div>
          <div id="chapterPreviewList" class="chapter-preview-list"></div>
        </section>
        <p id="previewStatus" class="form-status" aria-live="polite"></p>
      </article>
    </main>
    <script type="module" src="/my/stories/preview/preview-story.js"></script>
  </body>
</html>`, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store'
    }
  });
}

function storyEditPage() {
  return new Response(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Edit Story — EverDraft</title>
    <meta name="description" content="Edit private EverDraft story metadata." />
    <link rel="icon" type="image/png" href="/favicon/favicon.png" />
    <link rel="stylesheet" href="/styles.css" />
  </head>
  <body>
    <div class="site-bg" aria-hidden="true"></div>
    <header class="navbar">
      <a href="/" class="brand" aria-label="EverDraft home">
        <img src="/favicon/favicon.png" alt="EverDraft logo" class="brand-logo" />
      </a>
      <nav aria-label="Primary navigation" class="social-nav">
        <a href="/my/stories/" class="nav-link">My Stories</a>
        <a href="/#waitlist" class="nav-link nav-link-primary">Join the Waitlist</a>
      </nav>
    </header>
    <main class="auth-main story-main">
      <section class="auth-panel story-panel" aria-labelledby="edit-story-title">
        <p class="eyebrow">STORY METADATA</p>
        <h1 id="edit-story-title">Edit Story</h1>
        <p class="hero-copy">Keep the public-facing story details ready. Chapter tools are not part of this phase.</p>
        <div id="readerNotice" class="notice-panel" hidden>You can only edit stories you created.</div>
        <div id="missingNotice" class="notice-panel" hidden>This story was not found, or it does not belong to your account.</div>
        <form id="storyForm" class="auth-form story-form" hidden>
          <label for="title">Title</label>
          <input id="title" name="title" type="text" required />
          <label for="slug">Slug</label>
          <input id="slug" name="slug" type="text" required />
          <label for="blurb">Blurb</label>
          <textarea id="blurb" name="blurb" rows="4"></textarea>
          <div class="form-grid">
            <div>
              <label for="genre">Genre</label>
              <input id="genre" name="genre" type="text" />
            </div>
            <div>
              <label for="status">Status</label>
              <select id="status" name="status">
                <option value="draft">Draft</option>
                <option value="ongoing">Ongoing</option>
                <option value="complete">Complete</option>
                <option value="hiatus">Hiatus</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <label for="coverUrl">Cover URL</label>
          <input id="coverUrl" name="coverUrl" type="url" />
          <label for="bannerUrl">Banner URL</label>
          <input id="bannerUrl" name="bannerUrl" type="url" />
          <div class="auth-actions">
            <button type="submit" id="saveStoryButton">Save Story</button>
            <a class="button-link secondary-link" id="manageChaptersLink" href="/my/stories/">Manage Chapters</a>
            <a class="button-link secondary-link" id="previewStoryLink" href="/my/stories/">Preview Story</a>
            <button type="button" id="archiveStoryButton" class="secondary-button">Archive Story</button>
          </div>
          <p id="storyStatus" class="form-status" aria-live="polite"></p>
        </form>
      </section>
    </main>
    <script type="module" src="/my/stories/edit/edit-story.js"></script>
  </body>
</html>`, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store'
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isStoryEditRoute = /^\/my\/stories\/[^/]+\/edit\/?$/.test(url.pathname);
    const isStoryPreviewRoute = /^\/my\/stories\/[^/]+\/preview\/?$/.test(url.pathname);
    const isChapterEditRoute = /^\/my\/stories\/[^/]+\/chapters\/[^/]+\/edit\/?$/.test(url.pathname);

    if (url.pathname === '/api/supabase-config') {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed.' }, 405);
      }

      return getSupabaseBrowserConfig(env);
    }

    if (url.pathname === '/api/dev/supabase-check') {
      if (request.method !== 'GET') {
        return jsonResponse({ error: 'Method not allowed.' }, 405);
      }

      return checkSupabaseConnection(env);
    }

    if (url.pathname === '/api/signup') {
      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed.' }, 405);
      }

      return saveWaitlistSignup(request, env);
    }

    if (env.ASSETS) {
      if (isStoryPreviewRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/my/stories/preview/index.html'));
      }

      if (isChapterEditRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/my/stories/chapters/edit/index.html'));
      }

      if (isStoryEditRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/my/stories/edit/index.html'));
      }

      return env.ASSETS.fetch(request);
    }

    if (isChapterEditRoute) {
      return chapterEditPage();
    }

    if (isStoryPreviewRoute) {
      return storyPreviewPage();
    }

    if (isStoryEditRoute) {
      return storyEditPage();
    }

    return new Response('Not found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8',
        'Cache-Control': 'no-store'
      }
    });
  }
};
