import fs from 'node:fs';
import crypto from 'node:crypto';
import { PATHS, ensureDataDir } from './paths.js';

export const SESSION_COOKIE = 'lbgum_session';
const MAX_AGE = 60 * 60 * 12; // 12 hours

function getSecret() {
  ensureDataDir();
  if (!fs.existsSync(PATHS.secret)) {
    fs.writeFileSync(PATHS.secret, crypto.randomBytes(32).toString('hex'), 'utf-8');
  }
  return fs.readFileSync(PATHS.secret, 'utf-8').trim();
}

// Token = base64(payload).hmac  — stateless signed session.
export function createSession(user) {
  const payload = JSON.stringify({ u: user, exp: Date.now() + MAX_AGE * 1000 });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifySession(token) {
  if (!token || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', getSecret()).update(b64).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(b64, 'base64url').toString());
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  };
}
