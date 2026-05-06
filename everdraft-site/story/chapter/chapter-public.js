import { friendlyChapterError, getPublicChapterBySlugAndNumber } from '/chapters.js';

const backToStoryLink = document.getElementById('backToStoryLink');
const storyTitle = document.getElementById('storyTitle');
const chapterTitle = document.getElementById('chapter-title');
const chapterMeta = document.getElementById('chapterMeta');
const unavailableNotice = document.getElementById('unavailableNotice');
const chapterContent = document.getElementById('chapterContent');
const previousChapterLink = document.getElementById('previousChapterLink');
const nextChapterLink = document.getElementById('nextChapterLink');
const status = document.getElementById('chapterStatus');

function getRouteParts() {
  const match = window.location.pathname.match(/^\/story\/([^/]+)\/chapter\/([^/]+)\/?$/);
  return {
    slug: match ? decodeURIComponent(match[1]) : '',
    chapterNumber: match ? decodeURIComponent(match[2]) : ''
  };
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

function renderParagraphs(content) {
  const paragraphs = String(content || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`).join('');
}

function setNavLink(link, story, chapter, text) {
  if (!chapter) return;
  link.href = `/story/${story.slug}/chapter/${chapter.chapter_number}/`;
  link.textContent = text;
  link.hidden = false;
}

async function loadChapter() {
  const { slug, chapterNumber } = getRouteParts();
  backToStoryLink.href = `/story/${slug}/`;

  try {
    const { story, chapter, previousChapter, nextChapter } = await getPublicChapterBySlugAndNumber(slug, chapterNumber);

    if (!story || !chapter) {
      chapterTitle.textContent = 'Chapter unavailable';
      unavailableNotice.hidden = false;
      return;
    }

    storyTitle.textContent = story.title || 'EverDraft story';
    chapterTitle.textContent = chapter.title || 'Untitled chapter';
    chapterMeta.textContent = `Chapter ${chapter.chapter_number}`;
    chapterContent.innerHTML = renderParagraphs(chapter.content);
    chapterContent.hidden = false;
    setNavLink(previousChapterLink, story, previousChapter, 'Previous Chapter');
    setNavLink(nextChapterLink, story, nextChapter, 'Next Chapter');
  } catch (error) {
    status.textContent = friendlyChapterError(error);
  }
}

loadChapter();
