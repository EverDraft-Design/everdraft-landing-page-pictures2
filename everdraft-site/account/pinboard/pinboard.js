import { getDisplayName } from '/follows.js';
import { getCurrentProfile } from '/auth.js';
import {
  deleteNoteReply,
  friendlyEngagementError,
  getMyPinboardNotes,
  markPinboardNotificationsRead,
  NOTE_TYPE_LABELS,
  saveNoteReply
} from '/engagement.js';

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

function replyPreview(value, maxLength = 220) {
  const text = String(value || '').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
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
    const reply = pin.reply || null;

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
        ${reply ? `
          <div class="pinboard-reply-summary">
            <div class="pinboard-reply-summary-header">
              <span class="reply-status-badge">Replied</span>
              <span class="muted-copy">${escapeHtml(formatDate(reply.updated_at || reply.created_at))}</span>
            </div>
            <p>${escapeHtml(replyPreview(reply.reply))}</p>
          </div>
        ` : ''}
        <div class="pinboard-reply">
          <p class="eyebrow">${reply ? 'EDIT YOUR REPLY' : 'YOUR REPLY'}</p>
          ${reply ? '' : '<p class="muted-copy">Reply privately to the reader who left this Note.</p>'}
          <form class="pinboard-reply-form" data-note-id="${escapeHtml(pin.id)}">
            <label for="reply-${escapeHtml(pin.id)}" class="sr-only">Reply to this Reader Note</label>
            <textarea id="reply-${escapeHtml(pin.id)}" name="reply" rows="3" maxlength="2000" required>${escapeHtml(reply?.reply || '')}</textarea>
            <div class="pinboard-reply-actions">
              <button type="submit">${reply ? 'Update Reply' : 'Send Reply'}</button>
              ${reply ? `<button type="button" class="secondary-button" data-delete-reply-id="${escapeHtml(reply.id)}">Remove Reply</button>` : ''}
            </div>
            <p class="form-status" data-reply-status aria-live="polite"></p>
          </form>
        </div>
        ${story.slug ? `<a class="button-link secondary-link" href="/story/${escapeHtml(story.slug)}/">Open Story</a>` : ''}
      </article>
    `;
  }).join('');
}

async function loadPinboard() {
  try {
    pinboardList.innerHTML = '<div class="empty-state">Gathering your Pinboard...</div>';
    const profile = await getCurrentProfile();
    const notes = await getMyPinboardNotes(profile);
    pinboardNotesSetting.textContent = profile?.notes_enabled === false
      ? 'Reader Notes are currently turned off.'
      : '';
    renderNotes(notes);
    try {
      await markPinboardNotificationsRead(profile);
      document.querySelectorAll('[data-notification-count]').forEach((badge) => {
        badge.hidden = true;
        badge.textContent = '';
      });
    } catch (notificationError) {
      console.warn('EverDraft could not mark Pinboard notifications as read.', notificationError);
    }
  } catch (error) {
    pinboardStatus.textContent = friendlyEngagementError(error);
    renderEmpty();
  }
}

pinboardList.addEventListener('submit', async (event) => {
  const form = event.target.closest('.pinboard-reply-form');
  if (!form) return;
  event.preventDefault();

  const button = form.querySelector('button[type="submit"]');
  const replyStatus = form.querySelector('[data-reply-status]');
  const reply = new FormData(form).get('reply');
  button.disabled = true;
  replyStatus.textContent = '';

  try {
    await saveNoteReply(form.dataset.noteId, reply);
    await loadPinboard();
  } catch (error) {
    replyStatus.textContent = friendlyEngagementError(error, 'note');
    button.disabled = false;
  }
});

pinboardList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-delete-reply-id]');
  if (!button) return;
  if (!window.confirm('Remove this private reply?')) return;

  button.disabled = true;
  try {
    await deleteNoteReply(button.dataset.deleteReplyId);
    await loadPinboard();
  } catch (error) {
    pinboardStatus.textContent = friendlyEngagementError(error, 'note');
    button.disabled = false;
  }
});

loadPinboard();
