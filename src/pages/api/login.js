import { getSettings, verifyPassword } from '../../lib/settings.js';
import { createSession, getSecret, SESSION_COOKIE, sessionCookieOptions } from '../../lib/auth.js';

export const prerender = false;

export async function POST({ request, cookies, locals }) {
  const env = locals.runtime.env;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  const { user, password } = body || {};
  const settings = await getSettings(env);

  const okUser = String(user || '').trim().toLowerCase() === String(settings.adminUser).toLowerCase();
  const okPass = await verifyPassword(String(password || ''), settings.adminHash);

  if (!okUser || !okPass) {
    return json({ error: 'invalid credentials' }, 401);
  }

  const token = await createSession(getSecret(env), settings.adminUser);
  const secure = new URL(request.url).protocol === 'https:';
  cookies.set(SESSION_COOKIE, token, sessionCookieOptions(secure));
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
