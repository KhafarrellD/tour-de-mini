import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/visual',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'node scripts/serve.js',
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}/gallery.html`,
    reuseExistingServer: true,
  },
});
