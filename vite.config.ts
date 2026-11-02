import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// props.html is served in dev only: it is a review tool, not part of the product.
export default defineConfig({
  plugins: [react()],
  // Relative paths, so the build works from a subpath such as GitHub Pages.
  base: './',
  build: { target: 'es2022' },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
