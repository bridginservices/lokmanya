import fs from 'node:fs';
import path from 'node:path';
import { saveSettings, getSettings, hashPassword, verifyPassword } from '../../lib/settings.js';
import { PATHS, ensureDataDir } from '../../lib/paths.js';

export const prerender = false;

const ALLOWED_IMG = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg' };

export async function POST({ request }) {
  ensureDataDir();
  const form = await request.formData();

  const patch = {
    mandalName: str(form.get('mandalName')),
    mandalNameEn: str(form.get('mandalNameEn')),
    address: str(form.get('address')),
    contact: str(form.get('contact')),
    thankYou: str(form.get('thankYou')),
    signatory: str(form.get('signatory')),
    receiptPrefix: str(form.get('receiptPrefix')) || 'LBGUM',
  };
  // Drop empty strings so we don't wipe existing values with blanks.
  for (const k of Object.keys(patch)) {
    if (patch[k] === '') delete patch[k];
  }

  // Optional logo upload
  const logo = form.get('logo');
  if (logo && typeof logo === 'object' && logo.size > 0) {
    const ext = ALLOWED_IMG[logo.type];
    if (!ext) return json({ error: 'फक्त PNG/JPG/WEBP/SVG लोगो चालतील' }, 422);
    if (logo.size > 2 * 1024 * 1024) return json({ error: 'लोगो 2MB पेक्षा लहान असावा' }, 422);
    const buf = Buffer.from(await logo.arrayBuffer());
    const fname = `logo${ext}`;
    fs.writeFileSync(path.join(PATHS.uploadDir, fname), buf);
    patch.logo = `/uploads/${fname}?v=${Date.now()}`;
  }

  // Optional password change
  const currentPw = str(form.get('currentPassword'));
  const newPw = str(form.get('newPassword'));
  if (newPw) {
    const settings = getSettings();
    if (!verifyPassword(currentPw, settings.adminHash)) {
      return json({ error: 'सध्याचा पासवर्ड चुकीचा आहे (current password wrong)' }, 422);
    }
    if (newPw.length < 6) return json({ error: 'नवीन पासवर्ड किमान 6 अक्षरे असावा' }, 422);
    patch.adminHash = hashPassword(newPw);
  }

  const next = saveSettings(patch);
  const { adminHash, ...safe } = next;
  return json({ ok: true, settings: safe });
}

function str(v) {
  return v == null ? '' : String(v).trim();
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
