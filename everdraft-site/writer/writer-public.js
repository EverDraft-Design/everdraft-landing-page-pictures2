import { friendlyFollowError, getDisplayName, getPublicWriterProfileByUsername } from '/follows.js';
import { mountFollowControls } from '/follow-controls.js';

const writerTitle = document.getElementById('writer-title');
const writerMeta = document.getElementById('writerMeta');
const writerFollowControls = document.getElementById('writerFollowControls');
const writerBio = document.getElementById('writerBio');
const writerStoriesList = document.getElementById('writerStoriesList');
const writerStatus = document.getElementById('writerStatus');

function getUsername() {
  const match = window.location.pathname.match(/^\/writer\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : '';
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

function snippet(value, maxLength = 180) {
  const text = String(value || '').trim();
  if (!text) return 'No blurb has been added yet.';
  return text.length > maxLength ? `${text.slice(0, maxLength).trim()}...` : text;
}

function renderStories(stories) {
  if (!stories.length) {
    writerStoriesList.innerHTML = '<div class="empty-state">This writer has no public stories on the shelf yet.</div>';
    return;
  }

  writerStoriesList.innerHTML = stories.map((story) => `
    <article class="story-card">
      <p class="eyebrow">${escapeHtml(story.status || 'Story')}</p>
      <h2>${escapeHtml(story.title || 'Untitled story')}</h2>
      <p>${escapeHtml(snippet(story.blurb))}</p>
      <dl class="story-meta">
        <div><dt>Genre</dt><dd>${escapeHtml(story.genre || 'Genre not set')}</dd></div>
      </dl>
      <div class="auth-actions">
        <a class="button-link secondary-link" href="/story/${escapeHtml(story.slug)}/">Read Story</a>
      </div>
    </article>
  `).join('');
}

async function loadWriter() {
  try {
    const { writer, stories } = await getPublicWriterProfileByUsername(getUsername());

    if (!writer) {
      writerTitle.textContent = 'Writer unavailable';
      writerStoriesList.innerHTML = '<div class="empty-state">This writer profile was not found.</div>';
      return;
    }

    writerTitle.textContent = getDisplayName(writer);
    writerMeta.textContent = writer.username ? `@${writer.username}` : 'EverDraft writer profile';

    if (writer.bio) {
      writerBio.innerHTML = `<h2>About</h2><p>${escapeHtml(writer.bio)}</p>`;
      writerBio.hidden = false;
    }

    writerFollowControls.addEventListener('followerror', (event) => {
      writerStatus.textContent = event.detail;
    });
    await mountFollowControls(writerFollowControls, { author_id: writer.id }, { mode: 'writer' });
    renderStories(stories);
  } catch (error) {
    writerStatus.textContent = friendlyFollowError(error);
    writerStoriesList.innerHTML = '<div class="empty-state">This writer profile could not be loaded.</div>';
  }
}

loadWriter();
