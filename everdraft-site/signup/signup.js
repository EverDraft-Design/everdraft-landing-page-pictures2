import { friendlyAuthError, redirectAfterAuth, signUpWithEmail } from '/auth.js';

const form = document.getElementById('signupForm');
const button = document.getElementById('signupButton');
const status = document.getElementById('signupStatus');
const VALID_SIGNUP_ROLES = new Set(['reader', 'writer', 'both']);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';

  const formData = new FormData(form);
  const displayName = String(formData.get('displayName') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');
  const role = String(formData.get('role') || 'reader');

  if (!displayName || !email || !password) {
    status.textContent = 'Please complete the required fields.';
    return;
  }

  if (!VALID_SIGNUP_ROLES.has(role)) {
    status.textContent = 'Please choose Reader, Writer, or Both.';
    return;
  }

  if (password !== confirmPassword) {
    status.textContent = 'The passwords do not match.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Creating...';

  try {
    const data = await signUpWithEmail({ email, password, displayName, role });

    if (data.profilePendingEmailConfirmation) {
      status.textContent = 'Supabase created the Auth user, but no active session was returned. Please confirm the email address, then sign in so EverDraft can create the matching profile row.';
      form.reset();
      return;
    }

    if (!data.profile?.user_id || !data.profile.display_name || !data.profile.role) {
      throw new Error('Signup beta error: Auth succeeded, but EverDraft did not receive a complete profile row.');
    }

    redirectAfterAuth('/onboarding/');
  } catch (error) {
    status.textContent = friendlyAuthError(error);
  } finally {
    button.disabled = false;
    button.textContent = 'Sign Up';
  }
});
