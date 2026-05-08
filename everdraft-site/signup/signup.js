import { friendlyAuthError, redirectAfterAuth, signUpWithEmail, validateUsername } from '/auth.js';

const form = document.getElementById('signupForm');
const button = document.getElementById('signupButton');
const status = document.getElementById('signupStatus');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';

  const formData = new FormData(form);
  const displayName = String(formData.get('displayName') || '').trim();
  const username = String(formData.get('username') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');

  if (!displayName || !username || !email || !password) {
    status.textContent = 'Please complete the required fields.';
    return;
  }

  try {
    validateUsername(username);
  } catch (error) {
    status.textContent = friendlyAuthError(error, 'signup');
    return;
  }

  if (password !== confirmPassword) {
    status.textContent = 'The passwords do not match.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Creating...';

  try {
    const data = await signUpWithEmail({ email, password, username, displayName });

    if (data.profilePendingEmailConfirmation) {
      status.textContent = 'Please check your email to confirm your account, then sign in to continue.';
      form.reset();
      return;
    }

    if (!data.profile?.user_id || !data.profile.display_name) {
      throw new Error('We couldn’t finish setting up your profile just yet.');
    }

    redirectAfterAuth('/onboarding/');
  } catch (error) {
    status.textContent = friendlyAuthError(error, 'signup');
  } finally {
    button.disabled = false;
    button.textContent = 'Sign Up';
  }
});
