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

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function loginHref() {
  return `/login/?redirect=${encodeURIComponent(window.location.pathname)}`;
}

function formatStoryFollowers(count) {
  if (!count) return 'No readers following yet';
  return `${count} ${count === 1 ? 'reader following' : 'readers following'}`;
}

function formatWriterFollowers(count) {
  if (!count) return 'No writer followers yet';
  return `${count} ${count === 1 ? 'writer follower' : 'writer followers'}`;
}

async function getViewerProfile() {
  const session = await getCurrentSession();
  if (!session) return null;
  return getCurrentProfile();
}

function getMode(options) {
  const mode = options.mode || 'both';
  return ['story', 'writer', 'both'].includes(mode) ? mode : 'both';
}

function shouldShowStory(mode) {
  return mode === 'story' || mode === 'both';
}

function shouldShowWriter(mode) {
  return mode === 'writer' || mode === 'both';
}

function renderShell(container, { compact = false, mode = 'both' } = {}) {
  const storyButton = shouldShowStory(mode)
    ? '<button type="button" class="secondary-button" data-follow-button="story" hidden>Follow Story</button>'
    : '';
  const writerButton = shouldShowWriter(mode)
    ? '<button type="button" class="secondary-button" data-follow-button="writer" hidden>Follow Writer</button>'
    : '';
  const compactDivider = shouldShowStory(mode) && shouldShowWriter(mode) ? '<span aria-hidden="true"> · </span>' : '';
  const storyCount = shouldShowStory(mode) ? '<span data-follow-count="story">0 readers following</span>' : '';
  const writerCount = shouldShowWriter(mode) ? '<span data-follow-count="writer">0 writer followers</span>' : '';
  const storyPrompt = shouldShowStory(mode) ? '<p class="field-note" data-follow-prompt="story"></p>' : '';
  const writerPrompt = shouldShowWriter(mode) ? '<p class="field-note" data-follow-prompt="writer"></p>' : '';

  if (compact) {
    container.innerHTML = `
      <div class="follow-compact-panel">
        <div class="follow-compact-buttons">
          ${storyButton}
          ${writerButton}
        </div>
        <p class="follow-compact-counts">
          ${storyCount}
          ${compactDivider}
          ${writerCount}
        </p>
        ${storyPrompt}
        ${writerPrompt}
      </div>
    `;
    return;
  }

  container.innerHTML = `
    ${shouldShowStory(mode) ? `<div class="follow-card" data-follow-card="story">
      <div>
        <p class="eyebrow">STORY</p>
        <p class="follow-count" data-follow-count="story">0 readers following</p>
        <p class="field-note" data-follow-prompt="story"></p>
      </div>
      <button type="button" class="secondary-button" data-follow-button="story" hidden>Follow Story</button>
    </div>` : ''}
    ${shouldShowWriter(mode) ? `<div class="follow-card" data-follow-card="writer">
      <div>
        <p class="eyebrow">WRITER</p>
        <p class="follow-count" data-follow-count="writer">0 writer followers</p>
        <p class="field-note" data-follow-prompt="writer"></p>
      </div>
      <button type="button" class="secondary-button" data-follow-button="writer" hidden>Follow Writer</button>
    </div>` : ''}
  `;
}

function setSignedOutPrompt(container, mode) {
  const href = escapeHtml(loginHref());
  const storyPrompt = container.querySelector('[data-follow-prompt="story"]');
  const writerPrompt = container.querySelector('[data-follow-prompt="writer"]');
  if (storyPrompt && shouldShowStory(mode)) storyPrompt.innerHTML = `<a href="${href}">Sign in to follow this story.</a>`;
  if (writerPrompt && shouldShowWriter(mode)) writerPrompt.innerHTML = `<a href="${href}">Sign in to follow this writer.</a>`;
}

function setOwnerPrompt(container, mode) {
  const storyPrompt = container.querySelector('[data-follow-prompt="story"]');
  const writerPrompt = container.querySelector('[data-follow-prompt="writer"]');
  if (storyPrompt && shouldShowStory(mode)) storyPrompt.textContent = 'Your story.';
  if (writerPrompt && shouldShowWriter(mode)) writerPrompt.textContent = 'Your writer profile.';
}

function setButton(button, isFollowing, followLabel, unfollowLabel) {
  button.hidden = false;
  button.disabled = false;
  button.textContent = isFollowing ? unfollowLabel : followLabel;
}

export async function mountFollowControls(container, story, options = {}) {
  const mode = getMode(options);
  const needsStory = shouldShowStory(mode);
  const needsWriter = shouldShowWriter(mode);
  if (!container || (needsStory && !story?.id) || (needsWriter && !story?.author_id)) return;

  container.classList.add('follow-actions');
  if (options.compact) container.classList.add('follow-actions-compact');
  renderShell(container, { ...options, mode });

  const storyButton = container.querySelector('[data-follow-button="story"]');
  const writerButton = container.querySelector('[data-follow-button="writer"]');
  const storyCount = container.querySelector('[data-follow-count="story"]');
  const writerCount = container.querySelector('[data-follow-count="writer"]');

  try {
    const [storyFollowers, writerFollowers] = await Promise.all([
      needsStory ? getStoryFollowerCount(story.id) : 0,
      needsWriter ? getWriterFollowerCount(story.author_id) : 0
    ]);

    if (storyCount) storyCount.textContent = formatStoryFollowers(storyFollowers);
    if (writerCount) writerCount.textContent = formatWriterFollowers(writerFollowers);

    const currentProfile = await getViewerProfile();
    if (!currentProfile) {
      setSignedOutPrompt(container, mode);
      return;
    }

    if (story.author_id === currentProfile.id) {
      setOwnerPrompt(container, mode);
      return;
    }

    let followingStory = needsStory ? await isFollowingStory(story.id) : false;
    let followingWriter = needsWriter ? await isFollowingWriter(story.author_id) : false;

    if (storyButton) setButton(storyButton, followingStory, 'Follow Story', 'Unfollow Story');
    if (writerButton) setButton(writerButton, followingWriter, 'Follow Writer', 'Unfollow Writer');

    storyButton?.addEventListener('click', async () => {
      storyButton.disabled = true;
      try {
        if (followingStory) {
          await unfollowStory(story.id);
        } else {
          await followStory(story.id);
        }
        await mountFollowControls(container, story, options);
      } catch (error) {
        container.dispatchEvent(new CustomEvent('followerror', { detail: friendlyFollowError(error) }));
        storyButton.disabled = false;
      }
    });

    writerButton?.addEventListener('click', async () => {
      writerButton.disabled = true;
      try {
        if (followingWriter) {
          await unfollowWriter(story.author_id);
        } else {
          await followWriter(story.author_id);
        }
        await mountFollowControls(container, story, options);
      } catch (error) {
        container.dispatchEvent(new CustomEvent('followerror', { detail: friendlyFollowError(error) }));
        writerButton.disabled = false;
      }
    });
  } catch (error) {
    container.dispatchEvent(new CustomEvent('followerror', { detail: friendlyFollowError(error) }));
  }
}
