import { friendlyAuthError, requireSession } from '/auth.js';
import { createChapter, friendlyChapterError, requireAuthorStory } from '/chapters.js';

const backToChaptersLink = document.getElementById('backToChaptersLink');
const storyTitle = document.getElementById('storyTitle');
const readerNotice = document.getElementById('readerNotice');
const missingNotice = document.getElementById('missingNotice');
const form = document.getElementById('chapterForm');
const status = document.getElementById('chapterStatus');
const button = document.getElementById('saveChapterButton');

function getStoryId() {
  return new URLSearchParams(window.location.search).get('storyId') || '';
}

async function loadNewChapter() {
  try {
    const session = await requireSession();
    if (!session) return;

    const storyId = getStoryId();
    backToChaptersLink.href = `/my/stories/chapters/?storyId=${encodeURIComponent(storyId)}`;

    const { canWrite, story } = await requireAuthorStory(storyId);

    if (!canWrite) {
      readerNotice.hidden = false;
      return;
    }

    if (!story) {
      missingNotice.hidden = false;
      storyTitle.textContent = 'Story unavailable.';
      return;
    }

    storyTitle.textContent = story.title;
    form.hidden = false;
  } catch (error) {
    status.textContent = friendlyAuthError(error);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  button.disabled = true;
  button.textContent = 'Creating...';

  try {
    const chapter = await createChapter(getStoryId(), payload);
    window.location.assign(`/my/stories/${getStoryId()}/chapters/${chapter.id}/edit/`);
  } catch (error) {
    status.textContent = friendlyChapterError(error);
  } finally {
    button.disabled = false;
    button.textContent = 'Create Chapter';
  }
});

loadNewChapter();
