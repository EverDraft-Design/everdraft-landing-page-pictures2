import { friendlyAuthError, requireSession } from '/auth.js';
import { friendlyStoryError, getMyStories } from '/stories.js';

const readerNotice = document.getElementById('readerNotice');
const storyActions = document.getElementById('storyActions');
const storyList = document.getElementById('storyList');
const status = document.getElementById('storiesStatus');

function formatDate(value) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderStories(stories) {
  if (!stories.length) {
    storyList.innerHTML = '<div class="empty-state">Your shelf is waiting for its first draft.</div>';
    return;
  }

  storyList.innerHTML = stories.map((story) => `
    <article class="story-card">
      <div>
        <p class="eyebrow">${escapeHtml(story.status || 'draft')}</p>
        <h2>${escapeHtml(story.title)}</h2>
        <p>${escapeHtml(story.genre || 'Genre not set')}</p>
      </div>
      <dl class="story-meta">
        <div><dt>Created</dt><dd>${formatDate(story.created_at)}</dd></div>
        <div><dt>Updated</dt><dd>${formatDate(story.updated_at)}</dd></div>
      </dl>
      <div class="auth-actions">
        <a class="button-link secondary-link" href="/my/stories/${story.id}/edit/">Edit</a>
        <a class="button-link secondary-link" href="/my/stories/${story.id}/preview/">Preview</a>
      </div>
    </article>
  `).join('');
}

async function loadStories() {
  try {
    const session = await requireSession();
    if (!session) return;

    const { canWrite, stories } = await getMyStories();

    if (!canWrite) {
      readerNotice.hidden = false;
      storyList.innerHTML = '';
      return;
    }

    storyActions.hidden = false;
    renderStories(stories);
  } catch (error) {
    status.textContent = error.message.includes('profile') ? friendlyAuthError(error) : friendlyStoryError(error);
  }
}

loadStories();
