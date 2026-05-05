import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.1';

let clientPromise;
const PROFILE_SELECT = 'id, user_id, display_name, pen_name, role, bio, avatar_url, created_at, updated_at';
const VALID_PROFILE_ROLES = new Set(['reader', 'writer', 'both']);

function getRedirectPath(fallback = '/account/') {
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') || fallback;
}

export function friendlyAuthError(error) {
  const rawMessage = error && error.message ? String(error.message).trim() : '';
  const message = rawMessage.toLowerCase();

  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('supabase is not configured')) {
    return 'Supabase is not configured. Cloudflare must provide SUPABASE_URL and SUPABASE_ANON_KEY.';
  }
  if (message.includes('supabase configuration could not be loaded')) {
    return 'Supabase configuration could not be loaded. Check the deployed Worker and Cloudflare environment variables.';
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

function requireValidProfileFields({ displayName, role }) {
  const cleanDisplayName = String(displayName || '').trim();
  const cleanRole = String(role || '').trim();

  if (!cleanDisplayName) {
    throw new Error('Display name is required before an EverDraft profile can be created.');
  }

  if (!VALID_PROFILE_ROLES.has(cleanRole)) {
    throw new Error('Please choose Reader, Writer, or Both before creating an EverDraft profile.');
  }

  return {
    displayName: cleanDisplayName,
    role: cleanRole
  };
}

function requireValidProfileInput({ userId, displayName, role }) {
  const cleanUserId = String(userId || '').trim();
  const profileFields = requireValidProfileFields({ displayName, role });

  if (!cleanUserId) {
    throw new Error('Signup beta error: Supabase Auth did not return a user id, so no profile was created.');
  }

  return {
    userId: cleanUserId,
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

export async function signUpWithEmail({ email, password, displayName, role }) {
  const supabase = await getSupabaseBrowserClient();
  const profileFields = requireValidProfileFields({
    displayName,
    role
  });

  const { data, error } = await supabase.auth.signUp({
    email: String(email || '').trim(),
    password: String(password || ''),
    options: {
      data: {
        display_name: profileFields.displayName,
        intended_role: profileFields.role
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
    displayName: profileFields.displayName,
    role: profileFields.role,
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
  displayName,
  role = 'reader',
  penName,
  bio = ''
}) {
  const profileInput = requireValidProfileInput({ userId, displayName, role });
  const profile = {
    user_id: profileInput.userId,
    display_name: profileInput.displayName,
    pen_name: String(penName ?? profileInput.displayName).trim() || profileInput.displayName,
    role: profileInput.role,
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

export async function createProfileForCurrentUser({ displayName, role = 'reader', penName, bio = '' } = {}) {
  const supabase = await getSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!user?.id) throw new Error('You need to be signed in to create a profile.');

  return createProfileForAuthUser({
    supabase,
    userId: user.id,
    displayName: displayName || user.user_metadata?.display_name || user.email,
    role: role || user.user_metadata?.intended_role || 'reader',
    penName: penName ?? displayName ?? user.user_metadata?.display_name ?? '',
    bio
  }).catch((profileError) => {
    throw new Error(
      `Profile creation failed: ${profileError.message}. Check public.profiles RLS allows insert where user_id = auth.uid().`
    );
  });
}

export async function updateCurrentProfile({ displayName, penName, role, bio }) {
  const supabase = await getSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!user?.id) throw new Error('You need to be signed in to update your profile.');

  const profileInput = requireValidProfileInput({
    userId: user.id,
    displayName,
    role
  });

  const { data, error } = await supabase
    .from('profiles')
    .update({
      display_name: profileInput.displayName,
      pen_name: String(penName || '').trim(),
      role: profileInput.role,
      bio: String(bio || '').trim()
    })
    .eq('user_id', user.id)
    .select(PROFILE_SELECT)
    .single();

  if (error) throw error;
  return data;
}

export function isProfileComplete(profile) {
  return Boolean(
    profile
      && profile.display_name
      && profile.role
      && (profile.pen_name || profile.bio)
  );
}

export function redirectAfterAuth(fallback) {
  window.location.assign(getRedirectPath(fallback));
}
