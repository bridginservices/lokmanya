import { hashPassword } from './auth.js';
import { readText, writeValue } from './storage.js';

// Re-export so callers can keep importing hashing from settings if they wish.
export { hashPassword, verifyPassword } from './auth.js';

const SETTINGS_KEY = 'settings.json';

const DEFAULTS = {
  mandalName: 'लोकमान्य बाल गणेश उत्सव मंडळ',
  mandalNameEn: 'Lokmanya Bal Ganesh Utsav Mandal',
  address: 'मुख्य रस्ता, तुमचे शहर, महाराष्ट्र',
  contact: '+91 00000 00000',
  thankYou: 'आपल्या उदार देणगीबद्दल मंडळ आपले मनःपूर्वक आभार मानते. गणपती बाप्पा मोरया!',
  signatory: 'अध्यक्ष / कोषाध्यक्ष',
  logo: '', // relative URL under /uploads
  receiptPrefix: 'LBGUM',
  adminUser: 'admin',
  // default password is "admin123" — user is prompted to change it
  adminHash: '',
};

export async function getSettings(env) {
  let data = {};
  const txt = await readText(env, SETTINGS_KEY);
  if (txt) {
    try {
      data = JSON.parse(txt);
    } catch {
      data = {};
    }
  }
  const merged = { ...DEFAULTS, ...data };
  // Seed a default admin password on first run.
  if (!merged.adminHash) {
    merged.adminHash = await hashPassword('admin123');
    await writeValue(env, SETTINGS_KEY, JSON.stringify(merged, null, 2));
  }
  return merged;
}

export async function saveSettings(env, patch) {
  const current = await getSettings(env);
  const next = { ...current, ...patch };
  await writeValue(env, SETTINGS_KEY, JSON.stringify(next, null, 2));
  return next;
}

// Public settings — safe to expose to the browser (never the password hash).
export async function publicSettings(env) {
  const s = await getSettings(env);
  const { adminHash, ...rest } = s;
  return rest;
}
