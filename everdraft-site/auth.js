import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.1';

let clientPromise;

function getRedirectPath(fallback = '/account/') {
  const params = new URLSearchParams(window.location.search);
  return params.get('redirect') || fallback;
}

export function friendlyAuthError(error) {
  const message = (error && error.message ? error.message : '').toLowerCase();

  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('already') || message.includes('registered')) {
    return 'That email may already be registered. Try signing in instead.';
  }
  if (message.includes('password')) {
    return 'Please check your password. It may be too weak or incorrect.';
  }
  if (message.includes('invalid login') || message.includes('invalid credentials')) {
    return 'The email or password was not accepted.';
  }
  if (message.includes('email')) {
    return 'Please check your email address and try again.';
  }

  return 'Something went wrong. Please try again.';
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        intended_role: role
      }
    }
  });

  if (error) throw error;

  if (data.session && data.user) {
    await createProfileForCurrentUser({
      displayName,
      role,
      penName: displayName
    });
  }

  return data;
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
    .select('id, user_id, display_name, pen_name, role, bio, avatar_url, created_at, updated_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProfileForCurrentUser({ displayName, role = 'reader', penName = '', bio = '' } = {}) {
  const supabase = await getSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('You need to be signed in to create a profile.');

  const profile = {
    user_id: user.id,
    display_name: displayName || user.email || 'EverDraft reader',
    pen_name: penName || displayName || '',
    role,
    bio
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(profile)
    .select('id, user_id, display_name, pen_name, role, bio, avatar_url, created_at, updated_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateCurrentProfile({ displayName, penName, role, bio }) {
  const supabase = await getSupabaseBrowserClient();
  const user = await getCurrentUser();

  if (!user) throw new Error('You need to be signed in to update your profile.');

  const { data, error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      pen_name: penName,
      role,
      bio
    })
    .eq('user_id', user.id)
    .select('id, user_id, display_name, pen_name, role, bio, avatar_url, created_at, updated_at')
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
