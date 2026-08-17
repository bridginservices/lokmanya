import fs from 'node:fs';
import path from 'node:path';
import { PATHS } from '../../lib/paths.js';

export const prerender = false;

const TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.svg': 'image/svg+xml',
};

export async function GET({ params }) {
  // Prevent path traversal — only a bare filename is allowed.
  const name = path.basename(params.file || '');
  const file = path.join(PATHS.uploadDir, name);
  if (!file.startsWith(PATHS.uploadDir) || !fs.existsSync(file)) {
    return new Response('Not found', { status: 404 });
  }
  const ext = path.extname(name).toLowerCase();
  const body = fs.readFileSync(file);
  return new Response(body, {
    headers: {
      'content-type': TYPES[ext] || 'application/octet-stream',
      'cache-control': 'no-cache',
    },
  });
}
