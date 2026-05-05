import { friendlyAuthError, redirectAfterAuth, signUpWithEmail } from '/auth.js';

const form = document.getElementById('signupForm');
const button = document.getElementById('signupButton');
const status = document.getElementById('signupStatus');

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

  if (password !== confirmPassword) {
    status.textContent = 'The passwords do not match.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Creating...';

  try {
    const data = await signUpWithEmail({ email, password, displayName, role });

    if (!data.session) {
      status.textContent = 'Account created. Please check your email to confirm your address before signing in.';
      form.reset();
      return;
    }

    redirectAfterAuth('/onboarding/');
  } catch (error) {
    status.textContent = friendlyAuthError(error);
  } finally {
    button.disabled = false;
    button.textContent = 'Sign Up';
  }
});
