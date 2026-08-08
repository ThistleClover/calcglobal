import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Site URL updated to the new official custom domain
const site = process.env.SITE || 'https://calcglobal.org';

// https://astro.build/config
export default defineConfig({
  site,
  base: '/',
  integrations: [
    tailwind(),
    react(),
    sitemap(),
  ],
  output: 'static',
});
