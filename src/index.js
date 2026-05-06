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

function fallbackHtmlPage({ title, description, navLink, eyebrow, heading, headingId = 'fallback-title', copy, body, script }) {
  return new Response(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} — EverDraft</title>
    <meta name="description" content="${description}" />
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
        ${navLink}
        <a href="/#waitlist" class="nav-link nav-link-primary">Join the Waitlist</a>
      </nav>
    </header>
    <main class="auth-main story-main">
      <section class="auth-panel story-panel" aria-labelledby="${headingId}">
        <p class="eyebrow">${eyebrow}</p>
        <h1 id="${headingId}">${heading}</h1>
        <p id="storySummary" class="hero-copy">${copy}</p>
        ${body}
      </section>
    </main>
    <script type="module" src="${script}"></script>
  </body>
</html>`, {
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store'
    }
  });
}

function storyManagePage() {
  return fallbackHtmlPage({
    title: 'Manage Story',
    description: 'Manage private EverDraft story chapters.',
    navLink: '<a href="/my/stories/" class="nav-link">My Stories</a>',
    eyebrow: 'STORY DRAFT',
    heading: 'Loading story...',
    headingId: 'story-title',
    copy: 'Checking chapter shelf...',
    body: `<div id="readerNotice" class="notice-panel" hidden>This story was not found, or it does not belong to your account.</div>
        <div id="storyActions" class="story-actions" hidden>
          <a class="button-link" id="addChapterLink" href="/my/stories/">Add Chapter</a>
          <a class="button-link secondary-link" id="editStoryLink" href="/my/stories/">Edit Details</a>
          <a class="button-link secondary-link" id="publicStoryLink" href="/my/stories/">Public Story</a>
        </div>
        <div id="chapterList" class="story-list" aria-live="polite"></div>
        <p id="storyStatus" class="form-status" aria-live="polite"></p>`,
    script: '/my/stories/show/story-show.js'
  });
}

function chapterNewPage() {
  return fallbackHtmlPage({
    title: 'Create Chapter',
    description: 'Create a private EverDraft chapter draft.',
    navLink: '<a id="backToStoryLink" href="/my/stories/" class="nav-link">Story</a>',
    eyebrow: 'NEW CHAPTER',
    heading: 'Create Chapter Draft',
    copy: 'Draft content for your story.',
    body: `<div id="readerNotice" class="notice-panel" hidden>This story was not found, or it does not belong to your account.</div>
        <form id="chapterForm" class="auth-form story-form" hidden>
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
          <label for="title">Title</label>
          <input id="title" name="title" type="text" required />
          <label for="content">Content</label>
          <textarea id="content" name="content" rows="18" class="chapter-editor" placeholder="Begin the chapter here..."></textarea>
          <div class="editor-meta">
            <span id="wordCount">0 words</span>
            <span id="lastSaved">Last saved: not yet</span>
          </div>
          <p class="field-note editor-note">Plain text is safest for this beta editor. Line breaks and paragraph spacing will be preserved on public reading pages.</p>
          <button type="submit" id="saveChapterButton">Save Draft</button>
          <p id="chapterStatus" class="form-status" aria-live="polite"></p>
        </form>`,
    script: '/my/stories/chapters/new/new-chapter.js'
  });
}

function chapterEditPage() {
  return fallbackHtmlPage({
    title: 'Edit Chapter',
    description: 'Edit a private EverDraft chapter draft.',
    navLink: '<a id="backToStoryLink" href="/my/stories/" class="nav-link">Story</a>',
    eyebrow: 'CHAPTER DRAFT',
    heading: 'Edit Chapter',
    copy: 'Loading chapter...',
    body: `<div id="readerNotice" class="notice-panel" hidden>This chapter was not found, or it does not belong to your story.</div>
        <form id="chapterForm" class="auth-form story-form" hidden>
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
          <label for="title">Title</label>
          <input id="title" name="title" type="text" required />
          <label for="content">Content</label>
          <textarea id="content" name="content" rows="18" class="chapter-editor" placeholder="Continue the chapter here..."></textarea>
          <div class="editor-meta">
            <span id="wordCount">0 words</span>
            <span id="lastSaved">Last saved: not yet</span>
          </div>
          <p class="field-note editor-note">Plain text is safest for this beta editor. Line breaks and paragraph spacing will be preserved on public reading pages.</p>
          <div class="auth-actions">
            <button type="submit" id="saveChapterButton">Save Draft</button>
            <button type="button" id="archiveChapterButton" class="secondary-button">Archive Chapter</button>
          </div>
          <p id="chapterStatus" class="form-status" aria-live="polite"></p>
        </form>`,
    script: '/my/stories/chapters/edit/edit-chapter.js'
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isStoryEditRoute = /^\/my\/stories\/[^/]+\/edit\/?$/.test(url.pathname);
    const isStoryManageRoute = /^\/my\/stories\/[^/]+\/?$/.test(url.pathname);
    const isChapterNewRoute = /^\/my\/stories\/[^/]+\/chapters\/new\/?$/.test(url.pathname);
    const isChapterEditRoute = /^\/my\/stories\/[^/]+\/chapters\/[^/]+\/edit\/?$/.test(url.pathname);
    const isPublicChapterRoute = /^\/story\/[^/]+\/chapter\/[^/]+\/?$/.test(url.pathname);
    const isPublicStoryRoute = /^\/story\/[^/]+\/?$/.test(url.pathname);

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
      if (isPublicChapterRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/story/chapter/index.html'));
      }

      if (isPublicStoryRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/story/index.html'));
      }

      if (isChapterEditRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/my/stories/chapters/edit/index.html'));
      }

      if (isChapterNewRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/my/stories/chapters/new/index.html'));
      }

      if (isStoryEditRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/my/stories/edit/index.html'));
      }

      if (isStoryManageRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/my/stories/show/index.html'));
      }

      return env.ASSETS.fetch(request);
    }

    if (isStoryEditRoute) {
      return storyEditPage();
    }

    if (isStoryManageRoute) {
      return storyManagePage();
    }

    if (isChapterNewRoute) {
      return chapterNewPage();
    }

    if (isChapterEditRoute) {
      return chapterEditPage();
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
