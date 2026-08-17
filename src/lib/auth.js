// WebCrypto-based auth — runs on both Node (dev) and Cloudflare Workers (prod).
export const SESSION_COOKIE = 'lbgum_session';
const MAX_AGE = 60 * 60 * 12; // 12 hours

const enc = new TextEncoder();
const dec = new TextDecoder();

// --- base64url helpers ---------------------------------------------------
function bytesToB64url(bytes) {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function hexToBytes(hex) {
  const a = new Uint8Array(hex.length / 2);
  for (let i = 0; i < a.length; i++) a[i] = parseInt(hex.substr(i * 2, 2), 16);
  return a;
}
function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function randomHex(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return bytesToHex(b);
}
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// --- password hashing (PBKDF2-SHA256) ------------------------------------
async function pbkdf2(password, saltHex, iterations = 100000) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return bytesToHex(new Uint8Array(bits));
}

export async function hashPassword(password, saltHex = randomHex(16)) {
  const h = await pbkdf2(password, saltHex);
  return `${saltHex}:${h}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, key] = stored.split(':');
  const h = await pbkdf2(password, salt);
  return timingSafeEqual(h, key);
}

// --- signed sessions (HMAC-SHA256) ---------------------------------------
async function hmacSign(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return bytesToB64url(new Uint8Array(sig));
}

export async function createSession(secret, user) {
  const payload = JSON.stringify({ u: user, exp: Date.now() + MAX_AGE * 1000 });
  const b64 = bytesToB64url(enc.encode(payload));
  const sig = await hmacSign(secret, b64);
  return `${b64}.${sig}`;
}

export async function verifySession(secret, token) {
  if (!token || !token.includes('.')) return null;
  const [b64, sig] = token.split('.');
  const expected = await hmacSign(secret, b64);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const data = JSON.parse(dec.decode(b64urlToBytes(b64)));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(secure = true) {
  return { httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE, secure };
}

// Session-signing secret from the environment (Wrangler secret / .dev.vars).
export function getSecret(env) {
  return (env && env.SESSION_SECRET) || 'insecure-dev-secret';
}
