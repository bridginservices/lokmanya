import { saveSettings, getSettings, hashPassword, verifyPassword } from '../../lib/settings.js';

export const prerender = false;

const ALLOWED_IMG = { 'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp', 'image/svg+xml': '.svg' };

export async function POST({ request, locals }) {
  const env = locals.runtime.env;
  const form = await request.formData();

  const patch = {
    mandalName: str(form.get('mandalName')),
    address: str(form.get('address')),
    contact: str(form.get('contact')),
    thankYou: str(form.get('thankYou')),
    signatory: str(form.get('signatory')),
  };
  // Drop empty strings so we don't wipe existing values with blanks.
  for (const k of Object.keys(patch)) {
    if (patch[k] === '') delete patch[k];
  }

  // Optional logo upload → stored in R2 under uploads/
  const logo = form.get('logo');
  if (logo && typeof logo === 'object' && logo.size > 0) {
    const ext = ALLOWED_IMG[logo.type];
    if (!ext) return json({ error: 'फक्त PNG/JPG/WEBP/SVG लोगो चालतील' }, 422);
    if (logo.size > 2 * 1024 * 1024) return json({ error: 'लोगो 2MB पेक्षा लहान असावा' }, 422);
    const buf = new Uint8Array(await logo.arrayBuffer());
    const fname = `logo${ext}`;
    await env.DATA.put(`uploads/${fname}`, buf, { httpMetadata: { contentType: logo.type } });
    patch.logo = `/uploads/${fname}?v=${Date.now()}`;
  }

  // Optional password change
  const currentPw = str(form.get('currentPassword'));
  const newPw = str(form.get('newPassword'));
  if (newPw) {
    const settings = await getSettings(env);
    if (!(await verifyPassword(currentPw, settings.adminHash))) {
      return json({ error: 'सध्याचा पासवर्ड चुकीचा आहे (current password wrong)' }, 422);
    }
    if (newPw.length < 6) return json({ error: 'नवीन पासवर्ड किमान 6 अक्षरे असावा' }, 422);
    patch.adminHash = await hashPassword(newPw);
  }

  const next = await saveSettings(env, patch);
  const { adminHash, ...safe } = next;
  return json({ ok: true, settings: safe });
}

function str(v) {
  return v == null ? '' : String(v).trim();
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}
