import {
  createProfileForCurrentUser,
  friendlyAuthError,
  getCurrentProfile,
  isProfileComplete,
  logOut,
  requireSession,
  updateCurrentProfile
} from '/auth.js';
import {
  friendlyEngagementError,
  getMyPinboardNotes
} from '/engagement.js';
import {
  friendlyFollowError,
  getDisplayName,
  getMyFollowedStories,
  getMyFollowedWriters,
  unfollowStory
} from '/follows.js';

const email = document.getElementById('accountEmail');
const accountUsername = document.getElementById('accountUsername');
const avatarUrl = document.getElementById('avatarUrl');
const profileState = document.getElementById('profileState');
const form = document.getElementById('profileForm');
const usernameInput = document.getElementById('username');
const usernameHelp = document.getElementById('usernameHelp');
const displayNameInput = document.getElementById('displayName');
const penNameInput = document.getElementById('penName');
const bioInput = document.getElementById('bio');
const notesEnabledInput = document.getElementById('notesEnabled');
const status = document.getElementById('profileStatus');
const saveButton = document.getElementById('saveProfileButton');
const logoutButton = document.getElementById('logoutButton');
const memberTools = document.getElementById('memberTools');
const pinboardSummary = document.getElementById('pinboardSummary');
const followingPanel = document.getElementById('followingPanel');
const followingStoriesList = document.getElementById('followingStoriesList');
const followingWritersList = document.getElementById('followingWritersList');
const followingStatus = document.getElementById('followingStatus');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function fillProfile(profile) {
  usernameInput.value = profile.username || '';
  usernameInput.readOnly = Boolean(profile.username);
  usernameInput.required = !profile.username;
  accountUsername.textContent = profile.username ? `@${profile.username}` : 'Not set';
  usernameHelp.textContent = profile.username
    ? 'Your username is your locked EverDraft identity and cannot be changed.'
    : 'Choose your permanent EverDraft username. Use 3-30 lowercase letters, numbers, hyphens, or underscores.';
  displayNameInput.value = profile.display_name || '';
  penNameInput.value = profile.pen_name || '';
  bioInput.value = profile.bio || '';
  notesEnabledInput.checked = profile.notes_enabled !== false;
  avatarUrl.textContent = profile.avatar_url || 'Not set';
  profileState.textContent = isProfileComplete(profile) ? 'Ready for early testing' : 'Needs a few details';
  memberTools.hidden = false;
  form.hidden = false;
}

