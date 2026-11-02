import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5199',
    viewport: { width: 480, height: 720 },
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: [
    {
      command: 'npx vite --port 5199 --strictPort',
      url: 'http://localhost:5199',
      reuseExistingServer: true,
    },
    {
      // The PWA only exists in a production build, served as Pages serves it.
      command: 'npm run build && node tests/e2e/serve-dist.mjs',
      url: 'http://localhost:5198/jester/',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
