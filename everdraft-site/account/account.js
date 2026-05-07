import {
  createProfileForCurrentUser,
  friendlyAuthError,
  getCurrentProfile,
  isProfileComplete,
  logOut,
  requireSession,
  updateCurrentProfile
} from '/auth.js';
import { getDisplayName, getMyFollowedStories, getMyFollowedWriters, friendlyFollowError } from '/follows.js';

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
const status = document.getElementById('profileStatus');
const saveButton = document.getElementById('saveProfileButton');
const logoutButton = document.getElementById('logoutButton');
const memberTools = document.getElementById('memberTools');
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

    return `
      <article class="following-item">
        <h4><a href="${escapeHtml(storyLink)}">${escapeHtml(story.title || 'Untitled story')}</a></h4>
        <p>By ${escapeHtml(authorName)}</p>
        <p class="muted-copy">Status: ${escapeHtml(story.status || 'draft')}</p>
      </article>
    `;
  }).join('');
}

function renderFollowedWriters(writers) {
  if (!writers.length) {
    followingWritersList.innerHTML = '<div class="empty-state">Writers you follow will appear here.</div>';
    return;
  }

  followingWritersList.innerHTML = writers.map((writer) => `
    <article class="following-item">
      <h4>${escapeHtml(getDisplayName(writer))}</h4>
      ${writer.username ? `<p>@${escapeHtml(writer.username)}</p>` : ''}
    </article>
  `).join('');
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
    await loadFollowing();
  } catch (error) {
    status.textContent = friendlyAuthError(error);
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
    const profile = await updateCurrentProfile({ username, displayName, penName, bio });
    fillProfile(profile);
    status.textContent = 'Profile saved.';
  } catch (error) {
    status.textContent = friendlyAuthError(error);
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
