import { updateDonation, deleteDonation, getDonation } from '../../../lib/store.js';
import { publicSettings } from '../../../lib/settings.js';

export const prerender = false;

export async function GET({ params, locals }) {
  const env = locals.runtime.env;
  const d = await getDonation(env, params.receiptNo);
  if (!d) return json({ error: 'not found' }, 404);
  return json({ donation: d });
}

export async function PUT({ params, request, locals }) {
  const env = locals.runtime.env;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  const name = String(body.name || '').trim();
  const total = Number(body.totalAmount);
  if (!name) return json({ error: 'देणगीदाराचे नाव आवश्यक आहे (name required)' }, 422);
  if (!total || total <= 0) return json({ error: 'वैध एकूण रक्कम आवश्यक आहे (valid total amount required)' }, 422);

  const updated = await updateDonation(env, params.receiptNo, body);
  if (!updated) return json({ error: 'not found' }, 404);
  return json({ ok: true, donation: updated, settings: await publicSettings(env) });
}

export async function DELETE({ params, locals }) {
  const env = locals.runtime.env;
  const ok = await deleteDonation(env, params.receiptNo);
  if (!ok) return json({ error: 'not found' }, 404);
  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
