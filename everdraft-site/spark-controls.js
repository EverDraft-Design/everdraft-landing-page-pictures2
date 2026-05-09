import { getCurrentProfile, getCurrentSession } from '/auth.js';
import {
  friendlyEngagementError,
  getChapterSparkCount,
  getStorySparkCount,
  hasCurrentUserSparkedChapter,
  hasCurrentUserSparkedStory,
  toggleChapterSpark,
  toggleStorySpark
} from '/engagement.js';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function loginHref() {
  return `/login/?redirect=${encodeURIComponent(window.location.pathname)}`;
}

async function getOptionalProfile() {
  const session = await getCurrentSession();
  if (!session) return null;
  return getCurrentProfile();
}

function formatCount(count) {
  return `${count} ${count === 1 ? 'Spark' : 'Sparks'}`;
}

function renderSpark(container, { count, sparked, disabled, label, prompt }) {
  container.innerHTML = `
    <button type="button" class="spark-control${sparked ? ' sparked' : ''}" ${disabled ? 'disabled' : ''} aria-label="${escapeHtml(label)}">
      <span class="spark-icon" aria-hidden="true">${sparked ? '✦' : '✧'}</span>
      <span class="spark-count">${escapeHtml(formatCount(count))}</span>
    </button>
    ${prompt ? `<p class="field-note spark-note">${prompt}</p>` : ''}
  `;
}

async function mountSparkControl(container, subject, {
  getCount,
  hasSparked,
  toggleSpark,
  ownerId,
  ownerPrompt
}) {
  if (!container || !subject?.id) return;
  container.classList.add('spark-control-wrap');

  try {
    const [count, currentProfile] = await Promise.all([
      getCount(subject.id),
      getOptionalProfile()
    ]);

    if (!currentProfile) {
      renderSpark(container, {
        count,
        sparked: false,
        disabled: false,
        label: 'Sign in to Spark',
        prompt: `<a href="${escapeHtml(loginHref())}">Sign in to Spark.</a>`
      });
      container.querySelector('.spark-control')?.addEventListener('click', () => {
        window.location.assign(loginHref());
      });
      return;
    }

    if (ownerId && ownerId === currentProfile.id) {
      renderSpark(container, {
        count,
        sparked: false,
        disabled: true,
        label: ownerPrompt,
        prompt: ''
      });
      return;
    }

    const sparked = await hasSparked(subject.id);
    renderSpark(container, {
      count,
      sparked,
      disabled: false,
      label: sparked ? 'Remove Spark' : 'Add Spark',
      prompt: ''
    });

    container.querySelector('.spark-control')?.addEventListener('click', async () => {
      const button = container.querySelector('.spark-control');
      button.disabled = true;
      try {
        await toggleSpark(subject.id);
        await mountSparkControl(container, subject, { getCount, hasSparked, toggleSpark, ownerId, ownerPrompt });
      } catch (error) {
        container.dispatchEvent(new CustomEvent('sparkerror', { detail: friendlyEngagementError(error, 'spark') }));
        button.disabled = false;
      }
    });
  } catch (error) {
    container.dispatchEvent(new CustomEvent('sparkerror', { detail: friendlyEngagementError(error, 'spark') }));
  }
}

export async function mountStorySparkControl(container, story) {
  return mountSparkControl(container, story, {
    getCount: getStorySparkCount,
    hasSparked: hasCurrentUserSparkedStory,
    toggleSpark: toggleStorySpark,
    ownerId: story?.author_id,
    ownerPrompt: 'Your story already carries your light.'
  });
}

export async function mountChapterSparkControl(container, story, chapter) {
  return mountSparkControl(container, chapter, {
    getCount: getChapterSparkCount,
    hasSparked: hasCurrentUserSparkedChapter,
    toggleSpark: toggleChapterSpark,
    ownerId: story?.author_id,
    ownerPrompt: 'This is your chapter. Reader Sparks will gather here.'
  });
}
