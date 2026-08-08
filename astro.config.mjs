import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Site URL: set SITE env var in CI to override (e.g. custom domain).
// GitHub Pages default: https://USERNAME.github.io/calcglobal
const site = process.env.SITE || 'https://calcglobal.com';

// https://astro.build/config
export default defineConfig({
  site,
  base: '/calcglobal',
  integrations: [
    tailwind(),
    react(),
    sitemap(),
  ],
  output: 'static',
});
