import { getCurrentProfile, getSupabaseBrowserClient } from '/auth.js';

const STORY_SELECT = 'id, author_id, title, slug, blurb, genre, status, cover_url, banner_url, is_readable, publication_mode, external_book_url, published_at, created_at, updated_at';
const VALID_STORY_STATUSES = new Set(['draft', 'ongoing', 'complete', 'hiatus', 'archived']);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugifyTitle(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function canManageStories(profile) {
  return Boolean(profile);
}

export async function requireMemberProfile() {
  const profile = await getCurrentProfile();

  if (!profile) {
    throw new Error('Complete your profile before creating stories.');
  }

  return {
    profile,
    canWrite: canManageStories(profile)
  };
}

export function friendlyStoryError(error) {
  const message = (error && error.message ? error.message : '').toLowerCase();

  if (message.includes('duplicate') || message.includes('stories_slug_key')) {
    return 'That slug is already in use. Try a more specific one.';
  }
  if (message.includes('row-level security') || message.includes('permission')) {
    return 'You do not have permission to change this story.';
  }
  if (message.includes('slug')) {
    return 'Please add a valid story slug.';
  }

  return 'The story could not be saved. Please check the fields and try again.';
}

export async function getMyStories() {
  const supabase = await getSupabaseBrowserClient();
  const { profile, canWrite } = await requireMemberProfile();

  const { data, error } = await supabase
    .from('stories')
    .select(STORY_SELECT)
    .eq('author_id', profile.id)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return {
    profile,
    canWrite,
    stories: data || []
  };
}

export async function getStoryByIdForAuthor(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const { profile, canWrite } = await requireMemberProfile();

  const { data, error } = await supabase
    .from('stories')
    .select(STORY_SELECT)
    .eq('id', storyId)
    .eq('author_id', profile.id)
    .maybeSingle();

  if (error) throw error;

  return {
    profile,
    canWrite,
    story: data
  };
}

function cleanStoryPayload(input) {
  const title = String(input.title || '').trim();
  const slug = slugifyTitle(input.slug || title);
  const status = String(input.status || 'draft').trim() || 'draft';

  if (!title) {
    throw new Error('A story title is required.');
  }

  if (!slug) {
    throw new Error('A story slug is required.');
  }

  if (!SLUG_PATTERN.test(slug)) {
    throw new Error('A story slug can only use lowercase letters, numbers, and single hyphens.');
  }

  if (!VALID_STORY_STATUSES.has(status)) {
    throw new Error('Please choose a valid story status.');
  }

  return {
    title,
    slug,
    blurb: String(input.blurb || '').trim(),
    genre: String(input.genre || '').trim(),
    status,
    cover_url: String(input.coverUrl || '').trim(),
    banner_url: String(input.bannerUrl || '').trim()
  };
}

export async function createStory(input) {
  const supabase = await getSupabaseBrowserClient();
  const { profile, canWrite } = await requireMemberProfile();

  if (!canWrite) {
    throw new Error('Please sign in and complete your profile before creating stories.');
  }

  const story = cleanStoryPayload(input);

  const { data, error } = await supabase
    .from('stories')
    .insert({
      ...story,
      author_id: profile.id,
      publication_mode: 'none',
      is_readable: true
    })
    .select(STORY_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateStory(storyId, input) {
  const supabase = await getSupabaseBrowserClient();
  const { profile, canWrite } = await requireMemberProfile();

  if (!canWrite) {
    throw new Error('You can only edit stories you created.');
  }

  const story = cleanStoryPayload(input);

  const { data, error } = await supabase
    .from('stories')
    .update(story)
    .eq('id', storyId)
    .eq('author_id', profile.id)
    .select(STORY_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function archiveStory(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const { profile, canWrite } = await requireMemberProfile();

  if (!canWrite) {
    throw new Error('You can only edit stories you created.');
  }

  const { data, error } = await supabase
    .from('stories')
    .update({ status: 'archived' })
    .eq('id', storyId)
    .eq('author_id', profile.id)
    .select(STORY_SELECT)
    .single();

  if (error) throw error;
  return data;
}
