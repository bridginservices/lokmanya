import { verifySession, getSecret, SESSION_COOKIE } from './lib/auth.js';

// Paths that do not require authentication.
const PUBLIC = ['/login', '/api/login'];

export async function onRequest(context, next) {
  const { url, cookies, redirect, locals } = context;
  const pathname = url.pathname;
  const env = locals.runtime?.env || {};

  const isPublic =
    PUBLIC.includes(pathname) ||
    pathname.startsWith('/_') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/uploads');

  const token = cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(getSecret(env), token);
  locals.session = session;

  if (isPublic) {
    if (pathname === '/login' && session) return redirect('/');
    return next();
  }

  if (!session) {
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      });
    }
    return redirect('/login');
  }

  return next();
}
