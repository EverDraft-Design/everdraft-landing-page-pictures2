import { friendlyAuthError, requireSession } from '/auth.js';
import { createChapter, friendlyChapterError, getChaptersForAuthorStory } from '/chapters.js';

const form = document.getElementById('chapterForm');
const chapterNumberInput = document.getElementById('chapterNumber');
const backToStoryLink = document.getElementById('backToStoryLink');
const storySummary = document.getElementById('storySummary');
const readerNotice = document.getElementById('readerNotice');
const status = document.getElementById('chapterStatus');
const button = document.getElementById('saveChapterButton');

function getStoryId() {
  const match = window.location.pathname.match(/^\/my\/stories\/([^/]+)\/chapters\/new\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function loadNewChapter() {
  try {
    const session = await requireSession();
    if (!session) return;

    const storyId = getStoryId();
    backToStoryLink.href = `/my/stories/${storyId}/`;
    const { story, chapters } = await getChaptersForAuthorStory(storyId);

    if (!story) {
      readerNotice.hidden = false;
      form.hidden = true;
      return;
    }

    storySummary.textContent = `Adding a chapter to ${story.title || 'Untitled story'}.`;
    const maxChapter = chapters.reduce((max, chapter) => Math.max(max, Number(chapter.chapter_number) || 0), 0);
    chapterNumberInput.value = String(maxChapter + 1);
    form.hidden = false;
  } catch (error) {
    status.textContent = error.message.includes('profile') ? friendlyAuthError(error) : friendlyChapterError(error);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';
  button.disabled = true;
  button.textContent = 'Creating...';

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
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
