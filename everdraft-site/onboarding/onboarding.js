import {
  createProfileForCurrentUser,
  friendlyAuthError,
  getCurrentProfile,
  isProfileComplete,
  requireSession,
  updateCurrentProfile
} from '/auth.js';

const form = document.getElementById('onboardingForm');
const usernameInput = document.getElementById('username');
const usernameHelp = document.getElementById('usernameHelp');
const displayNameInput = document.getElementById('displayName');
const penNameInput = document.getElementById('penName');
const bioInput = document.getElementById('bio');
const status = document.getElementById('onboardingStatus');
const button = document.getElementById('onboardingButton');
const stepAccount = document.getElementById('stepAccount');
const stepProfile = document.getElementById('stepProfile');
const stepReady = document.getElementById('stepReady');

let currentProfile = null;

function markStep(element, active) {
  element.classList.toggle('active', active);
}

function fillProfile(profile) {
  usernameInput.value = profile.username || '';
  usernameInput.readOnly = Boolean(profile.username);
  usernameInput.required = !profile.username;
  usernameHelp.textContent = profile.username
    ? 'Your username is your locked EverDraft identity and cannot be changed.'
    : 'Choose your permanent EverDraft username. Use 3-30 lowercase letters, numbers, hyphens, or underscores.';
  displayNameInput.value = profile.display_name || '';
  penNameInput.value = profile.pen_name || '';
  bioInput.value = profile.bio || '';

  markStep(stepProfile, Boolean(profile.username && profile.display_name));
  markStep(stepReady, isProfileComplete(profile));
}

async function loadOnboarding() {
  try {
    const session = await requireSession();
    if (!session) return;

    markStep(stepAccount, true);

    currentProfile = await getCurrentProfile();
    if (!currentProfile) {
      currentProfile = await createProfileForCurrentUser({
        displayName: session.user.user_metadata?.display_name || session.user.email || 'EverDraft member',
        penName: session.user.user_metadata?.display_name || ''
      });
    }

    fillProfile(currentProfile);
  } catch (error) {
    status.textContent = friendlyAuthError(error);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';

  const displayName = displayNameInput.value.trim();
  const username = usernameInput.value.trim();
  const penName = penNameInput.value.trim();
  const bio = bioInput.value.trim();

  if (!displayName) {
    status.textContent = 'Display name is required.';
    return;
  }

  if (usernameInput.required && !username) {
    status.textContent = 'Username is required before your profile can be completed.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Saving...';

  try {
    currentProfile = await updateCurrentProfile({ username, displayName, penName, bio });
    fillProfile(currentProfile);
    status.textContent = 'Profile complete. You can continue to your account.';
    setTimeout(() => {
      window.location.assign('/account/');
    }, 700);
  } catch (error) {
    status.textContent = friendlyAuthError(error);
  } finally {
    button.disabled = false;
    button.textContent = 'Complete Profile';
  }
});

loadOnboarding();
