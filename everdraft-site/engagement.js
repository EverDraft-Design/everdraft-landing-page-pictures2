import { getCurrentProfile, getCurrentSession, getSupabaseBrowserClient } from '/auth.js';

const STORY_SPARK_SELECT = 'id, story_id, profile_id, created_at';
const CHAPTER_SPARK_SELECT = 'id, chapter_id, story_id, profile_id, created_at';
const NOTE_SELECT = 'id, chapter_id, story_id, from_profile_id, writer_profile_id, note_type, note, created_at, updated_at';
const NOTE_TYPES = new Set([
  'encouragement',
  'reader_reaction',
  'character_thought',
  'plot_thought',
  'pacing_thought',
  'clarity_note',
  'tiny_typo'
]);

export const NOTE_TYPE_LABELS = {
  encouragement: 'Encouragement',
  reader_reaction: 'Reader Reaction',
  character_thought: 'Character Thought',
  plot_thought: 'Plot Thought',
  pacing_thought: 'Pacing Thought',
  clarity_note: 'Clarity Note',
  tiny_typo: 'Tiny Typo'
};

export function friendlyEngagementError(error) {
  const rawMessage = error && error.message ? String(error.message).trim() : '';
  const message = rawMessage.toLowerCase();

  if (!message) return 'This could not be saved yet. Please try again.';
  if (message.includes('sign in')) return 'Please sign in to continue.';
  if (message.includes('complete your account profile') || message.includes('profile')) return rawMessage;
  if (message.includes('not found') || message.includes('readable') || message.includes('chapter') || message.includes('story')) return rawMessage;
  if (message.includes('duplicate') || message.includes('unique')) return 'Your Spark is already here.';
  if (message.includes('row-level security') || message.includes('permission')) {
    return `Supabase Notes/Sparks permission error: ${rawMessage}. Apply supabase/migrations/009_phase4_notes_sparks.sql if Phase 4 policies are missing.`;
  }

  return `This could not be saved yet. Supabase: ${rawMessage}`;
}

async function getOptionalProfile() {
  const session = await getCurrentSession();
  if (!session) return null;
  return getCurrentProfile();
}

async function requireEngagementProfile() {
  const session = await getCurrentSession();
  if (!session) throw new Error('Please sign in to continue.');

  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error('Please complete your account profile before leaving Notes or Sparks.');
  }

  return profile;
}

function requireId(value, label) {
  const id = String(value || '').trim();
  if (!id) throw new Error(`${label} was not found.`);
  return id;
}

async function getStoryForSpark(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('stories')
    .select('id, author_id, is_readable')
    .eq('id', requireId(storyId, 'Story'))
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Story was not found.');
  return data;
}

async function getChapterForSpark(chapterId) {
  const supabase = await getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('chapters')
    .select('id, story_id, status')
    .eq('id', requireId(chapterId, 'Chapter'))
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Chapter was not found.');
  return data;
}

export async function getStorySparkCount(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const { count, error } = await supabase
    .from('story_sparks')
    .select('id', { count: 'exact', head: true })
    .eq('story_id', requireId(storyId, 'Story'));

  if (error) throw error;
  return count || 0;
}

