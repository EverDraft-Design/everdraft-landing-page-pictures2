import { getSupabaseBrowserClient } from '/auth.js';
import { getStoryByIdForAuthor, requireWriterProfile } from '/stories.js';

const CHAPTER_SELECT = 'id, story_id, title, chapter_number, content, status, published_at, created_at, updated_at';

export function friendlyChapterError(error) {
  const message = (error && error.message ? error.message : '').toLowerCase();

  if (message.includes('duplicate') || message.includes('chapters_story_chapter_number_key')) {
    return 'That chapter number is already used for this story.';
  }
  if (message.includes('row-level security') || message.includes('permission')) {
    return 'You do not have permission to change this chapter.';
  }
  if (message.includes('chapter number')) {
    return 'Please enter a valid chapter number.';
  }

  return 'The chapter could not be saved. Please check the fields and try again.';
}

export async function requireAuthorStory(storyId) {
  const { canWrite } = await requireWriterProfile();

  if (!canWrite) {
    return {
      canWrite,
      story: null
    };
  }

  const { story } = await getStoryByIdForAuthor(storyId);

  return {
    canWrite,
    story
  };
}

export async function getChaptersForStory(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const { canWrite, story } = await requireAuthorStory(storyId);

  if (!canWrite || !story) {
    return {
      canWrite,
      story,
      chapters: []
    };
  }

  const { data, error } = await supabase
    .from('chapters')
    .select(CHAPTER_SELECT)
    .eq('story_id', story.id)
    .order('chapter_number', { ascending: true });

  if (error) throw error;

  return {
    canWrite,
    story,
    chapters: data || []
  };
}

export async function getChapterByIdForStory(storyId, chapterId) {
  const supabase = await getSupabaseBrowserClient();
  const { canWrite, story } = await requireAuthorStory(storyId);

  if (!canWrite || !story) {
    return {
      canWrite,
      story,
      chapter: null
    };
  }

  const { data, error } = await supabase
    .from('chapters')
    .select(CHAPTER_SELECT)
    .eq('id', chapterId)
    .eq('story_id', story.id)
    .maybeSingle();

  if (error) throw error;

  return {
    canWrite,
    story,
    chapter: data
  };
}

function cleanChapterPayload(input) {
  const title = String(input.title || '').trim();
  const chapterNumber = Number.parseInt(input.chapterNumber, 10);

  if (!title) {
    throw new Error('A chapter title is required.');
  }

  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
    throw new Error('A valid chapter number is required.');
  }

  return {
    title,
    chapter_number: chapterNumber,
    content: String(input.content || '').trim(),
    status: input.status || 'draft'
  };
}

export async function createChapter(storyId, input) {
  const supabase = await getSupabaseBrowserClient();
  const { canWrite, story } = await requireAuthorStory(storyId);

  if (!canWrite || !story) {
    throw new Error('Chapter drafting is available only for your own stories.');
  }

  const chapter = cleanChapterPayload(input);

  const { data, error } = await supabase
    .from('chapters')
    .insert({
      ...chapter,
      story_id: story.id
    })
    .select(CHAPTER_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateChapter(storyId, chapterId, input) {
  const supabase = await getSupabaseBrowserClient();
  const { canWrite, story } = await requireAuthorStory(storyId);

  if (!canWrite || !story) {
    throw new Error('Chapter editing is available only for your own stories.');
  }

  const chapter = cleanChapterPayload(input);

  const { data, error } = await supabase
    .from('chapters')
    .update(chapter)
    .eq('id', chapterId)
    .eq('story_id', story.id)
    .select(CHAPTER_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function archiveChapter(storyId, chapterId) {
  const supabase = await getSupabaseBrowserClient();
  const { canWrite, story } = await requireAuthorStory(storyId);

  if (!canWrite || !story) {
    throw new Error('Chapter archiving is available only for your own stories.');
  }

  const { data, error } = await supabase
    .from('chapters')
    .update({ status: 'archived' })
    .eq('id', chapterId)
    .eq('story_id', story.id)
    .select(CHAPTER_SELECT)
    .single();

  if (error) throw error;
  return data;
}
