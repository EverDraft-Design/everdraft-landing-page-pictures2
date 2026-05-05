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
const avatarUrl = document.getElementById('avatarUrl');
const profileState = document.getElementById('profileState');
const form = document.getElementById('profileForm');
const displayNameInput = document.getElementById('displayName');
const penNameInput = document.getElementById('penName');
const roleSelect = document.getElementById('role');
const bioInput = document.getElementById('bio');
const status = document.getElementById('profileStatus');
const saveButton = document.getElementById('saveProfileButton');
const logoutButton = document.getElementById('logoutButton');

function fillProfile(profile) {
  displayNameInput.value = profile.display_name || '';
  penNameInput.value = profile.pen_name || '';
  roleSelect.value = profile.role || 'reader';
  bioInput.value = profile.bio || '';
  avatarUrl.textContent = profile.avatar_url || 'Not set';
  profileState.textContent = isProfileComplete(profile) ? 'Ready for early testing' : 'Needs a few details';
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
  const displayName = String(formData.get('displayName') || '').trim();
  const penName = String(formData.get('penName') || '').trim();
  const role = String(formData.get('role') || 'reader');
  const bio = String(formData.get('bio') || '').trim();

  if (!displayName) {
    status.textContent = 'Display name is required.';
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';

  try {
    const profile = await updateCurrentProfile({ displayName, penName, role, bio });
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
