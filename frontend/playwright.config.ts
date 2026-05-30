import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  globalSetup: './e2e/global-setup.ts',
  webServer: [
    // Backend — NestJS on port 3001, connected to the E2E test database
    {
      command: 'pnpm start:dev',
      url: 'http://localhost:3001/api/v1/health',
      reuseExistingServer: !process.env.CI,
      cwd: '../backend',
      env: {
        MONGODB_URI:
          'mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym_e2e?authSource=admin',
      },
      timeout: 30000,
    },
    // Frontend — Vite SPA on port 5173
    {
      command: 'pnpm dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: 'http://localhost:3001',
      },
    },
  ],
  projects: [
    // Setup project — runs global-setup (seeding + auth state creation)
    // No storageState here; it IS the setup.

    // Role-specific projects — each gets its pre-baked auth cookie
    {
      name: 'owner',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/owner.json',
      },
    },
    {
      name: 'trainer',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/trainer.json',
      },
    },
    {
      name: 'member',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/member.json',
      },
    },
    // No-auth project for login page / access-control specs
    {
      name: 'no-auth',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
