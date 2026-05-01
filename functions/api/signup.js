const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) {
    return jsonResponse({ error: 'Waitlist database is not configured.' }, 500);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const email = cleanText(payload.email, 254).toLowerCase();
  const name = cleanText(payload.name, 120);
  const role = cleanText(payload.role, 24);
  const genres = cleanText(payload.genres, 300);
  const betaAccess = cleanText(payload.betaAccess, 12);
  const notes = cleanText(payload.notes, 1000);

  if (!EMAIL_PATTERN.test(email)) {
    return jsonResponse({ error: 'A valid email address is required.' }, 400);
  }

  if (!name || !role || !betaAccess) {
    return jsonResponse({ error: 'Name, role, and beta access are required.' }, 400);
  }

  try {
    await env.DB.prepare(`
      INSERT INTO waitlist_signups (
        email,
        name,
        role,
        genres,
        beta_access,
        notes,
        user_agent,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(email) DO UPDATE SET
        name = excluded.name,
        role = excluded.role,
        genres = excluded.genres,
        beta_access = excluded.beta_access,
        notes = excluded.notes,
        user_agent = excluded.user_agent,
        updated_at = datetime('now')
    `)
      .bind(
        email,
        name,
        role,
        genres,
        betaAccess,
        notes,
        request.headers.get('User-Agent') || ''
      )
      .run();

    return jsonResponse({ ok: true });
  } catch (error) {
    console.error('Failed to save waitlist signup', error);
    return jsonResponse({ error: 'Unable to save waitlist signup.' }, 500);
  }
}

export function onRequest() {
  return jsonResponse({ error: 'Method not allowed.' }, 405);
}
