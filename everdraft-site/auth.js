import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.1';

let clientPromise;
const PROFILE_SELECT = 'id, user_id, username, display_name, pen_name, role, bio, avatar_url, created_at, updated_at';
const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;

function getRedirectPath(fallback = '/account/') {
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') || fallback;
}

export function friendlyAuthError(error) {
  const rawMessage = error && error.message ? String(error.message).trim() : '';
  const message = rawMessage.toLowerCase();

  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('supabase is not configured')) {
    return 'Supabase is not configured. The Worker is not receiving SUPABASE_URL and SUPABASE_ANON_KEY. ENABLE_SUPABASE_DEV_CHECK does not enable auth; it only controls the optional diagnostic endpoint.';
  }
  if (message.includes('supabase configuration could not be loaded')) {
    return 'Supabase configuration could not be loaded. Check the deployed Worker and Cloudflare environment variables.';
  }
  if (message.includes('duplicate') && message.includes('username')) {
    return 'That EverDraft username is already taken. Please choose another.';
  }
  if (message.includes('profiles_username')) {
    return 'That EverDraft username is already taken. Please choose another.';
  }
  if (message.includes('already') || message.includes('registered')) {
    return `Supabase: ${rawMessage}`;
  }
  if (message.includes('password')) {
    return `Supabase: ${rawMessage}`;
  }
  if (message.includes('invalid login') || message.includes('invalid credentials')) {
    return `Supabase: ${rawMessage}`;
  }
  if (message.includes('email')) {
    return `Supabase: ${rawMessage}`;
  }

  return `Supabase: ${rawMessage}`;
}

function requireValidProfileFields({ displayName }) {
  const cleanDisplayName = String(displayName || '').trim();

  if (!cleanDisplayName) {
    throw new Error('Display name is required before an EverDraft profile can be created.');
  }

  return {
    displayName: cleanDisplayName
  };
}

export function normalizeUsername(username) {
  return String(username || '').trim().toLowerCase();
}

export function validateUsername(username) {
  const rawUsername = String(username || '').trim();
  const cleanUsername = rawUsername.toLowerCase();

  if (!cleanUsername) {
    throw new Error('Username is required. Choose a permanent EverDraft handle.');
  }

  if (rawUsername !== cleanUsername) {
    throw new Error('Username must be lowercase.');
  }

  if (!USERNAME_PATTERN.test(cleanUsername)) {
    throw new Error('Username must be 3-30 characters using lowercase letters, numbers, hyphens, or underscores only.');
  }

  return cleanUsername;
}

function requireValidProfileInput({ userId, username, displayName, requireUsername = true }) {
  const cleanUserId = String(userId || '').trim();
  const profileFields = requireValidProfileFields({ displayName });
  const cleanUsername = requireUsername ? validateUsername(username) : normalizeUsername(username);

  if (!cleanUserId) {
    throw new Error('Signup beta error: Supabase Auth did not return a user id, so no profile was created.');
  }

  return {
    userId: cleanUserId,
    username: cleanUsername || null,
    ...profileFields
  };
}

export async function getSupabaseBrowserClient() {
  if (!clientPromise) {
    clientPromise = fetch('/api/supabase-config', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Supabase configuration could not be loaded.');
        }

        return response.json();
      })
      .then((config) => {
        if (!config.configured || !config.url || !config.anonKey) {
          throw new Error('Supabase is not configured for this environment.');
        }

        return createClient(config.url, config.anonKey);
      });
  }

  return clientPromise;
}

export async function getCurrentSession() {
  const supabase = await getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function getCurrentUser() {
  const supabase = await getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function requireSession() {
  const session = await getCurrentSession();

  if (!session) {
    window.location.replace(`/login/?redirect=${encodeURIComponent(window.location.pathname)}`);
    return null;
  }

  return session;
}

export async function signUpWithEmail({ email, password, username, displayName }) {
  const supabase = await getSupabaseBrowserClient();
  const cleanUsername = validateUsername(username);
  const profileFields = requireValidProfileFields({ displayName });

  const { data, error } = await supabase.auth.signUp({
    email: String(email || '').trim(),
    password: String(password || ''),
    options: {
      data: {
        username: cleanUsername,
        display_name: profileFields.displayName
      }
    }
  });

  if (error) throw error;

  if (!data.user?.id) {
    throw new Error('Signup beta error: Supabase Auth did not return a user, so no profile was created.');
  }

  if (!data.session) {
    return {
      ...data,
      profile: null,
      profilePendingEmailConfirmation: true
    };
  }

  const profile = await createProfileForAuthUser({
    supabase,
    userId: data.user.id,
    username: cleanUsername,
    displayName: profileFields.displayName,
    penName: profileFields.displayName
  }).catch((profileError) => {
    throw new Error(
      `Auth user was created, but profile creation failed: ${profileError.message}. Check public.profiles RLS allows insert where user_id = auth.uid().`
    );
  });

  return {
    ...data,
    profile
  };
}

export async function logInWithEmail({ email, password }) {
  const supabase = await getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logOut() {
  const supabase = await getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentProfile() {
  const supabase = await getSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProfileForAuthUser({
  supabase,
  userId,
  username,
  displayName,
  penName,
  bio = '',
  requireUsername = true
}) {
  const profileInput = requireValidProfileInput({ userId, username, displayName, requireUsername });
  const profile = {
    user_id: profileInput.userId,
    username: profileInput.username,
    display_name: profileInput.displayName,
    pen_name: String(penName ?? profileInput.displayName).trim() || profileInput.displayName,
    bio: String(bio || '').trim()
  };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile, { onConflict: 'user_id' })
    .select(PROFILE_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export async function createProfileForCurrentUser({ displayName, penName, bio = '' } = {}) {
  const supabase = await getSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!user?.id) throw new Error('You need to be signed in to create a profile.');

  return createProfileForAuthUser({
    supabase,
    userId: user.id,
    username: user.user_metadata?.username || '',
    displayName: displayName || user.user_metadata?.display_name || user.email,
    penName: penName ?? displayName ?? user.user_metadata?.display_name ?? '',
    bio,
    requireUsername: false
  }).catch((profileError) => {
    throw new Error(
      `Profile creation failed: ${profileError.message}. Check public.profiles RLS allows insert where user_id = auth.uid().`
    );
  });
}

export async function updateCurrentProfile({ username, displayName, penName, bio }) {
  const supabase = await getSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!user?.id) throw new Error('You need to be signed in to update your profile.');

  const profileFields = requireValidProfileFields({ displayName });

  const existingProfile = await getCurrentProfile();
  if (!existingProfile) {
    throw new Error('Profile not found. Please reload and try again.');
  }

  const cleanUsername = normalizeUsername(username);
  const updatePayload = {
    display_name: profileFields.displayName,
    pen_name: String(penName || '').trim(),
    bio: String(bio || '').trim()
  };

  if (!existingProfile.username && cleanUsername) {
    updatePayload.username = validateUsername(cleanUsername);
  }

  if (existingProfile.username && cleanUsername && cleanUsername !== existingProfile.username) {
    throw new Error('Your username is your locked EverDraft identity and cannot be changed.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('user_id', user.id)
    .select(PROFILE_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export function isProfileComplete(profile) {
  return Boolean(
    profile
      && profile.username
      && profile.display_name
      && (profile.pen_name || profile.bio)
  );
}

export function redirectAfterAuth(fallback) {
  window.location.assign(getRedirectPath(fallback));
}
