import { friendlyAuthError, requireSession } from '/auth.js';
import { friendlyChapterError, getChaptersForStory } from '/chapters.js';

const storyTitle = document.getElementById('storyTitle');
const readerNotice = document.getElementById('readerNotice');
const missingNotice = document.getElementById('missingNotice');
const chapterActions = document.getElementById('chapterActions');
const newChapterLink = document.getElementById('newChapterLink');
const chapterList = document.getElementById('chapterList');
const status = document.getElementById('chaptersStatus');

function getStoryId() {
  return new URLSearchParams(window.location.search).get('storyId') || '';
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
    chapterList.innerHTML = '<div class="empty-state">This story is waiting for its first chapter draft.</div>';
    return;
  }

  chapterList.innerHTML = chapters.map((chapter) => `
    <article class="story-card">
      <div>
        <p class="eyebrow">Chapter ${chapter.chapter_number} · ${escapeHtml(chapter.status || 'draft')}</p>
        <h2>${escapeHtml(chapter.title)}</h2>
      </div>
      <a class="button-link secondary-link" href="/my/stories/${storyId}/chapters/${chapter.id}/edit/">Edit Chapter</a>
    </article>
  `).join('');
}

async function loadChapters() {
  try {
    const session = await requireSession();
    if (!session) return;

    const storyId = getStoryId();
    const { canWrite, story, chapters } = await getChaptersForStory(storyId);

    if (!canWrite) {
      readerNotice.hidden = false;
      return;
    }

    if (!story) {
      missingNotice.hidden = false;
      storyTitle.textContent = 'Story unavailable.';
      return;
    }

    storyTitle.textContent = story.title;
    newChapterLink.href = `/my/stories/chapters/new/?storyId=${encodeURIComponent(story.id)}`;
    chapterActions.hidden = false;
    renderChapters(story.id, chapters);
  } catch (error) {
    status.textContent = error.message.includes('profile') ? friendlyAuthError(error) : friendlyChapterError(error);
  }
}

loadChapters();
