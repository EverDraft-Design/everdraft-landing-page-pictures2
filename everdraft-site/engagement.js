import { getCurrentProfile, getCurrentSession, getSupabaseBrowserClient } from '/auth.js';
import { getFriendlyErrorMessage } from '/errors.js';

const STORY_SPARK_SELECT = 'id, story_id, profile_id, created_at';
const CHAPTER_SPARK_SELECT = 'id, chapter_id, story_id, profile_id, created_at';
const NOTE_SELECT = 'id, chapter_id, story_id, from_profile_id, writer_profile_id, note_type, note, created_at, updated_at';
const NOTE_REPLY_SELECT = 'id, note_id, writer_profile_id, reply, created_at, updated_at';
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

export function friendlyEngagementError(error, context = 'engagement') {
  return getFriendlyErrorMessage(error, context);
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

async function getWriterNotesEnabled(supabase, writerProfileId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, notes_enabled')
    .eq('id', writerProfileId)
    .maybeSingle();

  if (String(error?.message || '').toLowerCase().includes('notes_enabled')) {
    return true;
  }

  if (error) throw error;
  return data?.notes_enabled !== false;
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
  if (story.author?.notes_enabled === false || !(await getWriterNotesEnabled(supabase, story.author_id))) {
    throw new Error('This writer is not receiving Notes right now.');
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

export async function getMyPinboardNotes(currentProfile = null) {
  const supabase = await getSupabaseBrowserClient();
  const profile = currentProfile || await requireEngagementProfile();

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

  const noteIds = notes.map((note) => note.id);
  const [{ data: stories, error: storyError }, { data: chapters, error: chapterError }, { data: readers, error: readerError }, { data: replies, error: replyError }] = await Promise.all([
    supabase.from('stories').select('id, title, slug, author_id').in('id', storyIds),
    supabase.from('chapters').select('id, title, chapter_number, story_id').in('id', chapterIds),
    supabase.from('profiles').select('id, username, display_name, pen_name').in('id', readerIds),
    supabase.from('note_replies').select(NOTE_REPLY_SELECT).in('note_id', noteIds)
  ]);

  if (storyError) throw storyError;
  if (chapterError) throw chapterError;
  if (readerError) throw readerError;
  if (replyError) throw replyError;

  const storiesById = new Map((stories || []).map((story) => [story.id, story]));
  const chaptersById = new Map((chapters || []).map((chapter) => [chapter.id, chapter]));
  const readersById = new Map((readers || []).map((reader) => [reader.id, reader]));
  const repliesByNoteId = new Map((replies || []).map((reply) => [reply.note_id, reply]));

  return notes.map((pin) => ({
    ...pin,
    story: storiesById.get(pin.story_id) || null,
    chapter: chaptersById.get(pin.chapter_id) || null,
    from_profile: readersById.get(pin.from_profile_id) || null,
    reply: repliesByNoteId.get(pin.id) || null
  }));
}

function cleanReply(value) {
  const reply = String(value || '').trim();
  if (!reply) throw new Error('A reply needs a few words before it can be sent.');
  if (reply.length > 2000) throw new Error('Please keep your reply under 2,000 characters.');
  return reply;
}

export async function saveNoteReply(noteId, value) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireEngagementProfile();
  const cleanNoteId = requireId(noteId, 'Note');

  const { data, error } = await supabase
    .from('note_replies')
    .insert({
      note_id: cleanNoteId,
      writer_profile_id: profile.id,
      reply: cleanReply(value)
    })
    .select(NOTE_REPLY_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function deleteNoteReply(replyId) {
  const supabase = await getSupabaseBrowserClient();
  await requireEngagementProfile();

  const { error } = await supabase
    .from('note_replies')
    .delete()
    .eq('id', requireId(replyId, 'Reply'));

  if (error) throw error;
  return true;
}

export async function getMyNotesForChapter(chapterId) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireEngagementProfile();
  const cleanChapterId = requireId(chapterId, 'Chapter');

  const { data: notes, error } = await supabase
    .from('notes')
    .select(NOTE_SELECT)
    .eq('chapter_id', cleanChapterId)
    .eq('from_profile_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!notes?.length) return [];

  const { data: replies, error: replyError } = await supabase
    .from('note_replies')
    .select(NOTE_REPLY_SELECT)
    .in('note_id', notes.map((note) => note.id));

  if (replyError) throw replyError;
  const repliesByNoteId = new Map((replies || []).map((reply) => [reply.note_id, reply]));

  return notes.map((note) => ({
    ...note,
    reply: repliesByNoteId.get(note.id) || null
  }));
}

export async function getUnreadPinboardNotificationCount(currentProfile = null) {
  const supabase = await getSupabaseBrowserClient();
  const profile = currentProfile || await requireEngagementProfile();
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_profile_id', profile.id)
    .eq('notification_type', 'pinboard_note')
    .is('read_at', null);

  if (error) throw error;
  return count || 0;
}

export async function markPinboardNotificationsRead(currentProfile = null) {
  const supabase = await getSupabaseBrowserClient();
  const profile = currentProfile || await requireEngagementProfile();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_profile_id', profile.id)
    .eq('notification_type', 'pinboard_note')
    .is('read_at', null);

  if (error) throw error;
  return true;
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
