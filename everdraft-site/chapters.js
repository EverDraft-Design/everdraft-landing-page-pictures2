import { getSupabaseBrowserClient } from '/auth.js';
import { friendlyStoryError, getStoryByIdForAuthor, requireMemberProfile } from '/stories.js';

const CHAPTER_SELECT = 'id, story_id, title, chapter_number, content, status, published_at, created_at, updated_at';
const PUBLIC_STORY_SELECT = 'id, author_id, title, slug, blurb, genre, status, cover_url, banner_url, is_readable, created_at, updated_at';
const VALID_CHAPTER_STATUSES = new Set(['draft', 'published', 'hidden', 'archived']);

export function friendlyChapterError(error) {
  const rawMessage = error && error.message ? String(error.message).trim() : '';
  const message = rawMessage.toLowerCase();

  if (!message) return 'The chapter could not be saved. Please try again.';
  if (message.includes('duplicate') || message.includes('chapters_story_chapter_number_key')) {
    return `That chapter number is already used for this story. Supabase: ${rawMessage}`;
  }
  if (message.includes('row-level security') || message.includes('permission')) {
    return `Supabase chapter permission error: ${rawMessage}. Apply supabase/migrations/007_fix_chapter_ownership_rls.sql if chapter ownership policies are missing.`;
  }
  if (message.includes('sign in')) return 'Please sign in to continue.';
  if (message.includes('profile')) return rawMessage;
  if (message.includes('not found') || message.includes('belongs')) return rawMessage;
  if (message.includes('required') || message.includes('chapter number') || message.includes('status')) return rawMessage;

  return `The chapter could not be saved. Supabase: ${rawMessage}`;
}

export async function getStoryForCurrentAuthor(storyId) {
  const { profile, canWrite } = await requireMemberProfile();
  const { story } = await getStoryByIdForAuthor(storyId);

  if (!story || story.author_id !== profile.id) {
    return { profile, canWrite, story: null };
  }

  return { profile, canWrite, story };
}

export async function getChaptersForAuthorStory(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const { profile, canWrite, story } = await getStoryForCurrentAuthor(storyId);

  if (!story) {
    return { profile, canWrite, story: null, chapters: [] };
  }

  const { data, error } = await supabase
    .from('chapters')
    .select(CHAPTER_SELECT)
    .eq('story_id', story.id)
    .order('chapter_number', { ascending: true });

  if (error) throw error;
  return { profile, canWrite, story, chapters: data || [] };
}

export async function getChapterForAuthor(chapterId, storyId = '') {
  const supabase = await getSupabaseBrowserClient();

  if (!storyId) {
    const { data, error } = await supabase
      .from('chapters')
      .select(CHAPTER_SELECT)
      .eq('id', chapterId)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      const { profile, canWrite } = await requireMemberProfile();
      return { profile, canWrite, story: null, chapter: null };
    }

    return getChapterForAuthor(chapterId, data.story_id);
  }

  const { profile, canWrite, story } = await getStoryForCurrentAuthor(storyId);

  if (!story) {
    return { profile, canWrite, story: null, chapter: null };
  }

  const { data, error } = await supabase
    .from('chapters')
    .select(CHAPTER_SELECT)
    .eq('id', chapterId)
    .eq('story_id', story.id)
    .maybeSingle();

  if (error) throw error;
  return { profile, canWrite, story, chapter: data };
}

function cleanChapterPayload(input, existingChapter = null) {
  const chapterNumber = Number.parseInt(String(input.chapterNumber || input.chapter_number || ''), 10);
  const title = String(input.title || '').trim();
  const content = String(input.content || '').trim();
  const status = String(input.status || 'draft').trim() || 'draft';

  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
    throw new Error('Chapter number is required and must be 1 or higher.');
  }
  if (!title) {
    throw new Error('Chapter title is required.');
  }
  if (!VALID_CHAPTER_STATUSES.has(status)) {
    throw new Error('Please choose a valid chapter status.');
  }
  if (status === 'published' && !content) {
    throw new Error('Chapter content is required before publishing.');
  }

  const payload = {
    chapter_number: chapterNumber,
    title,
    content,
    status
  };

  if (status === 'published' && !existingChapter?.published_at) {
    payload.published_at = new Date().toISOString();
  }

  return payload;
}

export async function createChapter(storyId, input) {
  const supabase = await getSupabaseBrowserClient();
  const { story } = await getStoryForCurrentAuthor(storyId);

  if (!story) {
    throw new Error('This story was not found, or it belongs to another profile.');
  }

  const chapter = cleanChapterPayload(input);
  const { data, error } = await supabase
    .from('chapters')
    .insert({ ...chapter, story_id: story.id })
    .select(CHAPTER_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateChapter(storyId, chapterId, input) {
  const supabase = await getSupabaseBrowserClient();
  const { story, chapter: existingChapter } = await getChapterForAuthor(chapterId, storyId);

  if (!story || !existingChapter) {
    throw new Error('This chapter was not found, or it belongs to another story.');
  }

  const chapter = cleanChapterPayload(input, existingChapter);
  const { data, error } = await supabase
    .from('chapters')
    .update(chapter)
    .eq('id', existingChapter.id)
    .eq('story_id', story.id)
    .select(CHAPTER_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function archiveChapter(storyId, chapterId) {
  const supabase = await getSupabaseBrowserClient();
  const { story, chapter } = await getChapterForAuthor(chapterId, storyId);

  if (!story || !chapter) {
    throw new Error('This chapter was not found, or it belongs to another story.');
  }

  const { data, error } = await supabase
    .from('chapters')
    .update({ status: 'archived' })
    .eq('id', chapter.id)
    .eq('story_id', story.id)
    .select(CHAPTER_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function getPublicStoryBySlug(slug) {
  const supabase = await getSupabaseBrowserClient();
  const cleanSlug = String(slug || '').trim().toLowerCase();

  const { data, error } = await supabase
    .from('stories')
    .select(PUBLIC_STORY_SELECT)
    .eq('slug', cleanSlug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: author, error: authorError } = await supabase
    .from('profiles')
    .select('id, username, display_name, pen_name')
    .eq('id', data.author_id)
    .maybeSingle();

  if (authorError) throw authorError;
  return { ...data, author };
}

export async function getPublicPublishedChaptersForStory(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('chapters')
    .select('id, story_id, title, chapter_number, status, published_at')
    .eq('story_id', storyId)
    .eq('status', 'published')
    .order('chapter_number', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getPublicChapterBySlugAndNumber(slug, chapterNumber) {
  const story = await getPublicStoryBySlug(slug);

  if (!story || !story.is_readable) {
    return { story, chapter: null, previousChapter: null, nextChapter: null };
  }

  const chapters = await getPublicPublishedChaptersForStory(story.id);
  const number = Number.parseInt(String(chapterNumber || ''), 10);
  const index = chapters.findIndex((chapter) => chapter.chapter_number === number);

  if (index < 0) {
    return { story, chapter: null, previousChapter: null, nextChapter: null };
  }

  const supabase = await getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('chapters')
    .select(CHAPTER_SELECT)
    .eq('story_id', story.id)
    .eq('chapter_number', number)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;

  return {
    story,
    chapter: data,
    previousChapter: chapters[index - 1] || null,
    nextChapter: chapters[index + 1] || null
  };
}

export { friendlyStoryError };
