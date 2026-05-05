import { friendlyAuthError, logOut } from '/auth.js';

const status = document.getElementById('logoutStatus');

try {
  await logOut();
  window.location.replace('/login/');
} catch (error) {
  status.textContent = friendlyAuthError(error);
}
