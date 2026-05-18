import { friendlyStoryError, getLibraryStories } from '/stories.js';
import { mountFollowControls } from '/follow-controls.js';
import { mountStorySparkControl } from '/spark-controls.js';

const libraryList = document.getElementById('libraryList');
const status = document.getElementById('libraryStatus');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function snippet(value, maxLength = 220) {
  const text = String(value || '').trim();
  if (!text) return 'No blurb has been added yet.';
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function formatStatus(value) {
  if (value === 'complete') return 'Complete';
  if (value === 'ongoing') return 'Ongoing';
  return value || 'Story';
}

function renderAuthorByline(author, authorName) {
  if (!author?.username) return `By ${escapeHtml(authorName)}`;
  return `By <a href="/writer/${escapeHtml(author.username)}/">${escapeHtml(authorName)}</a>`;
}

function renderCover(story) {
  if (!story.cover_url) {
    const initial = String(story.title || 'E').trim().charAt(0).toUpperCase() || 'E';
    return `
      <div class="library-cover-frame library-cover-placeholder" aria-hidden="true">
        <span>${escapeHtml(initial)}</span>
      </div>
    `;
  }

  return `
    <div class="library-cover-frame">
      <img src="${escapeHtml(story.cover_url)}" alt="${escapeHtml(story.title)} cover art" loading="lazy" />
    </div>
  `;
}

function renderEmptyState() {
  libraryList.innerHTML = `
    <div class="empty-state library-empty">
      <h2>The shelves are still being filled.</h2>
      <p>Stories will appear here as writers begin publishing chapters to EverDraft.</p>
      <div class="auth-actions">
        <a class="button-link" href="/signup/">Create Account</a>
        <a class="button-link secondary-link" href="/">Return Home</a>
      </div>
    </div>
  `;
}

function renderStories(stories) {
  if (!stories.length) {
    renderEmptyState();
    return;
  }

  libraryList.innerHTML = stories.map((story) => {
    const author = story.author || {};
    const authorName = author.pen_name || author.display_name || author.username || 'EverDraft Writer';
    const chapterCount = Number(story.chapter_count) || 0;

    return `
      <article class="story-card library-card">
        ${renderCover(story)}
        <div class="library-card-body">
          <div>
            <p class="eyebrow">${escapeHtml(formatStatus(story.status))}</p>
            <h2>${escapeHtml(story.title)}</h2>
            <p class="library-byline">${renderAuthorByline(author, authorName)}</p>
          </div>
          <p>${escapeHtml(snippet(story.blurb))}</p>
          <dl class="story-meta">
            <div><dt>Genre</dt><dd>${escapeHtml(story.genre || 'Genre not set')}</dd></div>
            <div><dt>Chapters</dt><dd>${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'}</dd></div>
          </dl>
          <div class="library-card-actions">
            <a class="button-link" href="/story/${story.slug}/">Read Story</a>
            <div class="library-spark-control" data-library-spark-control="${escapeHtml(story.id)}" aria-label="Spark ${escapeHtml(story.title)}"></div>
          </div>
          <div class="library-follow-controls" data-library-follow-controls="${escapeHtml(story.id)}" aria-label="Follow ${escapeHtml(story.title)}"></div>
        </div>
      </article>
    `;
  }).join('');
}

async function mountLibrarySparkControls(stories) {
  await Promise.all(stories.map((story) => {
    const container = [...libraryList.querySelectorAll('[data-library-spark-control]')]
      .find((element) => element.dataset.librarySparkControl === story.id);
    if (!container) return null;
    container.addEventListener('sparkerror', (event) => {
      status.textContent = event.detail;
    });
    return mountStorySparkControl(container, story);
  }));
}

async function mountLibraryFollowControls(stories) {
  await Promise.all(stories.map((story) => {
    const container = [...libraryList.querySelectorAll('[data-library-follow-controls]')]
      .find((element) => element.dataset.libraryFollowControls === story.id);
    if (!container) return null;
    container.addEventListener('followerror', (event) => {
      status.textContent = event.detail;
    });
    return mountFollowControls(container, story, { compact: true, mode: 'story' });
  }));
}

async function loadLibrary() {
  try {
    const stories = await getLibraryStories();
    renderStories(stories);
    await mountLibrarySparkControls(stories);
    await mountLibraryFollowControls(stories);
  } catch (error) {
    status.textContent = friendlyStoryError(error);
    renderEmptyState();
  }
}

loadLibrary();
