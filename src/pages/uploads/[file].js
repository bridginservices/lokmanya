export const prerender = false;

const TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', svg: 'image/svg+xml',
};

export async function GET({ params, locals }) {
  const env = locals.runtime.env;
  // Only a bare filename is allowed (no traversal).
  const name = String(params.file || '').replace(/[^a-zA-Z0-9._-]/g, '');
  const obj = await env.DATA.get(`uploads/${name}`);
  if (!obj) return new Response('Not found', { status: 404 });

  const ext = name.split('.').pop().toLowerCase();
  const type = obj.httpMetadata?.contentType || TYPES[ext] || 'application/octet-stream';
  return new Response(obj.body, {
    headers: { 'content-type': type, 'cache-control': 'no-cache' },
  });
}
