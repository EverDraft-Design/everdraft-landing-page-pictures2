const FALLBACK_MESSAGES = {
  auth: 'Something didn’t save properly. Please try again in a moment.',
  signup: 'We couldn’t create your account just yet. Please check your details and try again.',
  login: 'We couldn’t sign you in. Please check your email and password.',
  profile: 'We couldn’t update your profile just yet. Please try again.',
  story: 'We couldn’t save this story just yet. Please try again.',
  chapter: 'We couldn’t save this chapter just yet. Please try again.',
  follow: 'We couldn’t update that follow just yet. Please try again.',
  note: 'Your Note couldn’t be sent just yet. Please try again.',
  spark: 'Your Spark couldn’t be updated just yet. Please try again.',
  engagement: 'This couldn’t be saved just yet. Please try again.'
};

function getRawMessage(error) {
  if (typeof error === 'string') return error.trim();
  return String(error?.message || '').trim();
}

function fallbackFor(context) {
  return FALLBACK_MESSAGES[context] || FALLBACK_MESSAGES.auth;
}

function isPermissionError(message) {
  return message.includes('permission')
    || message.includes('row-level')
    || message.includes('rls')
    || message.includes('policy')
    || message.includes('not allowed');
}

function isDuplicateError(message) {
  return message.includes('duplicate')
    || message.includes('unique')
    || message.includes('already exists')
    || message.includes('already in use');
}

function isMissingRequiredError(message) {
  return message.includes('required')
    || message.includes('missing')
    || message.includes('fill in')
    || message.includes('few words');
}

export function getFriendlyErrorMessage(error, context = 'auth') {
  const rawMessage = getRawMessage(error);
  const message = rawMessage.toLowerCase();

  if (!message) return fallbackFor(context);

  if (message.includes('sign in') || message.includes('signed in')) {
    return 'Please sign in to continue.';
  }

  if (message.includes('complete your account profile')) {
    return 'Please complete your account profile before continuing.';
  }

  if (message.includes('username') && (isDuplicateError(message) || message.includes('profiles_username'))) {
    return 'That username is already taken. Please choose another.';
  }

  if (message.includes('username must') || message.includes('usernames can') || message.includes('locked everdraft identity')) {
    return rawMessage;
  }

  if (message.includes('invalid login') || message.includes('invalid credentials')) {
    return 'We couldn’t sign you in. Please check your email and password.';
  }

  if (message.includes('already') && (message.includes('registered') || message.includes('email'))) {
    return 'An account may already exist for that email. Try signing in instead.';
  }

  if (message.includes('password')) {
    if (message.includes('match')) return 'The passwords do not match.';
    return 'Please choose a stronger password and try again.';
  }

  if (message.includes('invalid email') || (context === 'signup' && message.includes('email'))) {
    return 'Please check your email address and try again.';
  }

  if (message.includes('slug') && isDuplicateError(message)) {
    return 'That story link is already in use. Please choose another slug.';
  }

  if (message.includes('story link') || message.includes('story slug') || message.includes('valid story status')) {
    return rawMessage;
  }

  if (message.includes('chapter') && (isDuplicateError(message) || message.includes('chapters_story_chapter_number_key'))) {
    return 'This story already has a chapter with that number.';
  }

  if (message.includes('not receiving notes')) {
    return 'This writer is not receiving Notes right now.';
  }

  if (message.includes('sparks are for readers')) {
    return 'Sparks are for readers.';
  }

  if (message.includes('notes are for readers')) {
    return 'This is your chapter. Reader Notes will appear on your Pinboard.';
  }

  if (message.includes('cannot follow yourself')) {
    return 'You cannot follow yourself as a writer.';
  }

  if (message.includes('already following')) {
    return 'You are already following this.';
  }

  if (message.includes('spark') && isDuplicateError(message)) {
    return 'Your Spark is already here.';
  }

  if (message.includes('not found') || message.includes('belongs to another')) {
    if (context === 'story') return 'You don’t have access to change this story.';
    if (context === 'chapter') return 'You don’t have access to change this chapter.';
    return 'We couldn’t find that page or item.';
  }

  if (isPermissionError(message)) {
    if (context === 'story') return 'You don’t have access to change this story.';
    if (context === 'chapter') return 'You don’t have access to change this chapter.';
    if (context === 'note') return 'Your Note couldn’t be sent just yet. Please try again.';
    if (context === 'spark') return 'Your Spark couldn’t be updated just yet. Please try again.';
    if (context === 'follow') return 'We couldn’t update that follow just yet. Please try again.';
    return 'You don’t have access to change this.';
  }

  if (isMissingRequiredError(message)) {
    if (message.includes('note')) return 'A Note needs a few words before it can be pinned.';
    return 'Please fill in the required fields before continuing.';
  }

  if (message.includes('readable')) {
    return 'This chapter is not currently readable.';
  }

  if (message.includes('account service') || message.includes('configuration')) {
    return 'EverDraft account services are temporarily unavailable. Please try again in a moment.';
  }

  return fallbackFor(context);
}
