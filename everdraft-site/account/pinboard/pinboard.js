import { getDisplayName } from '/follows.js';
import { getCurrentProfile } from '/auth.js';
import { friendlyEngagementError, getMyPinboardNotes, NOTE_TYPE_LABELS } from '/engagement.js';

const pinboardList = document.getElementById('pinboardList');
const pinboardNotesSetting = document.getElementById('pinboardNotesSetting');
const pinboardStatus = document.getElementById('pinboardStatus');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function formatDate(value) {
  if (!value) return 'Recently';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
}

function renderEmpty() {
  pinboardList.innerHTML = '<div class="empty-state">No Notes yet. When readers leave thoughts on your chapters, they’ll appear here.</div>';
}

function renderNotes(notes) {
  if (!notes.length) {
    renderEmpty();
    return;
  }

  pinboardList.innerHTML = notes.map((pin) => {
    const story = pin.story || {};
    const chapter = pin.chapter || {};
    const reader = pin.from_profile || {};
    const storyTitle = story.title || 'Untitled story';
    const chapterTitle = chapter.title || 'Untitled chapter';
    const chapterNumber = chapter.chapter_number ? `Chapter ${chapter.chapter_number}` : 'Chapter';
    const readerName = getDisplayName(reader);
    const label = NOTE_TYPE_LABELS[pin.note_type] || 'Note';

    return `
      <article class="pinboard-card">
        <div class="pinboard-card-header">
          <p class="eyebrow">${escapeHtml(label)}</p>
          <p class="muted-copy">${escapeHtml(formatDate(pin.created_at))}</p>
        </div>
        <h2>${escapeHtml(storyTitle)}</h2>
        <p class="muted-copy">${escapeHtml(chapterNumber)} · ${escapeHtml(chapterTitle)}</p>
        <blockquote>${escapeHtml(pin.note)}</blockquote>
        <p class="muted-copy">From ${escapeHtml(readerName)}</p>
        ${story.slug ? `<a class="button-link secondary-link" href="/story/${escapeHtml(story.slug)}/">Open Story</a>` : ''}
      </article>
    `;
  }).join('');
}

async function loadPinboard() {
  try {
    pinboardList.innerHTML = '<div class="empty-state">Gathering your Pinboard...</div>';
    const [profile, notes] = await Promise.all([
      getCurrentProfile(),
      getMyPinboardNotes()
    ]);
    pinboardNotesSetting.textContent = profile?.notes_enabled === false
      ? 'Reader Notes are currently turned off.'
      : '';
    renderNotes(notes);
  } catch (error) {
    pinboardStatus.textContent = friendlyEngagementError(error);
    renderEmpty();
  }
}

loadPinboard();
