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

function getIds() {
  const match = window.location.pathname.match(/^\/my\/stories\/([^/]+)\/chapters\/([^/]+)\/edit\/?$/);
  return {
    storyId: match ? decodeURIComponent(match[1]) : '',
    chapterId: match ? decodeURIComponent(match[2]) : ''
  };
}

function fillChapter(story, chapter) {
  storySummary.textContent = `${story.title || 'Untitled story'} · Chapter ${chapter.chapter_number}`;
  chapterNumberInput.value = chapter.chapter_number || 1;
  titleInput.value = chapter.title || '';
  contentInput.value = chapter.content || '';
  statusInput.value = chapter.status || 'draft';
  form.hidden = false;
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
    const { storyId, chapterId } = getIds();
    const chapter = await archiveChapter(storyId, chapterId);
    const { story } = await getChapterForAuthor(chapter.id, storyId);
    fillChapter(story, chapter);
    status.textContent = 'Chapter archived.';
  } catch (error) {
    status.textContent = friendlyChapterError(error);
  } finally {
    archiveButton.disabled = false;
    archiveButton.textContent = 'Archive Chapter';
  }
});

loadChapter();
