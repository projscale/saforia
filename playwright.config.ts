import { defineConfig, devices } from '@playwright/test'

const base = process.env.PLAYWRIGHT_BASE_URL || 'http://host.docker.internal:5173'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: base,
    trace: 'on-first-retry',
  },
  // When running inside container against host app, skip starting a server
  webServer: base.includes('host.docker.internal') ? undefined : {
    command: 'vite preview --host 0.0.0.0 --port 5173 --strictPort',
    port: 5173,
    reuseExistingServer: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
