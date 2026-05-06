import { friendlyStoryError, getLibraryStories } from '/stories.js';

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
        <a class="button-link" href="/#waitlist">Join the Waitlist</a>
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
            <p class="library-byline">By ${escapeHtml(authorName)}</p>
          </div>
          <p>${escapeHtml(snippet(story.blurb))}</p>
          <dl class="story-meta">
            <div><dt>Genre</dt><dd>${escapeHtml(story.genre || 'Genre not set')}</dd></div>
            <div><dt>Chapters</dt><dd>${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'}</dd></div>
          </dl>
          <div class="auth-actions">
            <a class="button-link secondary-link" href="/story/${story.slug}/">Read Story</a>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

async function loadLibrary() {
  try {
    renderStories(await getLibraryStories());
  } catch (error) {
    status.textContent = friendlyStoryError(error);
    renderEmptyState();
  }
}

loadLibrary();
