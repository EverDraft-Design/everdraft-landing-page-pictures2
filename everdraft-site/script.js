const heroForm = document.getElementById('heroForm');
const heroEmail = document.getElementById('heroEmail');
const modal = document.getElementById('modal');
const closeModalBtn = document.getElementById('closeModal');
const waitlistForm = document.getElementById('waitlistForm');
const waitlistEmail = document.getElementById('email');
const submitBtn = document.getElementById('submitWaitlist');
const formStatus = document.getElementById('formStatus');

let lastFocusedElement = null;

function getFocusableElements(container) {
  return [...container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((el) => !el.disabled);
}

function openModal(prefillEmail = '') {
  lastFocusedElement = document.activeElement;
  waitlistEmail.value = prefillEmail;
  modal.hidden = false;

  const focusable = getFocusableElements(modal);
  if (focusable.length) focusable[0].focus();

  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.hidden = true;
  document.body.style.overflow = '';
  if (lastFocusedElement) lastFocusedElement.focus();
}

heroForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!heroEmail.value.trim()) {
    heroEmail.reportValidity();
    return;
  }
  openModal(heroEmail.value.trim());
});

closeModalBtn.addEventListener('click', closeModal);

modal.addEventListener('click', (event) => {
  if (event.target === modal) closeModal();
});

document.addEventListener('keydown', (event) => {
  if (modal.hidden) return;

  if (event.key === 'Escape') {
    closeModal();
    return;
  }

  if (event.key === 'Tab') {
    const focusable = getFocusableElements(modal);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

waitlistForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  formStatus.textContent = '';

  const formData = new FormData(waitlistForm);
  const payload = Object.fromEntries(formData.entries());

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  try {
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('Request failed');
    }

    formStatus.textContent = 'Success! You are on the waitlist.';
    waitlistForm.reset();
    heroEmail.value = payload.email || '';
  } catch (error) {
    formStatus.textContent = 'Sorry, there was an error. Please try again.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit';
  }
});