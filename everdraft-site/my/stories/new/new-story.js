import { friendlyAuthError, requireSession } from '/auth.js';
import { createStory, friendlyStoryError, requireMemberProfile, slugifyTitle } from '/stories.js';

const form = document.getElementById('storyForm');
const titleInput = document.getElementById('title');
const slugInput = document.getElementById('slug');
const readerNotice = document.getElementById('readerNotice');
const status = document.getElementById('storyStatus');
const button = document.getElementById('saveStoryButton');

async function loadNewStory() {
  try {
    const session = await requireSession();
    if (!session) return;

    const { canWrite } = await requireMemberProfile();

    if (!canWrite) {
      readerNotice.hidden = false;
      return;
    }

    form.hidden = false;
  } catch (error) {
    status.textContent = friendlyAuthError(error);
  }
}

titleInput.addEventListener('input', () => {
  if (!slugInput.value.trim()) {
    slugInput.placeholder = slugifyTitle(titleInput.value) || 'auto-generated from title if blank';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  button.disabled = true;
  button.textContent = 'Creating...';

  try {
    const story = await createStory(payload);
    window.location.assign(`/my/stories/${story.id}/edit/`);
  } catch (error) {
    status.textContent = friendlyStoryError(error);
  } finally {
    button.disabled = false;
    button.textContent = 'Create Story';
  }
});

loadNewStory();
