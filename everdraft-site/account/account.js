import {
  createProfileForCurrentUser,
  friendlyAuthError,
  getCurrentProfile,
  isProfileComplete,
  logOut,
  requireSession,
  updateCurrentProfile
} from '/auth.js';

const email = document.getElementById('accountEmail');
const accountUsername = document.getElementById('accountUsername');
const avatarUrl = document.getElementById('avatarUrl');
const profileState = document.getElementById('profileState');
const form = document.getElementById('profileForm');
const usernameInput = document.getElementById('username');
const usernameHelp = document.getElementById('usernameHelp');
const displayNameInput = document.getElementById('displayName');
const penNameInput = document.getElementById('penName');
const roleSelect = document.getElementById('role');
const bioInput = document.getElementById('bio');
const status = document.getElementById('profileStatus');
const saveButton = document.getElementById('saveProfileButton');
const logoutButton = document.getElementById('logoutButton');
const myStoriesLink = document.getElementById('myStoriesLink');
const writerTools = document.getElementById('writerTools');
const readerTools = document.getElementById('readerTools');

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
  roleSelect.value = profile.role || 'reader';
  bioInput.value = profile.bio || '';
  avatarUrl.textContent = profile.avatar_url || 'Not set';
  profileState.textContent = isProfileComplete(profile) ? 'Ready for early testing' : 'Needs a few details';
  const canTestWriterTools = ['writer', 'both'].includes(profile.role);
  myStoriesLink.hidden = !canTestWriterTools;
  writerTools.hidden = !canTestWriterTools;
  readerTools.hidden = canTestWriterTools;
  form.hidden = false;
}

async function loadAccount() {
  try {
    const session = await requireSession();
    if (!session) return;

    email.textContent = session.user.email || 'Signed in';

    let profile = await getCurrentProfile();
    if (!profile) {
      profile = await createProfileForCurrentUser({
        displayName: session.user.user_metadata?.display_name || session.user.email || 'EverDraft reader',
        role: session.user.user_metadata?.intended_role || 'reader'
      });
    }

    fillProfile(profile);
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
  const role = String(formData.get('role') || 'reader');
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
    const profile = await updateCurrentProfile({ username, displayName, penName, role, bio });
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
