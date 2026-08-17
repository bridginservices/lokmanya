import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// SSR app — data is stored on disk (xlsx + settings.json), so we need a server.
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: {
    host: true,
    // Honor a port assigned via the PORT env var (e.g. preview harness).
    port: process.env.PORT ? Number(process.env.PORT) : 4321,
  },
  vite: {
    // xlsx ships as CJS; make sure it is optimized/bundled correctly.
    ssr: {
      noExternal: ['xlsx'],
    },
  },
});