function renderFollowedStories(stories) {
  if (!stories.length) {
    followingStoriesList.innerHTML = '<div class="empty-state">Stories you follow will appear here.</div>';
    return;
  }

  followingStoriesList.innerHTML = stories.map((story) => {
    const authorName = getDisplayName(story.author);
    const storyLink = story.slug ? `/story/${story.slug}/` : '/library/';
    const chapterCount = Number(story.chapter_count) || 0;
    const chapterCopy = `${chapterCount} ${chapterCount === 1 ? 'published chapter' : 'published chapters'}`;

    return `
      <article class="following-item">
        <div>
          <h4><a href="${escapeHtml(storyLink)}">${escapeHtml(story.title || 'Untitled story')}</a></h4>
          <p>By ${escapeHtml(authorName)}</p>
          <p class="muted-copy">${escapeHtml(story.genre || 'Genre not set')} · ${escapeHtml(story.status || 'draft')} · ${escapeHtml(chapterCopy)}</p>
        </div>
        <div class="following-actions">
          <a class="button-link secondary-link" href="${escapeHtml(storyLink)}">Read Story</a>
          <button type="button" class="secondary-button" data-unfollow-story-id="${escapeHtml(story.id)}">Unfollow Story</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderFollowedWriters(writers) {
  if (!writers.length) {
    followingWritersList.innerHTML = '<div class="empty-state">Writers you follow will appear here.</div>';
    return;
  }

  followingWritersList.innerHTML = writers.map((writer) => {
    const followerCount = Number(writer.follower_count) || 0;
    const publicStoryCount = Number(writer.public_story_count) || 0;
    const followerCopy = `${followerCount} ${followerCount === 1 ? 'writer follower' : 'writer followers'}`;
    const storyCopy = `${publicStoryCount} ${publicStoryCount === 1 ? 'public story' : 'public stories'}`;
    const writerName = escapeHtml(getDisplayName(writer));
    const writerHeading = writer.username
      ? `<a href="/writer/${escapeHtml(writer.username)}/">${writerName}</a>`
      : writerName;

    return `
      <article class="following-item">
        <div>
          <h4>${writerHeading}</h4>
          ${writer.username ? `<p>@${escapeHtml(writer.username)}</p>` : ''}
          <p class="muted-copy">${escapeHtml(followerCopy)} · ${escapeHtml(storyCopy)}</p>
        </div>
      </article>
    `;
  }).join('');
}

async function loadFollowing() {
  try {
    followingPanel.hidden = false;
    followingStoriesList.innerHTML = '<div class="empty-state">Loading followed stories...</div>';
    followingWritersList.innerHTML = '<div class="empty-state">Loading followed writers...</div>';

    const [stories, writers] = await Promise.all([
      getMyFollowedStories(),
      getMyFollowedWriters()
    ]);

    renderFollowedStories(stories);
    renderFollowedWriters(writers);
  } catch (error) {
    followingStatus.textContent = friendlyFollowError(error);
    followingStoriesList.innerHTML = '<div class="empty-state">Stories you follow will appear here.</div>';
    followingWritersList.innerHTML = '<div class="empty-state">Writers you follow will appear here.</div>';
  }
}

async function loadPinboardSummary() {
  try {
    const notes = await getMyPinboardNotes();
    const count = notes.length;
    pinboardSummary.textContent = count
      ? `${count} ${count === 1 ? 'private Note is' : 'private Notes are'} waiting on your Pinboard.`
      : 'Reader Notes will appear on your Pinboard when they arrive.';
  } catch (error) {
    pinboardSummary.textContent = friendlyEngagementError(error);
  }
}

followingPanel.addEventListener('click', async (event) => {
  const storyButton = event.target.closest('[data-unfollow-story-id]');
  const button = storyButton;
  if (!button) return;

  button.disabled = true;
  followingStatus.textContent = '';

  try {
    if (storyButton) {
      await unfollowStory(storyButton.dataset.unfollowStoryId);
    }
    await loadFollowing();
  } catch (error) {
    followingStatus.textContent = friendlyFollowError(error);
    button.disabled = false;
  }
});

async function loadAccount() {
  try {
    const session = await requireSession();
    if (!session) return;

    email.textContent = session.user.email || 'Signed in';

    let profile = await getCurrentProfile();
    if (!profile) {
      profile = await createProfileForCurrentUser({
        displayName: session.user.user_metadata?.display_name || session.user.email || 'EverDraft member'
      });
    }

    fillProfile(profile);
    await loadPinboardSummary();
    await loadFollowing();
  } catch (error) {
    status.textContent = friendlyAuthError(error, 'profile');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';

  const formData = new FormData(form);
  const username = String(formData.get('username') || '').trim();
  const displayName = String(formData.get('displayName') || '').trim();
  const penName = String(formData.get('penName') || '').trim();
  const bio = String(formData.get('bio') || '').trim();
  const notesEnabled = formData.get('notesEnabled') === 'on';

  if (!displayName) {
    status.textContent = 'Display name is required.';
    return;
  }

  if (usernameInput.required && !username) {
    status.textContent = 'Username is required before your profile can be completed.';
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';

  try {
    const profile = await updateCurrentProfile({ username, displayName, penName, bio, notesEnabled });
    fillProfile(profile);
    status.textContent = 'Profile saved.';
  } catch (error) {
    status.textContent = friendlyAuthError(error, 'profile');
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Save Profile';
  }
});

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  logoutButton.textContent = 'Logging out...';

  try {
    await logOut();
    window.location.assign('/login/');
  } catch (error) {
    status.textContent = friendlyAuthError(error);
    logoutButton.disabled = false;
    logoutButton.textContent = 'Log Out';
  }
});

loadAccount();
