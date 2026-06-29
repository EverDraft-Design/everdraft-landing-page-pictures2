import { friendlyChapterError, getPublicPublishedChaptersForStory, getPublicStoryBySlug } from '/chapters.js';
import { mountFollowControls } from '/follow-controls.js';
import { mountStorySparkControl } from '/spark-controls.js';
import { friendlyJourneyError, getPublicMilestonesForStory } from '/journey.js';

const title = document.getElementById('story-title');
const byline = document.getElementById('storyByline');
const coverWrap = document.getElementById('coverWrap');
const meta = document.getElementById('storyMeta');
const unreadableNotice = document.getElementById('unreadableNotice');
const chapterList = document.getElementById('chapterList');
const status = document.getElementById('storyStatus');
const storyFollowControls = document.getElementById('storyFollowControls');
const storySparkControl = document.getElementById('storySparkControl');
const journeyPanel = document.getElementById('storyJourney');
const journeyList = document.getElementById('journeyList');

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

function renderAuthorByline(author, authorName) {
  if (!author?.username) return `By ${escapeHtml(authorName)}`;
  return `By <a href="/writer/${escapeHtml(author.username)}/">${escapeHtml(authorName)}</a> · @${escapeHtml(author.username)}`;
}


function formatDate(value) {
  if (!value) return 'Unknown date';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCount(value, singular, plural = `${singular}s`) {
  const count = Number(value) || 0;
  return `${count} ${count === 1 ? singular : plural}`;
}

function renderJourneyMilestones(milestones) {
  if (!journeyPanel || !journeyList || !milestones.length) return;
  journeyPanel.hidden = false;
  journeyList.innerHTML = milestones.map((milestone) => `
    <article class="journey-card public-journey-card">
      <p class="eyebrow">${escapeHtml(milestone.title)}</p>
      ${milestone.reflection ? `<p>${escapeHtml(milestone.reflection)}</p>` : '<p class="muted-copy">A preserved moment from this story’s growth.</p>'}
      <dl class="story-meta">
        <div><dt>Created</dt><dd>${formatDate(milestone.created_at)}</dd></div>
        <div><dt>Snapshot</dt><dd>${formatCount(milestone.snapshot?.chapters?.length || 0, 'chapter')}</dd></div>
        <div><dt>Words</dt><dd>${formatCount(milestone.word_count, 'word')}</dd></div>
      </dl>
    </article>
  `).join('');
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
    const authorName = author.pen_name || author.display_name || author.username || 'EverDraft member';
    title.textContent = story.title || 'Untitled story';
    byline.innerHTML = renderAuthorByline(author, authorName);
    renderImage(coverWrap, story.cover_url, `${story.title} cover`, 'story-cover-image');
    meta.hidden = false;
    meta.innerHTML = `
      <h2>${escapeHtml(story.genre || 'Genre not set')}</h2>
      <p>${escapeHtml(story.blurb || 'No blurb has been added yet.')}</p>
      <p class="muted-copy">Status: ${escapeHtml(story.status || 'draft')}</p>
    `;
    storyFollowControls.addEventListener('followerror', (event) => {
      status.textContent = event.detail;
    });
    storySparkControl.addEventListener('sparkerror', (event) => {
      status.textContent = event.detail;
    });
    await mountStorySparkControl(storySparkControl, story);
    await mountFollowControls(storyFollowControls, story, { mode: 'story', compact: true });
    try {
      renderJourneyMilestones(await getPublicMilestonesForStory(story.id));
    } catch (journeyError) {
      journeyPanel.hidden = true;
    }

    if (!story.is_readable) {
      unreadableNotice.hidden = false;
      chapterList.innerHTML = '';
      return;
    }

    renderChapters(story, await getPublicPublishedChaptersForStory(story.id));
  } catch (error) {
    status.textContent = error.message.includes('Journey') ? friendlyJourneyError(error) : friendlyChapterError(error);
  }
}

loadStory();