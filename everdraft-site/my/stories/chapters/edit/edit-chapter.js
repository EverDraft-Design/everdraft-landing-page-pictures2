import { friendlyAuthError, requireSession } from '/auth.js';
import {
  archiveChapter,
  friendlyChapterError,
  getChapterByIdForStory,
  updateChapter
} from '/chapters.js';

const backToChaptersLink = document.getElementById('backToChaptersLink');
const readerNotice = document.getElementById('readerNotice');
const missingNotice = document.getElementById('missingNotice');
const form = document.getElementById('chapterForm');
const titleInput = document.getElementById('title');
const chapterNumberInput = document.getElementById('chapterNumber');
const statusInput = document.getElementById('status');
const contentInput = document.getElementById('content');
const status = document.getElementById('chapterStatus');
const saveButton = document.getElementById('saveChapterButton');
const archiveButton = document.getElementById('archiveChapterButton');

function getIdsFromPath() {
  const match = window.location.pathname.match(/^\/my\/stories\/([^/]+)\/chapters\/([^/]+)\/edit\/?$/);
  return {
    storyId: match ? decodeURIComponent(match[1]) : '',
    chapterId: match ? decodeURIComponent(match[2]) : ''
  };
}

function fillChapter(chapter) {
  titleInput.value = chapter.title || '';
  chapterNumberInput.value = chapter.chapter_number || 1;
  statusInput.value = chapter.status || 'draft';
  contentInput.value = chapter.content || '';
  form.hidden = false;
}

async function loadChapter() {
  try {
    const session = await requireSession();
    if (!session) return;

    const { storyId, chapterId } = getIdsFromPath();
    backToChaptersLink.href = `/my/stories/chapters/?storyId=${encodeURIComponent(storyId)}`;

    const { canWrite, story, chapter } = await getChapterByIdForStory(storyId, chapterId);

    if (!canWrite) {
      readerNotice.hidden = false;
      return;
    }

    if (!story || !chapter) {
      missingNotice.hidden = false;
      return;
    }

    fillChapter(chapter);
  } catch (error) {
    status.textContent = friendlyAuthError(error);
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  status.textContent = '';

  const { storyId, chapterId } = getIdsFromPath();
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';

  try {
    const chapter = await updateChapter(storyId, chapterId, payload);
    fillChapter(chapter);
    status.textContent = 'Chapter saved.';
  } catch (error) {
    status.textContent = friendlyChapterError(error);
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Save Chapter';
  }
});

archiveButton.addEventListener('click', async () => {
  status.textContent = '';
  archiveButton.disabled = true;
  archiveButton.textContent = 'Archiving...';

  try {
    const { storyId, chapterId } = getIdsFromPath();
    const chapter = await archiveChapter(storyId, chapterId);
    fillChapter(chapter);
    status.textContent = 'Chapter archived.';
  } catch (error) {
    status.textContent = friendlyChapterError(error);
  } finally {
    archiveButton.disabled = false;
    archiveButton.textContent = 'Archive Chapter';
  }
});

loadChapter();
