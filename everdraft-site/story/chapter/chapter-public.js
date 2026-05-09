import { friendlyChapterError, getPublicChapterBySlugAndNumber } from '/chapters.js';
import { mountFollowControls } from '/follow-controls.js';
import { getCurrentProfile, getCurrentSession } from '/auth.js';
import { createChapterNote, friendlyEngagementError } from '/engagement.js';
import { mountChapterSparkControl } from '/spark-controls.js';

const backToStoryLink = document.getElementById('backToStoryLink');
const storyTitle = document.getElementById('storyTitle');
const chapterTitle = document.getElementById('chapter-title');
const chapterMeta = document.getElementById('chapterMeta');
const chapterSparkControl = document.getElementById('chapterSparkControl');
const chapterFollowControls = document.getElementById('chapterFollowControls');
const unavailableNotice = document.getElementById('unavailableNotice');
const chapterContent = document.getElementById('chapterContent');
const notePanel = document.getElementById('notePanel');
const noteForm = document.getElementById('noteForm');
const noteStatus = document.getElementById('noteStatus');
const leaveNoteButton = document.getElementById('leaveNoteButton');
const previousChapterLink = document.getElementById('previousChapterLink');
const chapterBackToStoryLink = document.getElementById('chapterBackToStoryLink');
const nextChapterLink = document.getElementById('nextChapterLink');
const status = document.getElementById('chapterStatus');

function getRouteParts() {
  const match = window.location.pathname.match(/^\/story\/([^/]+)\/chapter\/([^/]+)\/?$/);
  return {
    slug: match ? decodeURIComponent(match[1]) : '',
    chapterNumber: match ? decodeURIComponent(match[2]) : ''
  };
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function renderParagraphs(content) {
  const paragraphs = String(content || '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`).join('');
}

async function setupNotePanel(story, chapter) {
  notePanel.hidden = false;

  if (story.author?.notes_enabled === false) {
    noteForm.hidden = true;
    noteStatus.textContent = 'This writer is not receiving Notes right now.';
    return;
  }

  const session = await getCurrentSession();
  if (!session) {
    noteForm.hidden = true;
    noteStatus.innerHTML = '<a href="/login/">Sign in to leave a Note.</a>';
    return;
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    noteForm.hidden = true;
    noteStatus.textContent = 'Please complete your account profile before leaving Notes.';
    return;
  }

  if (story.author_id === profile.id) {
    noteForm.hidden = true;
    noteStatus.textContent = 'This is your chapter. Reader Notes will appear on your Pinboard.';
    return;
  }

  noteForm.hidden = false;
  noteForm.onsubmit = async (event) => {
    event.preventDefault();
    noteStatus.textContent = '';
    leaveNoteButton.disabled = true;
    leaveNoteButton.textContent = 'Pinning...';

    try {
      const formData = new FormData(noteForm);
      await createChapterNote({
        story,
        chapter,
        noteType: formData.get('noteType'),
        note: formData.get('note')
      });
      noteForm.reset();
      noteStatus.textContent = 'Your Note has been pinned to the writer’s Pinboard, with a Spark attached.';
      await mountChapterSparkControl(chapterSparkControl, story, chapter);
    } catch (error) {
      noteStatus.textContent = friendlyEngagementError(error, 'note');
    } finally {
      leaveNoteButton.disabled = false;
      leaveNoteButton.textContent = 'Leave Note';
    }
  };
}

function setNavLink(link, story, chapter, text) {
  if (!chapter) return;
  link.href = `/story/${story.slug}/chapter/${chapter.chapter_number}/`;
  link.textContent = text;
  link.hidden = false;
}

function renderChapterMeta(story, chapter) {
  const author = story.author || {};
  const authorName = author.pen_name || author.display_name || author.username || 'EverDraft member';
  const chapterLabel = `Chapter ${chapter.chapter_number}`;

  if (!author.username) return chapterLabel;

  return `${escapeHtml(chapterLabel)} · By <a href="/writer/${escapeHtml(author.username)}/">${escapeHtml(authorName)}</a>`;
}

async function loadChapter() {
  const { slug, chapterNumber } = getRouteParts();
  backToStoryLink.href = `/story/${slug}/`;
  chapterBackToStoryLink.href = `/story/${slug}/`;

  try {
    const { story, chapter, previousChapter, nextChapter } = await getPublicChapterBySlugAndNumber(slug, chapterNumber);

    if (!story || !chapter) {
      chapterTitle.textContent = 'Chapter unavailable';
      unavailableNotice.hidden = false;
      return;
    }

    storyTitle.textContent = story.title || 'EverDraft story';
    chapterTitle.textContent = chapter.title || 'Untitled chapter';
    chapterMeta.innerHTML = renderChapterMeta(story, chapter);
    chapterFollowControls.addEventListener('followerror', (event) => {
      status.textContent = event.detail;
    });
    chapterSparkControl.addEventListener('sparkerror', (event) => {
      status.textContent = event.detail;
    });
    await mountChapterSparkControl(chapterSparkControl, story, chapter);
    await mountFollowControls(chapterFollowControls, story, { compact: true, mode: 'story' });
    chapterContent.innerHTML = renderParagraphs(chapter.content);
    chapterContent.hidden = false;
    await setupNotePanel(story, chapter);
    setNavLink(previousChapterLink, story, previousChapter, 'Previous Chapter');
    setNavLink(nextChapterLink, story, nextChapter, 'Next Chapter');
  } catch (error) {
    status.textContent = friendlyChapterError(error);
  }
}

loadChapter();
