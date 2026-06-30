export async function onRequestGet({ env }) {
  const url = env.SUPABASE_URL || '';
  const anonKey = env.SUPABASE_ANON_KEY || '';

  return new Response(
    JSON.stringify({
      configured: Boolean(url && anonKey),
      url,
      anonKey
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Cache-Control': 'no-store'
      }
    }
  );
}