import { readWithMeta } from '../../lib/storage.js';

export const prerender = false;

const TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', svg: 'image/svg+xml',
};

export async function GET({ params, locals }) {
  const env = locals.runtime.env;
  // Only a bare filename is allowed (no traversal).
  const name = String(params.file || '').replace(/[^a-zA-Z0-9._-]/g, '');
  const { value, metadata } = await readWithMeta(env, `uploads/${name}`);
  if (!value) return new Response('Not found', { status: 404 });

  const ext = name.split('.').pop().toLowerCase();
  const type = metadata.contentType || TYPES[ext] || 'application/octet-stream';
  return new Response(value, {
    headers: { 'content-type': type, 'cache-control': 'no-cache' },
  });
}
