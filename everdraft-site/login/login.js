import { friendlyAuthError, logInWithEmail, redirectAfterAuth } from '/auth.js';

const form = document.getElementById('loginForm');
const button = document.getElementById('loginButton');
const status = document.getElementById('loginStatus');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';

  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!email || !password) {
    status.textContent = 'Please enter your email and password.';
    return;
  }

  button.disabled = true;
  button.textContent = 'Signing in...';

  try {
    await logInWithEmail({ email, password });
    redirectAfterAuth();
  } catch (error) {
    status.textContent = friendlyAuthError(error);
  } finally {
    button.disabled = false;
    button.textContent = 'Sign In';
  }
});

