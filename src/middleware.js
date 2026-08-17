import { verifySession, SESSION_COOKIE } from './lib/auth.js';

// Paths that do not require authentication.
const PUBLIC = ['/login', '/api/login'];

export function onRequest(context, next) {
  const { url, cookies, redirect } = context;
  const pathname = url.pathname;

  // Static-ish assets and public routes pass through.
  const isPublic =
    PUBLIC.includes(pathname) ||
    pathname.startsWith('/_') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/uploads');

  const token = cookies.get(SESSION_COOKIE)?.value;
  const session = verifySession(token);
  context.locals.session = session;

  if (isPublic) {
    // Already logged in? Skip the login screen.
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
