import { getSettings, verifyPassword } from '../../lib/settings.js';
import { createSession, SESSION_COOKIE, sessionCookieOptions } from '../../lib/auth.js';

export const prerender = false;

export async function POST({ request, cookies }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  const { user, password } = body || {};
  const settings = getSettings();

  const okUser = String(user || '').trim().toLowerCase() === String(settings.adminUser).toLowerCase();
  const okPass = verifyPassword(String(password || ''), settings.adminHash);

  if (!okUser || !okPass) {
    return json({ error: 'invalid credentials' }, 401);
  }

  cookies.set(SESSION_COOKIE, createSession(settings.adminUser), sessionCookieOptions());
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
