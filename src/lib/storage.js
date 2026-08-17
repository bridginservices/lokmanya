// Thin storage layer over a Cloudflare KV namespace (binding: env.DATA).
// Keeps the KV API details in one place so the rest of the app stays simple.

export async function readText(env, key) {
  return await env.DATA.get(key, 'text'); // string | null
}

export async function readBytes(env, key) {
  return await env.DATA.get(key, 'arrayBuffer'); // ArrayBuffer | null
}

export async function readWithMeta(env, key) {
  const r = await env.DATA.getWithMetadata(key, 'arrayBuffer');
  return { value: r.value, metadata: r.metadata || {} }; // value: ArrayBuffer | null
}

export async function writeValue(env, key, value, metadata) {
  await env.DATA.put(key, value, metadata ? { metadata } : undefined);
}

export async function removeValue(env, key) {
  await env.DATA.delete(key);
}
