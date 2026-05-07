import { friendlyChapterError, getPublicPublishedChaptersForStory, getPublicStoryBySlug } from '/chapters.js';
import { getCurrentProfile, getCurrentSession } from '/auth.js';
import {
  followStory,
  followWriter,
  friendlyFollowError,
  getStoryFollowerCount,
  getWriterFollowerCount,
  isFollowingStory,
  isFollowingWriter,
  unfollowStory,
  unfollowWriter
} from '/follows.js';

const title = document.getElementById('story-title');
const byline = document.getElementById('storyByline');
const bannerWrap = document.getElementById('bannerWrap');
const coverWrap = document.getElementById('coverWrap');
const meta = document.getElementById('storyMeta');
const unreadableNotice = document.getElementById('unreadableNotice');
const chapterList = document.getElementById('chapterList');
const status = document.getElementById('storyStatus');
const storyFollowPanel = document.getElementById('storyFollowPanel');
const storyFollowButton = document.getElementById('storyFollowButton');
const storyFollowerCount = document.getElementById('storyFollowerCount');
const storyFollowPrompt = document.getElementById('storyFollowPrompt');
const writerFollowPanel = document.getElementById('writerFollowPanel');
const writerFollowButton = document.getElementById('writerFollowButton');
const writerFollowerCount = document.getElementById('writerFollowerCount');
const writerFollowPrompt = document.getElementById('writerFollowPrompt');

let currentStory = null;
let currentProfile = null;
let followingStory = false;
let followingWriter = false;

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

function formatFollowers(count) {
  return `${count} ${count === 1 ? 'follower' : 'followers'}`;
}

async function getViewerProfile() {
  const session = await getCurrentSession();
  if (!session) return null;
  return getCurrentProfile();
}

function setFollowButtonState(button, isFollowing, followLabel, unfollowLabel) {
  button.textContent = isFollowing ? unfollowLabel : followLabel;
  button.hidden = false;
  button.disabled = false;
}

async function renderFollowControls(story) {
  storyFollowPanel.hidden = false;
  writerFollowPanel.hidden = false;
  storyFollowButton.hidden = true;
  writerFollowButton.hidden = true;
  storyFollowPrompt.textContent = '';
  writerFollowPrompt.textContent = '';

  const [storyCount, writerCount] = await Promise.all([
    getStoryFollowerCount(story.id),
    getWriterFollowerCount(story.author_id)
  ]);

  storyFollowerCount.textContent = formatFollowers(storyCount);
  writerFollowerCount.textContent = formatFollowers(writerCount);
  currentProfile = await getViewerProfile();

  if (!currentProfile) {
    storyFollowPrompt.textContent = 'Sign in to follow this story.';
    writerFollowPrompt.textContent = 'Sign in to follow this writer.';
    return;
  }

  if (story.author_id === currentProfile.id) {
    storyFollowPrompt.textContent = 'This is your story.';
    writerFollowPrompt.textContent = 'This is your writer profile.';
    return;
  }

  [followingStory, followingWriter] = await Promise.all([
    isFollowingStory(story.id),
    isFollowingWriter(story.author_id)
  ]);

  setFollowButtonState(storyFollowButton, followingStory, 'Follow Story', 'Unfollow Story');
  setFollowButtonState(writerFollowButton, followingWriter, 'Follow Writer', 'Unfollow Writer');
}

async function refreshFollowControls() {
  if (!currentStory) return;
  try {
    await renderFollowControls(currentStory);
  } catch (error) {
    status.textContent = friendlyFollowError(error);
  }
}

storyFollowButton.addEventListener('click', async () => {
  if (!currentStory) return;
  storyFollowButton.disabled = true;
  status.textContent = '';

  try {
    if (followingStory) {
      await unfollowStory(currentStory.id);
    } else {
      await followStory(currentStory.id);
    }
    await refreshFollowControls();
  } catch (error) {
    status.textContent = friendlyFollowError(error);
    storyFollowButton.disabled = false;
  }
});

writerFollowButton.addEventListener('click', async () => {
  if (!currentStory) return;
  writerFollowButton.disabled = true;
  status.textContent = '';

  try {
    if (followingWriter) {
      await unfollowWriter(currentStory.author_id);
    } else {
      await followWriter(currentStory.author_id);
    }
    await refreshFollowControls();
  } catch (error) {
    status.textContent = friendlyFollowError(error);
    writerFollowButton.disabled = false;
  }
});

async function loadStory() {
  try {
    const story = await getPublicStoryBySlug(getSlug());

    if (!story) {
      title.textContent = 'Story unavailable';
      chapterList.innerHTML = '<div class="empty-state">This story was not found.</div>';
      return;
    }

    currentStory = story;
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
    await refreshFollowControls();

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
