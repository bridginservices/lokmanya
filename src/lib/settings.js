import fs from 'node:fs';
import crypto from 'node:crypto';
import { PATHS, ensureDataDir } from './paths.js';

// scrypt-based password hashing (no external deps).
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, key] = stored.split(':');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(key, 'hex');
  const b = Buffer.from(derived, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

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

export function getSettings() {
  ensureDataDir();
  let data = {};
  if (fs.existsSync(PATHS.settings)) {
    try {
      data = JSON.parse(fs.readFileSync(PATHS.settings, 'utf-8'));
    } catch {
      data = {};
    }
  }
  const merged = { ...DEFAULTS, ...data };
  // Seed a default admin password on first run.
  if (!merged.adminHash) {
    merged.adminHash = hashPassword('admin123');
    fs.writeFileSync(PATHS.settings, JSON.stringify(merged, null, 2), 'utf-8');
  }
  return merged;
}

export function saveSettings(patch) {
  ensureDataDir();
  const current = getSettings();
  const next = { ...current, ...patch };
  fs.writeFileSync(PATHS.settings, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

// Public settings — safe to expose to the browser (never the password hash).
export function publicSettings() {
  const s = getSettings();
  const { adminHash, ...rest } = s;
  return rest;
}
