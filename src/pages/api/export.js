import { getWorkbookBuffer } from '../../lib/store.js';

export const prerender = false;

export async function GET({ locals }) {
  const env = locals.runtime.env;
  const buffer = await getWorkbookBuffer(env);
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(buffer, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="LBGUM-Donations-${stamp}.xlsx"`,
      'cache-control': 'no-store',
    },
  });
}
