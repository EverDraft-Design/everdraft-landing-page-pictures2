import { friendlyAuthError, requireSession } from '/auth.js';
import {
  archiveStory,
  friendlyStoryError,
  getStoryByIdForAuthor,
  requireMemberProfile,
  slugifyTitle,
  updateStory
} from '/stories.js';

const form = document.getElementById('storyForm');
const titleInput = document.getElementById('title');
const slugInput = document.getElementById('slug');
const blurbInput = document.getElementById('blurb');
const genreInput = document.getElementById('genre');
const statusInput = document.getElementById('status');
const coverUrlInput = document.getElementById('coverUrl');
const bannerUrlInput = document.getElementById('bannerUrl');
const readerNotice = document.getElementById('readerNotice');
const missingNotice = document.getElementById('missingNotice');
const status = document.getElementById('storyStatus');
const saveButton = document.getElementById('saveStoryButton');
const archiveButton = document.getElementById('archiveStoryButton');
const manageChaptersLink = document.getElementById('manageChaptersLink');
const previewStoryLink = document.getElementById('previewStoryLink');

function getStoryIdFromPath() {
  const match = window.location.pathname.match(/^\/my\/stories\/([^/]+)\/edit\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

function fillStory(story) {
  titleInput.value = story.title || '';
  slugInput.value = story.slug || '';
  blurbInput.value = story.blurb || '';
  genreInput.value = story.genre || '';
  statusInput.value = story.status || 'draft';
  coverUrlInput.value = story.cover_url || '';
  bannerUrlInput.value = story.banner_url || '';
  manageChaptersLink.href = `/my/stories/chapters/?storyId=${encodeURIComponent(story.id)}`;
  previewStoryLink.href = `/my/stories/${story.id}/preview/`;
  form.hidden = false;
}

async function loadStory() {
  try {
    const session = await requireSession();
    if (!session) return;

    const { canWrite } = await requireMemberProfile();

    if (!canWrite) {
      readerNotice.hidden = false;
      return;
    }

    const storyId = getStoryIdFromPath();
    const { story } = await getStoryByIdForAuthor(storyId);

    if (!story) {
      missingNotice.hidden = false;
      return;
    }

    fillStory(story);
  } catch (error) {
    status.textContent = friendlyAuthError(error);
  }
}

titleInput.addEventListener('input', () => {
  if (!slugInput.value.trim()) {
    slugInput.placeholder = slugifyTitle(titleInput.value) || 'story-slug';
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';

  try {
    const story = await updateStory(getStoryIdFromPath(), payload);
    fillStory(story);
    status.textContent = 'Story saved.';
  } catch (error) {
    status.textContent = friendlyStoryError(error);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Save Story';
  }
});

archiveButton.addEventListener('click', async () => {
  status.textContent = '';
  archiveButton.disabled = true;
  archiveButton.textContent = 'Archiving...';

  try {
    const story = await archiveStory(getStoryIdFromPath());
    fillStory(story);
    status.textContent = 'Story archived.';
  } catch (error) {
    status.textContent = friendlyStoryError(error);
  } finally {
    archiveButton.disabled = false;
    archiveButton.textContent = 'Archive Story';
  }
});

loadStory();
