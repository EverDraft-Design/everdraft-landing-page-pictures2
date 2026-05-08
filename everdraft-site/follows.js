import { getCurrentProfile, getCurrentSession, getSupabaseBrowserClient } from '/auth.js';
import { getFriendlyErrorMessage } from '/errors.js';

const STORY_FOLLOW_SELECT = 'id, story_id, user_id, created_at';
const WRITER_FOLLOW_SELECT = 'id, writer_id, user_id, created_at';
const FOLLOWED_STORY_SELECT = 'id, author_id, title, slug, status, genre, is_readable, updated_at';
const FOLLOWED_PROFILE_SELECT = 'id, username, display_name, pen_name';
const PUBLIC_WRITER_PROFILE_SELECT = 'id, username, display_name, pen_name, bio';
const PUBLIC_WRITER_STORY_SELECT = 'id, author_id, title, slug, status, genre, blurb, cover_url, is_readable, updated_at';

export function friendlyFollowError(error) {
  return getFriendlyErrorMessage(error, 'follow');
}

async function getOptionalProfile() {
  const session = await getCurrentSession();
  if (!session) return null;
  return getCurrentProfile();
}

async function requireFollowProfile() {
  const session = await getCurrentSession();

  if (!session) {
    throw new Error('Please sign in to continue.');
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    throw new Error('Please complete your account profile before following stories or writers.');
  }

  return profile;
}

function requireId(value, label) {
  const id = String(value || '').trim();
  if (!id) throw new Error(`${label} was not found.`);
  return id;
}

export function getDisplayName(profile) {
  return profile?.pen_name || profile?.display_name || profile?.username || 'EverDraft Writer';
}

