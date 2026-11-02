import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const PLUM = '#2a1f3d';

// props.html is served in dev only: it is a review tool, not part of the product.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // A new version waits until every window has closed. It never reloads a running kingdom.
      registerType: 'prompt',
      manifest: {
        id: './',
        name: 'Jester',
        short_name: 'Jester',
        description: 'A living little world of autonomous absurdity.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: PLUM,
        theme_color: PLUM,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // woff is left out: every browser that can run a service worker uses the woff2.
        globPatterns: ['**/*.{js,css,html,woff2,png}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  // Relative paths, so the build works from a subpath such as GitHub Pages.
  base: './',
  build: { target: 'es2022' },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
