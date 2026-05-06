import { friendlyAuthError, requireSession } from '/auth.js';
import { createChapter, friendlyChapterError, getChaptersForAuthorStory } from '/chapters.js';

const form = document.getElementById('chapterForm');
const chapterNumberInput = document.getElementById('chapterNumber');
const contentInput = document.getElementById('content');
const backToStoryLink = document.getElementById('backToStoryLink');
const storySummary = document.getElementById('storySummary');
const readerNotice = document.getElementById('readerNotice');
const status = document.getElementById('chapterStatus');
const button = document.getElementById('saveChapterButton');
const wordCount = document.getElementById('wordCount');
const lastSaved = document.getElementById('lastSaved');

let hasUnsavedChanges = false;

function getStoryId() {
  const match = window.location.pathname.match(/^\/my\/stories\/([^/]+)\/chapters\/new\/?$/);
  if (match) return decodeURIComponent(match[1]);
  return new URLSearchParams(window.location.search).get('storyId') || '';
}

function countWords(value) {
  const words = String(value || '').trim().match(/\S+/g);
  return words ? words.length : 0;
}

function updateWordCount() {
  const count = countWords(contentInput.value);
  wordCount.textContent = `${count} ${count === 1 ? 'word' : 'words'}`;
}

function markUnsaved() {
  hasUnsavedChanges = true;
}

function markSaved(message = 'Last saved just now') {
  hasUnsavedChanges = false;
  lastSaved.textContent = message;
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
    updateWordCount();
  } catch (error) {
    status.textContent = error.message.includes('profile') ? friendlyAuthError(error) : friendlyChapterError(error);
  }
}

form.addEventListener('input', () => {
  markUnsaved();
  updateWordCount();
});

window.addEventListener('beforeunload', (event) => {
  if (!hasUnsavedChanges) return;
  event.preventDefault();
  event.returnValue = '';
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';
  button.disabled = true;
  button.textContent = 'Saving...';

  try {
    const payload = Object.fromEntries(new FormData(form).entries());
    const chapter = await createChapter(getStoryId(), payload);
    markSaved('Last saved just now.');
    window.location.assign(`/my/stories/${getStoryId()}/chapters/${chapter.id}/edit/`);
  } catch (error) {
    status.textContent = friendlyChapterError(error);
  } finally {
    button.disabled = false;
    button.textContent = 'Save Draft';
  }
});

loadNewChapter();
