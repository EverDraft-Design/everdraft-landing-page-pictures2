import { getLibraryStories } from '/stories.js';

const libraryList = document.getElementById('homeLibraryList');
const libraryStatus = document.getElementById('homeLibraryStatus');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function formatStatus(value) {
  if (value === 'complete') return 'Complete';
  if (value === 'ongoing') return 'In progress';
  return value || 'Story';
}

function renderCover(story) {
  if (!story.cover_url) {
    const initial = String(story.title || 'E').trim().charAt(0).toUpperCase() || 'E';
    return `
      <div class="home-library-cover home-library-cover-placeholder" aria-hidden="true">
        <span>${escapeHtml(initial)}</span>
      </div>
    `;
  }

  return `
    <div class="home-library-cover">
      <img
        src="${escapeHtml(story.cover_url)}"
        alt="${escapeHtml(story.title)} cover art"
        loading="lazy"
        onerror="this.hidden=true"
      />
    </div>
  `;
}

function renderAuthor(author, authorName) {
  if (!author?.username) return escapeHtml(authorName);
  return `<a href="/writer/${escapeHtml(author.username)}/">${escapeHtml(authorName)}</a>`;
}

function renderStories(stories) {
  const previewStories = stories.slice(0, 4);

  if (!previewStories.length) {
    libraryList.innerHTML = `
      <div class="home-library-empty">
        <h3>The next story could be yours.</h3>
        <p>Writers are adding new worlds, chapters, and drafts to the Library.</p>
        <a class="button-link" href="/signup/">Add your story</a>
      </div>
    `;
    return;
  }

  libraryList.innerHTML = previewStories.map((story) => {
    const author = story.author || {};
    const authorName = author.pen_name || author.display_name || author.username || 'EverDraft Writer';
    const chapterCount = Number(story.chapter_count) || 0;

    return `
      <article class="home-library-card">
        <a class="home-library-cover-link" href="/story/${escapeHtml(story.slug)}/" aria-label="Read ${escapeHtml(story.title)}">
          ${renderCover(story)}
        </a>
        <div class="home-library-card-body">
          <p class="eyebrow">${escapeHtml(formatStatus(story.status))}</p>
          <h3><a href="/story/${escapeHtml(story.slug)}/">${escapeHtml(story.title)}</a></h3>
          <p class="home-library-byline">By ${renderAuthor(author, authorName)}</p>
          <dl class="home-library-meta">
            <div>
              <dt>Genre</dt>
              <dd>${escapeHtml(story.genre || 'Not yet set')}</dd>
            </div>
            <div>
              <dt>Chapters</dt>
              <dd>${chapterCount}</dd>
            </div>
          </dl>
          <a class="home-story-link" href="/story/${escapeHtml(story.slug)}/">Read story <span aria-hidden="true">→</span></a>
        </div>
      </article>
    `;
  }).join('');
}

async function loadLibraryPreview() {
  if (!libraryList || !libraryStatus) return;

  try {
    const stories = await getLibraryStories();
    renderStories(stories);
  } catch (error) {
    libraryList.innerHTML = `
      <div class="home-library-empty">
        <h3>The Library is still open.</h3>
        <p>We could not load the preview just now, but you can continue to the full Library.</p>
      </div>
    `;
    libraryStatus.textContent = '';
  }
}

loadLibraryPreview();
