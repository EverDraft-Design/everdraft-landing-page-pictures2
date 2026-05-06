import { friendlyAuthError, requireSession } from '/auth.js';
import { archiveChapter, friendlyChapterError, getChapterForAuthor, updateChapter } from '/chapters.js';

const form = document.getElementById('chapterForm');
const chapterNumberInput = document.getElementById('chapterNumber');
const titleInput = document.getElementById('title');
const contentInput = document.getElementById('content');
const statusInput = document.getElementById('status');
const backToStoryLink = document.getElementById('backToStoryLink');
const storySummary = document.getElementById('storySummary');
const readerNotice = document.getElementById('readerNotice');
const status = document.getElementById('chapterStatus');
const saveButton = document.getElementById('saveChapterButton');
const archiveButton = document.getElementById('archiveChapterButton');
const wordCount = document.getElementById('wordCount');
const lastSaved = document.getElementById('lastSaved');

let hasUnsavedChanges = false;

function getIds() {
  const match = window.location.pathname.match(/^\/my\/stories\/([^/]+)\/chapters\/([^/]+)\/edit\/?$/);
  const params = new URLSearchParams(window.location.search);
  return {
    storyId: match ? decodeURIComponent(match[1]) : params.get('storyId') || '',
    chapterId: match ? decodeURIComponent(match[2]) : params.get('chapterId') || ''
  };
}

function countWords(value) {
  const words = String(value || '').trim().match(/\S+/g);
  return words ? words.length : 0;
}

function updateWordCount() {
  const count = countWords(contentInput.value);
  wordCount.textContent = `${count} ${count === 1 ? 'word' : 'words'}`;
}

function markSaved(message = 'Last saved just now.') {
  hasUnsavedChanges = false;
  lastSaved.textContent = message;
}

function fillChapter(story, chapter) {
  storySummary.textContent = `${story.title || 'Untitled story'} · Chapter ${chapter.chapter_number}`;
  chapterNumberInput.value = chapter.chapter_number || 1;
  titleInput.value = chapter.title || '';
  contentInput.value = chapter.content || '';
  statusInput.value = chapter.status || 'draft';
  form.hidden = false;
  updateWordCount();
  markSaved(chapter.updated_at ? `Last saved ${new Date(chapter.updated_at).toLocaleString()}` : 'Last saved: not yet');
}

async function loadChapter() {
  try {
    const session = await requireSession();
    if (!session) return;

    const { storyId, chapterId } = getIds();
    backToStoryLink.href = `/my/stories/${storyId}/`;
    const { story, chapter } = await getChapterForAuthor(chapterId, storyId);

    if (!story || !chapter) {
      readerNotice.hidden = false;
      return;
    }

    fillChapter(story, chapter);
  } catch (error) {
    status.textContent = error.message.includes('profile') ? friendlyAuthError(error) : friendlyChapterError(error);
  }
}

form.addEventListener('input', () => {
  hasUnsavedChanges = true;
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
  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';

  try {
    const { storyId, chapterId } = getIds();
    const chapter = await updateChapter(storyId, chapterId, Object.fromEntries(new FormData(form).entries()));
    const { story } = await getChapterForAuthor(chapter.id, storyId);
    fillChapter(story, chapter);
    markSaved('Last saved just now.');
    status.textContent = 'Chapter saved.';
  } catch (error) {
    status.textContent = friendlyChapterError(error);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Save Draft';
  }
});

archiveButton.addEventListener('click', async () => {
  status.textContent = '';
  archiveButton.disabled = true;
  archiveButton.textContent = 'Archiving...';

  try {
    const { storyId, chapterId } = getIds();
    const chapter = await archiveChapter(storyId, chapterId);
    const { story } = await getChapterForAuthor(chapter.id, storyId);
    fillChapter(story, chapter);
    markSaved('Last saved just now.');
    status.textContent = 'Chapter archived.';
  } catch (error) {
    status.textContent = friendlyChapterError(error);
  } finally {
    archiveButton.disabled = false;
    archiveButton.textContent = 'Archive Chapter';
  }
});

loadChapter();
