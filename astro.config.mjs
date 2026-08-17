import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

// Serverless app on Cloudflare Workers.
// Data (donations.xlsx, settings.json, logo) is stored in Cloudflare R2,
// accessed via the `DATA` binding on `Astro.locals.runtime.env`.
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    // Expose R2/vars bindings to `astro dev` via a local (Miniflare) emulation.
    platformProxy: { enabled: true },
    // We don't use Astro's <Image>; skip the sharp-based service on the worker.
    imageService: 'passthrough',
  }),
  vite: {
    // xlsx (SheetJS) must be bundled into the worker.
    ssr: {
      noExternal: ['xlsx'],
    },
  },
});
