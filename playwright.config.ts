import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    env: {
      MONGODB_URI:
        'mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym_test?authSource=admin',
      AUTH_SECRET: 'e2e-test-secret-do-not-use-in-production',
      AUTH_URL: 'http://localhost:3000',
      EMAIL_PROVIDER: 'nodemailer',
      SMTP_HOST: 'localhost',
      SMTP_PORT: '1025',
      SMTP_FROM: 'noreply@test.com',
      UPLOAD_PROVIDER: 'local',
      CRON_SECRET: 'e2e-test-cron-secret',
    },
  },
});
