import {
  createProfileForCurrentUser,
  friendlyAuthError,
  getCurrentProfile,
  isProfileComplete,
  requireSession,
  updateCurrentProfile
} from '/auth.js';

const form = document.getElementById('onboardingForm');
const displayNameInput = document.getElementById('displayName');
const penNameInput = document.getElementById('penName');
const roleSelect = document.getElementById('role');
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
  displayNameInput.value = profile.display_name || '';
  penNameInput.value = profile.pen_name || '';
  roleSelect.value = profile.role || 'reader';
  bioInput.value = profile.bio || '';

  markStep(stepProfile, Boolean(profile.display_name && profile.role));
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
        displayName: session.user.user_metadata?.display_name || session.user.email || 'EverDraft reader',
        role: session.user.user_metadata?.intended_role || 'reader',
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
  const penName = penNameInput.value.trim();
  const role = roleSelect.value;
  const bio = bioInput.value.trim();

  if (!displayName) {
    status.textContent = 'Display name is required.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Saving...';

  try {
    currentProfile = await updateCurrentProfile({ displayName, penName, role, bio });
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
