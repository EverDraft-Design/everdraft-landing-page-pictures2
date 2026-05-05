import { createClient } from '@supabase/supabase-js';

let cachedClient;

export function getSupabaseConfig(env) {
  return {
    url: env.SUPABASE_URL || '',
    anonKey: env.SUPABASE_ANON_KEY || ''
  };
}

export function hasSupabaseConfig(env) {
  const { url, anonKey } = getSupabaseConfig(env);
  return Boolean(url && anonKey);
}

export function getSupabaseClient(env) {
  if (!hasSupabaseConfig(env)) {
    return null;
  }

  if (!cachedClient) {
    const { url, anonKey } = getSupabaseConfig(env);
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
  }

  return cachedClient;
}