export async function hasCurrentUserSparkedStory(storyId) {
  const profile = await getOptionalProfile();
  if (!profile) return false;

  const supabase = await getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('story_sparks')
    .select('id')
    .eq('story_id', requireId(storyId, 'Story'))
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function sparkStory(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireEngagementProfile();
  const story = await getStoryForSpark(storyId);

  if (story.author_id === profile.id) {
    throw new Error('Sparks are for readers.');
  }

  const { data, error } = await supabase
    .from('story_sparks')
    .upsert(
      { story_id: story.id, profile_id: profile.id },
      { onConflict: 'story_id,profile_id', ignoreDuplicates: true }
    )
    .select(STORY_SPARK_SELECT)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function unsparkStory(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireEngagementProfile();

  const { error } = await supabase
    .from('story_sparks')
    .delete()
    .eq('story_id', requireId(storyId, 'Story'))
    .eq('profile_id', profile.id);

  if (error) throw error;
  return true;
}

export async function toggleStorySpark(storyId) {
  if (await hasCurrentUserSparkedStory(storyId)) {
    await unsparkStory(storyId);
    return false;
  }
  await sparkStory(storyId);
  return true;
}

export async function getChapterSparkCount(chapterId) {
  const supabase = await getSupabaseBrowserClient();
  const { count, error } = await supabase
    .from('chapter_sparks')
    .select('id', { count: 'exact', head: true })
    .eq('chapter_id', requireId(chapterId, 'Chapter'));

  if (error) throw error;
  return count || 0;
}

export async function hasCurrentUserSparkedChapter(chapterId) {
  const profile = await getOptionalProfile();
  if (!profile) return false;

  const supabase = await getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('chapter_sparks')
    .select('id')
    .eq('chapter_id', requireId(chapterId, 'Chapter'))
    .eq('profile_id', profile.id)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function sparkChapter(chapterId) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireEngagementProfile();
  const chapter = await getChapterForSpark(chapterId);
  const story = await getStoryForSpark(chapter.story_id);

  if (story.author_id === profile.id) {
    throw new Error('Sparks are for readers.');
  }

  const { data, error } = await supabase
    .from('chapter_sparks')
    .upsert(
      { chapter_id: chapter.id, story_id: story.id, profile_id: profile.id },
      { onConflict: 'chapter_id,profile_id', ignoreDuplicates: true }
    )
    .select(CHAPTER_SPARK_SELECT)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function unsparkChapter(chapterId) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireEngagementProfile();

  const { error } = await supabase
    .from('chapter_sparks')
    .delete()
    .eq('chapter_id', requireId(chapterId, 'Chapter'))
    .eq('profile_id', profile.id);

  if (error) throw error;
  return true;
}

export async function toggleChapterSpark(chapterId) {
  if (await hasCurrentUserSparkedChapter(chapterId)) {
    await unsparkChapter(chapterId);
    return false;
  }
  await sparkChapter(chapterId);
  return true;
}

function cleanNoteInput(input) {
  const noteType = String(input.noteType || input.note_type || 'encouragement').trim();
  const note = String(input.note || '').trim();

  if (!NOTE_TYPES.has(noteType)) {
    throw new Error('Please choose a Note type.');
  }
  if (!note) {
    throw new Error('A Note needs a few words before it can be pinned.');
  }

  return { noteType, note };
}

export async function createChapterNote({ story, chapter, noteType, note }) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireEngagementProfile();
  const clean = cleanNoteInput({ noteType, note });

  if (!story?.id || !chapter?.id) {
    throw new Error('This chapter was not found.');
  }
  if (!story.is_readable || chapter.status !== 'published') {
    throw new Error('This chapter is not currently readable.');
  }
  if (story.author_id === profile.id) {
    throw new Error('Notes are for readers. This is your chapter.');
  }

  const { data, error } = await supabase
    .from('notes')
    .insert({
      chapter_id: chapter.id,
      story_id: story.id,
      from_profile_id: profile.id,
      writer_profile_id: story.author_id,
      note_type: clean.noteType,
      note: clean.note
    })
    .select(NOTE_SELECT)
    .single();

  if (error) throw error;
  await sparkChapter(chapter.id);
  return data;
}

export async function getMyPinboardNotes() {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireEngagementProfile();

  const { data: notes, error } = await supabase
    .from('notes')
    .select(NOTE_SELECT)
    .eq('writer_profile_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!notes?.length) return [];

  const storyIds = [...new Set(notes.map((note) => note.story_id).filter(Boolean))];
  const chapterIds = [...new Set(notes.map((note) => note.chapter_id).filter(Boolean))];
  const readerIds = [...new Set(notes.map((note) => note.from_profile_id).filter(Boolean))];

  const [{ data: stories, error: storyError }, { data: chapters, error: chapterError }, { data: readers, error: readerError }] = await Promise.all([
    supabase.from('stories').select('id, title, slug, author_id').in('id', storyIds),
    supabase.from('chapters').select('id, title, chapter_number, story_id').in('id', chapterIds),
    supabase.from('profiles').select('id, username, display_name, pen_name').in('id', readerIds)
  ]);

  if (storyError) throw storyError;
  if (chapterError) throw chapterError;
  if (readerError) throw readerError;

  const storiesById = new Map((stories || []).map((story) => [story.id, story]));
  const chaptersById = new Map((chapters || []).map((chapter) => [chapter.id, chapter]));
  const readersById = new Map((readers || []).map((reader) => [reader.id, reader]));

  return notes.map((pin) => ({
    ...pin,
    story: storiesById.get(pin.story_id) || null,
    chapter: chaptersById.get(pin.chapter_id) || null,
    from_profile: readersById.get(pin.from_profile_id) || null
  }));
}

export async function getNoteSummaryForStory(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireEngagementProfile();
  const cleanStoryId = requireId(storyId, 'Story');

  const [{ data: notes, error: noteError }, { data: sparks, error: sparkError }] = await Promise.all([
    supabase
      .from('notes')
      .select('id, chapter_id, story_id, writer_profile_id')
      .eq('story_id', cleanStoryId)
      .eq('writer_profile_id', profile.id),
    supabase
      .from('chapter_sparks')
      .select('id, chapter_id, story_id')
      .eq('story_id', cleanStoryId)
  ]);

  if (noteError) throw noteError;
  if (sparkError) throw sparkError;

  const summary = new Map();
  for (const note of notes || []) {
    const current = summary.get(note.chapter_id) || { notes: 0, sparks: 0 };
    current.notes += 1;
    summary.set(note.chapter_id, current);
  }
  for (const spark of sparks || []) {
    const current = summary.get(spark.chapter_id) || { notes: 0, sparks: 0 };
    current.sparks += 1;
    summary.set(spark.chapter_id, current);
  }

  return summary;
}
