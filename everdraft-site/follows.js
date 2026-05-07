import { getCurrentProfile, getCurrentSession, getSupabaseBrowserClient } from '/auth.js';

const STORY_FOLLOW_SELECT = 'id, story_id, user_id, created_at';
const WRITER_FOLLOW_SELECT = 'id, writer_id, user_id, created_at';
const FOLLOWED_STORY_SELECT = 'id, author_id, title, slug, status, genre, updated_at';
const FOLLOWED_PROFILE_SELECT = 'id, username, display_name, pen_name';

export function friendlyFollowError(error) {
  const rawMessage = error && error.message ? String(error.message).trim() : '';
  const message = rawMessage.toLowerCase();

  if (!message) return 'The follow action could not be saved. Please try again.';
  if (message.includes('sign in')) return 'Please sign in to continue.';
  if (message.includes('complete your account profile') || message.includes('profile')) return rawMessage;
  if (message.includes('duplicate') || message.includes('unique')) return 'You are already following this.';
  if (message.includes('writer_id <> user_id') || message.includes('self')) return 'You cannot follow yourself as a writer.';
  if (message.includes('row-level security') || message.includes('permission')) {
    return `Supabase follow permission error: ${rawMessage}. Apply supabase/migrations/008_fix_follow_rls.sql if follow policies are missing.`;
  }

  return `The follow action could not be saved. Supabase: ${rawMessage}`;
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

  const storiesById = new Map(stories.map((story) => [story.id, story]));
  const authorsById = new Map((authors || []).map((author) => [author.id, author]));

  return follows
    .map((follow) => storiesById.get(follow.story_id))
    .filter(Boolean)
    .map((story) => ({
      ...story,
      author: authorsById.get(story.author_id) || null
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
  return follows
    .map((follow) => writersById.get(follow.writer_id))
    .filter(Boolean);
}