export async function followStory(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireFollowProfile();
  const cleanStoryId = requireId(storyId, 'Story');

  const { data, error } = await supabase
    .from('story_follows')
    .upsert(
      { story_id: cleanStoryId, user_id: profile.id },
      { onConflict: 'story_id,user_id', ignoreDuplicates: true }
    )
    .select(STORY_FOLLOW_SELECT)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function unfollowStory(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireFollowProfile();
  const cleanStoryId = requireId(storyId, 'Story');

  const { error } = await supabase
    .from('story_follows')
    .delete()
    .eq('story_id', cleanStoryId)
    .eq('user_id', profile.id);

  if (error) throw error;
  return true;
}

export async function isFollowingStory(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await getOptionalProfile();
  if (!profile) return false;

  const { data, error } = await supabase
    .from('story_follows')
    .select('id')
    .eq('story_id', requireId(storyId, 'Story'))
    .eq('user_id', profile.id)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function getStoryFollowerCount(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const { count, error } = await supabase
    .from('story_follows')
    .select('id', { count: 'exact', head: true })
    .eq('story_id', requireId(storyId, 'Story'));

  if (error) throw error;
  return count || 0;
}

export async function followWriter(writerProfileId) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireFollowProfile();
  const cleanWriterId = requireId(writerProfileId, 'Writer');

  if (writerProfileId === profile.id || cleanWriterId === profile.id) {
    throw new Error('You cannot follow yourself as a writer.');
  }

  const { data, error } = await supabase
    .from('writer_follows')
    .upsert(
      { writer_id: cleanWriterId, user_id: profile.id },
      { onConflict: 'writer_id,user_id', ignoreDuplicates: true }
    )
    .select(WRITER_FOLLOW_SELECT)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function unfollowWriter(writerProfileId) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireFollowProfile();
  const cleanWriterId = requireId(writerProfileId, 'Writer');

  const { error } = await supabase
    .from('writer_follows')
    .delete()
    .eq('writer_id', cleanWriterId)
    .eq('user_id', profile.id);

  if (error) throw error;
  return true;
}

export async function isFollowingWriter(writerProfileId) {
  const supabase = await getSupabaseBrowserClient();
  const profile = await getOptionalProfile();
  if (!profile) return false;

  const { data, error } = await supabase
    .from('writer_follows')
    .select('id')
    .eq('writer_id', requireId(writerProfileId, 'Writer'))
    .eq('user_id', profile.id)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function getWriterFollowerCount(writerProfileId) {
  const supabase = await getSupabaseBrowserClient();
  const { count, error } = await supabase
    .from('writer_follows')
    .select('id', { count: 'exact', head: true })
    .eq('writer_id', requireId(writerProfileId, 'Writer'));

  if (error) throw error;
  return count || 0;
}

export async function getMyFollowedStories() {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireFollowProfile();

  const { data: follows, error } = await supabase
    .from('story_follows')
    .select(STORY_FOLLOW_SELECT)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!follows?.length) return [];

  const storyIds = follows.map((follow) => follow.story_id).filter(Boolean);
  const { data: stories, error: storyError } = await supabase
    .from('stories')
    .select(FOLLOWED_STORY_SELECT)
    .in('id', storyIds);

  if (storyError) throw storyError;
  if (!stories?.length) return [];

  const authorIds = [...new Set(stories.map((story) => story.author_id).filter(Boolean))];
  const { data: authors, error: authorError } = await supabase
    .from('profiles')
    .select(FOLLOWED_PROFILE_SELECT)
    .in('id', authorIds);

  if (authorError) throw authorError;

  const { data: chapters, error: chapterError } = await supabase
    .from('chapters')
    .select('id, story_id, status')
    .in('story_id', storyIds)
    .eq('status', 'published');

  if (chapterError) throw chapterError;

  const storiesById = new Map(stories.map((story) => [story.id, story]));
  const authorsById = new Map((authors || []).map((author) => [author.id, author]));
  const chapterCounts = (chapters || []).reduce((counts, chapter) => {
    counts.set(chapter.story_id, (counts.get(chapter.story_id) || 0) + 1);
    return counts;
  }, new Map());

  return follows
    .map((follow) => storiesById.get(follow.story_id))
    .filter(Boolean)
    .map((story) => ({
      ...story,
      author: authorsById.get(story.author_id) || null,
      chapter_count: chapterCounts.get(story.id) || 0
    }));
}

export async function getMyFollowedWriters() {
  const supabase = await getSupabaseBrowserClient();
  const profile = await requireFollowProfile();

  const { data: follows, error } = await supabase
    .from('writer_follows')
    .select(WRITER_FOLLOW_SELECT)
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!follows?.length) return [];

  const writerIds = follows.map((follow) => follow.writer_id).filter(Boolean);
  const { data: writers, error: writerError } = await supabase
    .from('profiles')
    .select(FOLLOWED_PROFILE_SELECT)
    .in('id', writerIds);

  if (writerError) throw writerError;

  const writersById = new Map((writers || []).map((writer) => [writer.id, writer]));
  const { data: publicStories, error: storyError } = await supabase
    .from('stories')
    .select('id, author_id, status, is_readable')
    .in('author_id', writerIds)
    .in('status', ['ongoing', 'complete'])
    .eq('is_readable', true);

  if (storyError) throw storyError;

  const publicStoryCounts = (publicStories || []).reduce((counts, story) => {
    counts.set(story.author_id, (counts.get(story.author_id) || 0) + 1);
    return counts;
  }, new Map());

  const followerCounts = new Map(await Promise.all(writerIds.map(async (writerId) => [
    writerId,
    await getWriterFollowerCount(writerId)
  ])));

  return follows
    .map((follow) => writersById.get(follow.writer_id))
    .filter(Boolean)
    .map((writer) => ({
      ...writer,
      follower_count: followerCounts.get(writer.id) || 0,
      public_story_count: publicStoryCounts.get(writer.id) || 0
    }));
}

export async function getPublicWriterProfileByUsername(username) {
  const supabase = await getSupabaseBrowserClient();
  const cleanUsername = String(username || '').trim();
  if (!cleanUsername) throw new Error('Writer was not found.');

  const { data: writer, error: writerError } = await supabase
    .from('profiles')
    .select(PUBLIC_WRITER_PROFILE_SELECT)
    .eq('username', cleanUsername)
    .maybeSingle();

  if (writerError) throw writerError;
  if (!writer) return { writer: null, stories: [] };

  const { data: stories, error: storyError } = await supabase
    .from('stories')
    .select(PUBLIC_WRITER_STORY_SELECT)
    .eq('author_id', writer.id)
    .eq('is_readable', true)
    .in('status', ['ongoing', 'complete'])
    .not('title', 'is', null)
    .not('slug', 'is', null)
    .order('updated_at', { ascending: false });

  if (storyError) throw storyError;

  return {
    writer: {
      ...writer,
      follower_count: await getWriterFollowerCount(writer.id)
    },
    stories: stories || []
  };
}
