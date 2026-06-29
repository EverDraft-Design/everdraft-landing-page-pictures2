import { friendlyAuthError, requireSession } from '/auth.js';
import { friendlyChapterError, getChaptersForAuthorStory } from '/chapters.js';
import { friendlyEngagementError, getNoteSummaryForStory } from '/engagement.js';
import { createJourneyMilestone, friendlyJourneyError, getMilestonesForAuthorStory, updateJourneyMilestoneVisibility } from '/journey.js';

const title = document.getElementById('story-title');
const summary = document.getElementById('storySummary');
const readerNotice = document.getElementById('readerNotice');
const storyActions = document.getElementById('storyActions');
const addChapterLink = document.getElementById('addChapterLink');
const editStoryLink = document.getElementById('editStoryLink');
const publicStoryLink = document.getElementById('publicStoryLink');
const chapterList = document.getElementById('chapterList');
const journeyPanel = document.querySelector('.journey-author-panel');
const journeyForm = document.getElementById('journeyForm');
const journeyList = document.getElementById('journeyList');
const saveJourneyButton = document.getElementById('saveJourneyButton');
const status = document.getElementById('storyStatus');

function getStoryId() {
  const match = window.location.pathname.match(/^\/my\/stories\/([^/]+)\/?$/);
  if (match) return decodeURIComponent(match[1]);
  return new URLSearchParams(window.location.search).get('storyId') || '';
}

function formatDate(value) {
  if (!value) return 'Not published';
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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

function formatCount(value, singular, plural = `${singular}s`) {
  const count = Number(value) || 0;
  return `${count} ${count === 1 ? singular : plural}`;
}

function renderJourneyMilestones(milestones) {
  if (!journeyList) return;
  if (!milestones.length) {
    journeyList.innerHTML = '<div class="empty-state">No Story Journey milestones yet. Create one when this story reaches a meaningful discovery, rewrite, or transformation.</div>';
    return;
  }

  journeyList.innerHTML = milestones.map((milestone) => `
    <article class="journey-card" data-milestone-id="${escapeHtml(milestone.id)}">
      <div>
        <p class="eyebrow">${escapeHtml(milestone.visibility === 'public' ? 'Public Milestone' : 'Private Milestone')}</p>
        <h3>${escapeHtml(milestone.title)}</h3>
        ${milestone.reflection ? `<p>${escapeHtml(milestone.reflection)}</p>` : '<p class="muted-copy">No reflection added yet.</p>'}
      </div>
      <dl class="story-meta">
        <div><dt>Snapshot</dt><dd>${formatCount(milestone.snapshot?.chapters?.length || 0, 'chapter')}</dd></div>
        <div><dt>Words</dt><dd>${formatCount(milestone.word_count, 'word')}</dd></div>
        <div><dt>Created</dt><dd>${formatDate(milestone.created_at)}</dd></div>
      </dl>
      <label class="journey-visibility-toggle">
        <span>Visibility</span>
        <select data-visibility-select>
          <option value="private" ${milestone.visibility === 'private' ? 'selected' : ''}>Private</option>
          <option value="public" ${milestone.visibility === 'public' ? 'selected' : ''}>Public</option>
        </select>
      </label>
    </article>
  `).join('');

  journeyList.querySelectorAll('[data-visibility-select]').forEach((select) => {
    select.addEventListener('change', async (event) => {
      const card = event.target.closest('[data-milestone-id]');
      if (!card) return;
      status.textContent = '';
      event.target.disabled = true;
      try {
        await updateJourneyMilestoneVisibility(card.dataset.milestoneId, event.target.value);
        status.textContent = 'Milestone visibility updated.';
        await refreshJourney();
      } catch (error) {
        status.textContent = friendlyJourneyError(error);
      } finally {
        event.target.disabled = false;
      }
    });
  });
}

async function refreshJourney() {
  try {
    const { milestones } = await getMilestonesForAuthorStory(getStoryId());
    renderJourneyMilestones(milestones);
  } catch (error) {
    journeyList.innerHTML = '<div class="empty-state">Story Journey is ready in the app, but the database migration needs to be applied before milestones can be saved.</div>';
  }
}

function renderChapters(storyId, chapters, noteSummary = new Map()) {
  if (!chapters.length) {
    chapterList.innerHTML = '<div class="empty-state">This story is waiting for its first chapter.</div>';
    return;
  }

  chapterList.innerHTML = chapters.map((chapter) => {
    const summary = noteSummary.get(chapter.id) || { sparks: 0, notes: 0 };
    return `
      <article class="story-card">
        <div>
          <p class="eyebrow">Chapter ${chapter.chapter_number} · ${escapeHtml(chapter.status || 'draft')}</p>
          <h2>${escapeHtml(chapter.title)}</h2>
          <p class="muted-copy">${summary.sparks} ${summary.sparks === 1 ? 'Spark' : 'Sparks'} · ${summary.notes} ${summary.notes === 1 ? 'Note' : 'Notes'}</p>
        </div>
        <dl class="story-meta">
          <div><dt>Published</dt><dd>${formatDate(chapter.published_at)}</dd></div>
          <div><dt>Updated</dt><dd>${formatDate(chapter.updated_at)}</dd></div>
        </dl>
        <div class="auth-actions">
          <a class="button-link secondary-link" href="/my/stories/${storyId}/chapters/${chapter.id}/edit/">Edit Chapter</a>
        </div>
      </article>
    `;
  }).join('');
}

async function loadStory() {
  try {
    const session = await requireSession();
    if (!session) return;

    const storyId = getStoryId();
    const { story, chapters } = await getChaptersForAuthorStory(storyId);

    if (!story) {
      readerNotice.hidden = false;
      title.textContent = 'Story unavailable';
      summary.textContent = '';
      return;
    }

    title.textContent = story.title || 'Untitled story';
    summary.textContent = `${story.genre || 'Genre not set'} · ${story.status || 'draft'} · ${story.slug || 'no-slug'}`;
    addChapterLink.href = `/my/stories/${story.id}/chapters/new/`;
    editStoryLink.href = `/my/stories/${story.id}/edit/`;
    publicStoryLink.href = story.slug ? `/story/${story.slug}/` : '/my/stories/';
    storyActions.hidden = false;
    journeyPanel.hidden = false;
    await refreshJourney();
    renderChapters(story.id, chapters, await getNoteSummaryForStory(story.id));
  } catch (error) {
    status.textContent = error.message.includes('profile')
      ? friendlyAuthError(error)
      : (error.message.includes('Spark') || error.message.includes('Note') ? friendlyEngagementError(error) : friendlyChapterError(error));
  }
}

if (journeyForm) {
  journeyForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    saveJourneyButton.disabled = true;
    saveJourneyButton.textContent = 'Saving milestone...';

    try {
      await createJourneyMilestone(getStoryId(), Object.fromEntries(new FormData(journeyForm).entries()));
      journeyForm.reset();
      status.textContent = 'Journey Milestone created.';
      await refreshJourney();
    } catch (error) {
      status.textContent = friendlyJourneyError(error);
    } finally {
      saveJourneyButton.disabled = false;
      saveJourneyButton.textContent = 'Create Journey Milestone';
    }
  });
}

loadStory();