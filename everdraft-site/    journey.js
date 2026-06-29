import { getSupabaseBrowserClient } from '/auth.js';
import { getFriendlyErrorMessage } from '/errors.js';
import { getChaptersForAuthorStory } from '/chapters.js';

const MILESTONE_SELECT = 'id, story_id, author_id, title, reflection, visibility, word_count, snapshot, created_at, updated_at';
const VALID_VISIBILITY = new Set(['private', 'public']);

export function friendlyJourneyError(error) {
  return getFriendlyErrorMessage(error, 'Story Journey');
}

function requireId(value, label) {
  const id = String(value || '').trim();
  if (!id) throw new Error(`${label} was not found.`);
  return id;
}

export function countSnapshotWords(chapters = []) {
  return chapters.reduce((total, chapter) => {
    const text = String(chapter.content || '').replace(/<[^>]*>/g, ' ');
    const words = text.trim().match(/\S+/g);
    return total + (words ? words.length : 0);
  }, 0);
}

function cleanMilestoneInput(input) {
  const title = String(input.title || '').trim();
  const reflection = String(input.reflection || '').trim();
  const visibility = String(input.visibility || 'private').trim() || 'private';

  if (!title) throw new Error('Milestone title is required.');
  if (!VALID_VISIBILITY.has(visibility)) throw new Error('Choose Private or Public visibility.');

  return { title, reflection, visibility };
}

function buildSnapshot(story, chapters) {
  const orderedChapters = [...(chapters || [])]
    .sort((a, b) => (Number(a.chapter_number) || 0) - (Number(b.chapter_number) || 0))
    .map((chapter) => ({
      id: chapter.id,
      title: chapter.title || '',
      chapter_number: chapter.chapter_number,
      content: chapter.content || '',
      status: chapter.status || 'draft',
      published_at: chapter.published_at || null,
      created_at: chapter.created_at || null,
      updated_at: chapter.updated_at || null
    }));

  return {
    story: {
      id: story.id,
      title: story.title || '',
      slug: story.slug || '',
      blurb: story.blurb || '',
      genre: story.genre || '',
      status: story.status || 'draft',
      cover_url: story.cover_url || '',
      created_at: story.created_at || null,
      updated_at: story.updated_at || null
    },
    chapters: orderedChapters
  };
}

export async function getMilestonesForAuthorStory(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const { profile, story, chapters } = await getChaptersForAuthorStory(storyId);

  if (!story) return { profile, story: null, chapters: [], milestones: [] };

  const { data, error } = await supabase
    .from('story_journey_milestones')
    .select(MILESTONE_SELECT)
    .eq('story_id', story.id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return { profile, story, chapters, milestones: data || [] };
}

export async function createJourneyMilestone(storyId, input) {
  const supabase = await getSupabaseBrowserClient();
  const { profile, story, chapters } = await getChaptersForAuthorStory(storyId);

  if (!story) throw new Error('This story was not found, or it belongs to another profile.');

  const milestone = cleanMilestoneInput(input);
  const snapshot = buildSnapshot(story, chapters);
  const wordCount = countSnapshotWords(snapshot.chapters);

  const { data, error } = await supabase
    .from('story_journey_milestones')
    .insert({
      story_id: story.id,
      author_id: profile.id,
      title: milestone.title,
      reflection: milestone.reflection,
      visibility: milestone.visibility,
      word_count: wordCount,
      snapshot
    })
    .select(MILESTONE_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function updateJourneyMilestoneVisibility(milestoneId, visibility) {
  const supabase = await getSupabaseBrowserClient();
  const cleanVisibility = String(visibility || '').trim();
  if (!VALID_VISIBILITY.has(cleanVisibility)) throw new Error('Choose Private or Public visibility.');

  const { data, error } = await supabase
    .from('story_journey_milestones')
    .update({ visibility: cleanVisibility })
    .eq('id', requireId(milestoneId, 'Milestone'))
    .select(MILESTONE_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function getPublicMilestonesForStory(storyId) {
  const supabase = await getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('story_journey_milestones')
    .select(MILESTONE_SELECT)
    .eq('story_id', requireId(storyId, 'Story'))
    .eq('visibility', 'public')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getJourneyStatsForAuthor(authorId) {
  const supabase = await getSupabaseBrowserClient();
  const cleanAuthorId = requireId(authorId, 'Author');

  const [storiesResult, milestonesResult, chaptersResult, storySparksResult, chapterSparksResult, notesResult] = await Promise.all([
    supabase.from('stories').select('id', { count: 'exact', head: true }).eq('author_id', cleanAuthorId),
    supabase.from('story_journey_milestones').select('id, word_count').eq('author_id', cleanAuthorId),
    supabase.from('chapters').select('content, stories!inner(author_id)').eq('status', 'published').eq('stories.author_id', cleanAuthorId),
    supabase.from('story_sparks').select('id, stories!inner(author_id)', { count: 'exact', head: true }).eq('stories.author_id', cleanAuthorId),
    supabase.from('chapter_sparks').select('id, stories!inner(author_id)', { count: 'exact', head: true }).eq('stories.author_id', cleanAuthorId),
    supabase.from('notes').select('id', { count: 'exact', head: true }).eq('writer_profile_id', cleanAuthorId)
  ]);

  const blockingError = storiesResult.error || milestonesResult.error || chaptersResult.error || storySparksResult.error || chapterSparksResult.error;
  if (blockingError) throw blockingError;

  const milestones = milestonesResult.data || [];

  return {
    storiesCreated: storiesResult.count || 0,
    journeyMilestonesCreated: milestones.length,
    totalWordsCurrentlyPublished: countSnapshotWords(chaptersResult.data || []),
    totalWordsWrittenAcrossSnapshots: milestones.reduce((total, milestone) => total + (Number(milestone.word_count) || 0), 0),
    totalSparksReceived: (storySparksResult.count || 0) + (chapterSparksResult.count || 0),
    totalNotesReceived: notesResult.error ? 0 : (notesResult.count || 0)
  };
}