import { friendlyAuthError, requireSession } from '/auth.js';
import { friendlyChapterError, getChaptersForAuthorStory } from '/chapters.js';

const title = document.getElementById('story-title');
const summary = document.getElementById('storySummary');
const readerNotice = document.getElementById('readerNotice');
const storyActions = document.getElementById('storyActions');
const addChapterLink = document.getElementById('addChapterLink');
const editStoryLink = document.getElementById('editStoryLink');
const publicStoryLink = document.getElementById('publicStoryLink');
const chapterList = document.getElementById('chapterList');
const status = document.getElementById('storyStatus');

function getStoryId() {
  const match = window.location.pathname.match(/^\/my\/stories\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

function formatDate(value) {
  if (!value) return 'Not published';
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

function renderChapters(storyId, chapters) {
  if (!chapters.length) {
    chapterList.innerHTML = '<div class="empty-state">This story is waiting for its first chapter.</div>';
    return;
  }

  chapterList.innerHTML = chapters.map((chapter) => `
    <article class="story-card">
      <div>
        <p class="eyebrow">Chapter ${chapter.chapter_number} · ${escapeHtml(chapter.status || 'draft')}</p>
        <h2>${escapeHtml(chapter.title)}</h2>
      </div>
      <dl class="story-meta">
        <div><dt>Published</dt><dd>${formatDate(chapter.published_at)}</dd></div>
        <div><dt>Updated</dt><dd>${formatDate(chapter.updated_at)}</dd></div>
      </dl>
      <div class="auth-actions">
        <a class="button-link secondary-link" href="/my/stories/${storyId}/chapters/${chapter.id}/edit/">Edit Chapter</a>
      </div>
    </article>
  `).join('');
}

async function loadStory() {
  try {
    const session = await requireSession();
    if (!session) return;

    const storyId = getStoryId();
    const { story, chapters } = await getChaptersForAuthorStory(storyId);

    if (!story) {
      readerNotice.hidden = false;
      title.textContent = 'Story unavailable';
      summary.textContent = '';
      return;
    }

    title.textContent = story.title || 'Untitled story';
    summary.textContent = `${story.genre || 'Genre not set'} · ${story.status || 'draft'} · ${story.slug || 'no-slug'}`;
    addChapterLink.href = `/my/stories/${story.id}/chapters/new/`;
    editStoryLink.href = `/my/stories/${story.id}/edit/`;
    publicStoryLink.href = story.slug ? `/story/${story.slug}/` : '/my/stories/';
    storyActions.hidden = false;
    renderChapters(story.id, chapters);
  } catch (error) {
    status.textContent = error.message.includes('profile') ? friendlyAuthError(error) : friendlyChapterError(error);
  }
}

loadStory();
