import { addDonation, getDonations } from '../../lib/store.js';
import { publicSettings } from '../../lib/settings.js';

export const prerender = false;

export async function GET({ locals }) {
  const env = locals.runtime.env;
  return json({ donations: await getDonations(env) });
}

export async function POST({ request, locals }) {
  const env = locals.runtime.env;
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  const name = String(body.name || '').trim();
  const total = Number(body.totalAmount ?? body.amount);
  if (!name) return json({ error: 'देणगीदाराचे नाव आवश्यक आहे (name required)' }, 422);
  if (!total || total <= 0) return json({ error: 'वैध एकूण रक्कम आवश्यक आहे (valid total amount required)' }, 422);

  const record = await addDonation(env, body);
  return json({ ok: true, donation: record, settings: await publicSettings(env) });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
