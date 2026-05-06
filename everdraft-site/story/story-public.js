import { friendlyChapterError, getPublicPublishedChaptersForStory, getPublicStoryBySlug } from '/chapters.js';

const title = document.getElementById('story-title');
const byline = document.getElementById('storyByline');
const bannerWrap = document.getElementById('bannerWrap');
const coverWrap = document.getElementById('coverWrap');
const meta = document.getElementById('storyMeta');
const unreadableNotice = document.getElementById('unreadableNotice');
const chapterList = document.getElementById('chapterList');
const status = document.getElementById('storyStatus');

function getSlug() {
  const match = window.location.pathname.match(/^\/story\/([^/]+)\/?$/);
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

function renderImage(wrap, url, alt, className) {
  if (!url) return;
  wrap.innerHTML = `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" />`;
  wrap.hidden = false;
}

function renderChapters(story, chapters) {
  if (!chapters.length) {
    chapterList.innerHTML = '<div class="empty-state">No published chapters are available yet.</div>';
    return;
  }

  chapterList.innerHTML = chapters.map((chapter) => `
    <article class="story-card">
      <p class="eyebrow">Chapter ${chapter.chapter_number}</p>
      <h2>${escapeHtml(chapter.title)}</h2>
      <div class="auth-actions">
        <a class="button-link secondary-link" href="/story/${story.slug}/chapter/${chapter.chapter_number}/">Read Chapter</a>
      </div>
    </article>
  `).join('');
}

async function loadStory() {
  try {
    const story = await getPublicStoryBySlug(getSlug());

    if (!story) {
      title.textContent = 'Story unavailable';
      chapterList.innerHTML = '<div class="empty-state">This story was not found.</div>';
      return;
    }

    const author = story.author || {};
    const authorName = author.pen_name || author.display_name || 'EverDraft member';
    title.textContent = story.title || 'Untitled story';
    byline.textContent = `By ${authorName}${author.username ? ` · @${author.username}` : ''}`;
    renderImage(bannerWrap, story.banner_url, `${story.title} banner`, 'story-banner-image');
    renderImage(coverWrap, story.cover_url, `${story.title} cover`, 'story-cover-image');
    meta.hidden = false;
    meta.innerHTML = `
      <h2>${escapeHtml(story.genre || 'Genre not set')}</h2>
      <p>${escapeHtml(story.blurb || 'No blurb has been added yet.')}</p>
      <p class="muted-copy">Status: ${escapeHtml(story.status || 'draft')}</p>
    `;

    if (!story.is_readable) {
      unreadableNotice.hidden = false;
      chapterList.innerHTML = '';
      return;
    }

    renderChapters(story, await getPublicPublishedChaptersForStory(story.id));
  } catch (error) {
    status.textContent = friendlyChapterError(error);
  }
}

loadStory();
