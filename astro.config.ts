import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://zlatanov.xyz',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
  markdown: {
    // One dark theme, black-backed to sit on the site's surfaces.
    shikiConfig: { theme: 'vitesse-black', wrap: true },
  },
  vite: { plugins: [tailwindcss()] },
});
