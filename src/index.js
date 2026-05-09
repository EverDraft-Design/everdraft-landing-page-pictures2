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
        <div class="auth-actions top-return-actions">
          <a class="button-link secondary-link" href="/my/stories/">Back to My Stories</a>
        </div>
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
    body: `<div class="auth-actions top-return-actions">
          <a class="button-link secondary-link" href="/my/stories/">Back to My Stories</a>
        </div>
        <div id="readerNotice" class="notice-panel" hidden>This story was not found, or it does not belong to your account.</div>
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
    navLink: '<a id="backToStoryLink" href="/my/stories/" class="nav-link">Story Management</a>',
    eyebrow: 'NEW CHAPTER',
    heading: 'Create Chapter Draft',
    copy: 'Draft content for your story.',
    body: `<div class="auth-actions top-return-actions">
          <a id="storyManagementLink" class="button-link secondary-link" href="/my/stories/">Back to Story Management</a>
        </div>
        <div id="readerNotice" class="notice-panel" hidden>This story was not found, or it does not belong to your account.</div>
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
    navLink: '<a id="backToStoryLink" href="/my/stories/" class="nav-link">Story Management</a>',
    eyebrow: 'CHAPTER DRAFT',
    heading: 'Edit Chapter',
    copy: 'Loading chapter...',
    body: `<div class="auth-actions top-return-actions">
          <a id="storyManagementLink" class="button-link secondary-link" href="/my/stories/">Back to Story Management</a>
        </div>
        <div id="readerNotice" class="notice-panel" hidden>This chapter was not found, or it does not belong to your story.</div>
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

function libraryPage() {
  return fallbackHtmlPage({
    title: 'The EverDraft Library',
    description: 'The EverDraft Library is an early public shelf for readable stories beginning to find their readers.',
    navLink: '<a href="/journal/" class="nav-link">Journal</a>',
    eyebrow: 'EARLY STORY SHELF',
    heading: 'The EverDraft Library',
    headingId: 'library-title',
    copy: 'A quiet shelf for stories beginning to find their readers.',
    body: `<p class="library-note">The Library is opening gradually as EverDraft’s story tools are built.</p>
        <div class="auth-actions top-return-actions">
          <a class="button-link secondary-link" href="/">Return Home</a>
        </div>
        <div id="libraryList" class="library-grid" aria-live="polite"></div>
        <p id="libraryStatus" class="form-status" aria-live="polite"></p>`,
    script: '/library/library.js'
  });
}

function publicStoryPage() {
  return fallbackHtmlPage({
    title: 'Story',
    description: 'Read a public EverDraft story.',
    navLink: '<a href="/library/" class="nav-link">Library</a>',
    eyebrow: 'EVERDRAFT STORY',
    heading: 'Loading story...',
    headingId: 'story-title',
    copy: '',
    body: `<p id="storyByline" class="hero-copy"></p>
        <div class="auth-actions top-return-actions">
          <a class="button-link secondary-link" href="/library/">Return to Library</a>
        </div>
        <div id="storyFollowControls" class="follow-actions story-follow-control" aria-label="Follow story"></div>
        <div id="storySparkControl" class="story-spark-control" aria-label="Spark story"></div>
        <div id="coverWrap" class="story-cover" hidden></div>
        <div id="storyMeta" class="preview-summary" hidden></div>
        <div id="unreadableNotice" class="notice-panel" hidden>This story is not currently readable on EverDraft.</div>
        <section aria-labelledby="chapters-title">
          <h2 id="chapters-title">Chapters</h2>
          <div id="chapterList" class="story-list" aria-live="polite"></div>
        </section>
        <p id="storyStatus" class="form-status" aria-live="polite"></p>`,
    script: '/story/story-public.js'
  });
}

function publicChapterPage() {
  return fallbackHtmlPage({
    title: 'Chapter',
    description: 'Read a public EverDraft chapter.',
    navLink: '<a id="backToStoryLink" href="/story/" class="nav-link">Story</a>',
    eyebrow: 'EVERDRAFT STORY',
    heading: 'Loading chapter...',
    headingId: 'chapter-title',
    copy: '',
    body: `<p id="storyTitle" class="eyebrow">EVERDRAFT STORY</p>
        <p id="chapterMeta" class="hero-copy"></p>
        <div id="chapterFollowControls" class="follow-actions chapter-follow-control reading-follow-actions" aria-label="Follow story"></div>
        <div id="chapterSparkControl" class="chapter-spark-control" aria-label="Spark chapter"></div>
        <div id="unavailableNotice" class="notice-panel" hidden>This chapter is not currently available on EverDraft.</div>
        <section id="chapterContent" class="chapter-content reading-content" hidden></section>
        <section id="notePanel" class="note-panel" aria-labelledby="note-title" hidden>
          <p class="eyebrow">PRIVATE NOTE</p>
          <h2 id="note-title">Leave a Note</h2>
          <p>Send the writer a private note about this chapter — something that moved you, made you curious, confused you, or made you want to keep reading.</p>
          <p class="field-note">Notes are only visible to the writer. Leaving a Note also adds your Spark to this chapter.</p>
          <form id="noteForm" class="auth-form note-form">
            <label for="noteType">Note Type</label>
            <select id="noteType" name="noteType">
              <option value="encouragement">Encouragement</option>
              <option value="reader_reaction">Reader Reaction</option>
              <option value="character_thought">Character Thought</option>
              <option value="plot_thought">Plot Thought</option>
              <option value="pacing_thought">Pacing Thought</option>
              <option value="clarity_note">Clarity Note</option>
              <option value="tiny_typo">Tiny Typo</option>
            </select>
            <label for="note">Note</label>
            <textarea id="note" name="note" rows="5" placeholder="Leave something kind, curious, or useful for the writer."></textarea>
            <button type="submit" id="leaveNoteButton">Leave Note</button>
          </form>
          <p id="noteStatus" class="form-status" aria-live="polite"></p>
        </section>
        <nav class="reader-nav" aria-label="Chapter navigation">
          <a id="previousChapterLink" class="button-link secondary-link" href="#" hidden>Previous Chapter</a>
          <a id="chapterBackToStoryLink" class="button-link secondary-link" href="/story/">Back to Story</a>
          <a class="button-link secondary-link" href="/library/">Return to Library</a>
          <a id="nextChapterLink" class="button-link secondary-link" href="#" hidden>Next Chapter</a>
        </nav>
        <p id="chapterStatus" class="form-status" aria-live="polite"></p>`,
    script: '/story/chapter/chapter-public.js'
  });
}

function writerProfilePage() {
  return fallbackHtmlPage({
    title: 'Writer',
    description: 'Read an EverDraft writer profile.',
    navLink: '<a href="/library/" class="nav-link">Library</a>',
    eyebrow: 'EVERDRAFT WRITER',
    heading: 'Loading writer...',
    headingId: 'writer-title',
    copy: '',
    body: `<p id="writerMeta" class="hero-copy"></p>
        <div class="auth-actions top-return-actions">
          <a class="button-link secondary-link" href="/library/">Back to Library</a>
        </div>
        <div id="writerFollowControls" class="follow-actions" aria-label="Follow writer"></div>
        <div id="writerBio" class="preview-summary writer-bio" hidden></div>
        <section aria-labelledby="writer-stories-title">
          <h2 id="writer-stories-title">Public Stories</h2>
          <div id="writerStoriesList" class="story-list writer-story-list" aria-live="polite"></div>
        </section>
        <p id="writerStatus" class="form-status" aria-live="polite"></p>`,
    script: '/writer/writer-public.js'
  });
}

function pinboardPage() {
  return fallbackHtmlPage({
    title: 'Pinboard',
    description: 'View private EverDraft Reader Notes.',
    navLink: '<a href="/account/" class="nav-link">Account</a><a href="/my/stories/" class="nav-link">My Stories</a>',
    eyebrow: 'READER NOTES',
    heading: 'Pinboard',
    headingId: 'pinboard-title',
    copy: 'Reader Notes from your stories gather here — little sparks of encouragement, questions, and thoughts from the people following along.',
    body: `<div class="auth-actions pinboard-top-actions">
          <a class="button-link secondary-link" href="/account/">Back to Account</a>
        </div>
        <div id="pinboardList" class="pinboard-list" aria-live="polite"></div>
        <p id="pinboardStatus" class="form-status" aria-live="polite"></p>`,
    script: '/account/pinboard/pinboard.js'
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const isPinboardRoute = /^\/account\/pinboard\/?$/.test(url.pathname);
    const isLibraryRoute = /^\/library\/?$/.test(url.pathname);
    const isStoryEditRoute = /^\/my\/stories\/[^/]+\/edit\/?$/.test(url.pathname);
    const isStoryManageRoute = /^\/my\/stories\/[^/]+\/?$/.test(url.pathname);
    const isChapterNewRoute = /^\/my\/stories\/[^/]+\/chapters\/new\/?$/.test(url.pathname);
    const isChapterEditRoute = /^\/my\/stories\/[^/]+\/chapters\/[^/]+\/edit\/?$/.test(url.pathname);
    const isPublicChapterRoute = /^\/story\/[^/]+\/chapter\/[^/]+\/?$/.test(url.pathname);
    const isPublicStoryRoute = /^\/story\/[^/]+\/?$/.test(url.pathname);
    const isWriterRoute = /^\/writer\/[^/]+\/?$/.test(url.pathname);

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
      if (isPinboardRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/account/pinboard/index.html'));
      }

      if (isLibraryRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/library/index.html'));
      }

      if (isPublicChapterRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/story/chapter/index.html'));
      }

      if (isPublicStoryRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/story/index.html'));
      }

      if (isWriterRoute) {
        return env.ASSETS.fetch(rewriteAssetRequest(request, '/writer/index.html'));
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

    if (isPinboardRoute) {
      return pinboardPage();
    }

    if (isLibraryRoute) {
      return libraryPage();
    }

    if (isPublicChapterRoute) {
      return publicChapterPage();
    }

    if (isPublicStoryRoute) {
      return publicStoryPage();
    }

    if (isWriterRoute) {
      return writerProfilePage();
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
