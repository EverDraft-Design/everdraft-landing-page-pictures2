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
  return `${count} ${count === 1 ? 'reader following' : 'readers following'}`;
}

function formatWriterFollowers(count) {
  return `${count} ${count === 1 ? 'writer follower' : 'writer followers'}`;
}

async function getViewerProfile() {
  const session = await getCurrentSession();
  if (!session) return null;
  return getCurrentProfile();
}

function renderShell(container, { compact = false } = {}) {
  container.innerHTML = `
    <div class="follow-card${compact ? ' follow-card-compact' : ''}" data-follow-card="story">
      <div>
        <p class="eyebrow">STORY</p>
        <p class="follow-count" data-follow-count="story">0 readers following</p>
        <p class="field-note" data-follow-prompt="story"></p>
      </div>
      <button type="button" class="secondary-button" data-follow-button="story" hidden>Follow Story</button>
    </div>
    <div class="follow-card${compact ? ' follow-card-compact' : ''}" data-follow-card="writer">
      <div>
        <p class="eyebrow">WRITER</p>
        <p class="follow-count" data-follow-count="writer">0 writer followers</p>
        <p class="field-note" data-follow-prompt="writer"></p>
      </div>
      <button type="button" class="secondary-button" data-follow-button="writer" hidden>Follow Writer</button>
    </div>
  `;
}

function setSignedOutPrompt(container) {
  const href = escapeHtml(loginHref());
  container.querySelector('[data-follow-prompt="story"]').innerHTML = `<a href="${href}">Sign in to follow this story.</a>`;
  container.querySelector('[data-follow-prompt="writer"]').innerHTML = `<a href="${href}">Sign in to follow this writer.</a>`;
}

function setOwnerPrompt(container) {
  container.querySelector('[data-follow-prompt="story"]').textContent = 'Your story.';
  container.querySelector('[data-follow-prompt="writer"]').textContent = 'Your writer profile.';
}

function setButton(button, isFollowing, followLabel, unfollowLabel) {
  button.hidden = false;
  button.disabled = false;
  button.textContent = isFollowing ? unfollowLabel : followLabel;
}

export async function mountFollowControls(container, story, options = {}) {
  if (!container || !story?.id) return;

  container.classList.add('follow-actions');
  if (options.compact) container.classList.add('follow-actions-compact');
  renderShell(container, options);

  const storyButton = container.querySelector('[data-follow-button="story"]');
  const writerButton = container.querySelector('[data-follow-button="writer"]');
  const storyCount = container.querySelector('[data-follow-count="story"]');
  const writerCount = container.querySelector('[data-follow-count="writer"]');

  try {
    const [storyFollowers, writerFollowers] = await Promise.all([
      getStoryFollowerCount(story.id),
      story.author_id ? getWriterFollowerCount(story.author_id) : 0
    ]);

    storyCount.textContent = formatStoryFollowers(storyFollowers);
    writerCount.textContent = formatWriterFollowers(writerFollowers);

    const currentProfile = await getViewerProfile();
    if (!currentProfile) {
      setSignedOutPrompt(container);
      return;
    }

    if (story.author_id === currentProfile.id) {
      setOwnerPrompt(container);
      return;
    }

    let followingStory = await isFollowingStory(story.id);
    let followingWriter = story.author_id ? await isFollowingWriter(story.author_id) : false;

    setButton(storyButton, followingStory, 'Follow Story', 'Unfollow Story');
    setButton(writerButton, followingWriter, 'Follow Writer', 'Unfollow Writer');

    storyButton.addEventListener('click', async () => {
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

    writerButton.addEventListener('click', async () => {
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
