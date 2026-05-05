import { friendlyAuthError, requireSession } from '/auth.js';
import { friendlyChapterError, getChaptersForStory } from '/chapters.js';

const editStoryLink = document.getElementById('editStoryLink');
const previewTitle = document.getElementById('preview-title');
const previewMeta = document.getElementById('previewMeta');
const readerNotice = document.getElementById('readerNotice');
const missingNotice = document.getElementById('missingNotice');
const storyPreview = document.getElementById('storyPreview');
const storySummary = document.getElementById('storySummary');
const chapterPreviewList = document.getElementById('chapterPreviewList');
const status = document.getElementById('previewStatus');

function getStoryIdFromPath() {
  const match = window.location.pathname.match(/^\/my\/stories\/([^/]+)\/preview\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
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

function renderParagraphs(value) {
  const text = String(value || '').trim();
  if (!text) return '<p class="muted-copy">No content drafted yet.</p>';

  return text
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function renderPreview(story, chapters) {
  previewTitle.textContent = story.title || 'Untitled Story';
  previewMeta.textContent = `${story.genre || 'Genre not set'} · ${story.status || 'draft'} · Private author preview`;
  editStoryLink.href = `/my/stories/${story.id}/edit/`;

  storySummary.innerHTML = `
    <p class="eyebrow">${escapeHtml(story.slug || '')}</p>
    <h2>${escapeHtml(story.title || 'Untitled Story')}</h2>
    <p>${escapeHtml(story.blurb || 'No blurb drafted yet.')}</p>
  `;

  const visibleChapters = chapters.filter((chapter) => chapter.status !== 'archived');

  if (!visibleChapters.length) {
    chapterPreviewList.innerHTML = '<div class="empty-state">No chapter drafts to preview yet.</div>';
  } else {
    chapterPreviewList.innerHTML = visibleChapters.map((chapter) => `
      <section class="chapter-preview">
        <p class="eyebrow">Chapter ${chapter.chapter_number} · ${escapeHtml(chapter.status || 'draft')}</p>
        <h2>${escapeHtml(chapter.title)}</h2>
        <div class="chapter-content">${renderParagraphs(chapter.content)}</div>
      </section>
    `).join('');
  }

  storyPreview.hidden = false;
}

async function loadPreview() {
  try {
    const session = await requireSession();
    if (!session) return;

    const storyId = getStoryIdFromPath();
    const { canWrite, story, chapters } = await getChaptersForStory(storyId);

    if (!canWrite) {
      readerNotice.hidden = false;
      return;
    }

    if (!story) {
      missingNotice.hidden = false;
      previewMeta.textContent = 'Story unavailable.';
      return;
    }

    renderPreview(story, chapters);
  } catch (error) {
    status.textContent = error.message.includes('profile') ? friendlyAuthError(error) : friendlyChapterError(error);
  }
}

loadPreview();
