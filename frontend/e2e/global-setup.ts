/**
 * Playwright global setup — runs once before all specs.
 *
 * 1. Resets and re-seeds the E2E test database (via backend seed script).
 * 2. Logs in as each role via the real SPA and saves the httpOnly refresh
 *    cookie as a storage state file. On page load, initAuth() calls
 *    POST /api/v1/auth/refresh using that cookie, restoring the session.
 */

import { chromium, type FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5173';
const BACKEND_DIR = path.join(__dirname, '..', '..', 'backend');
const AUTH_DIR = path.join(__dirname, '.auth');

async function loginAs(email: string, password: string, outFile: string): Promise<void> {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE_URL}/login`);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  // Wait until the SPA navigates away from /login (auth redirect)
  await page.waitForURL(/\/(owner|trainer|member)(\/|$)/, { timeout: 15000 });

  // storageState captures cookies including the httpOnly refresh_token cookie.
  // On next page load, initAuth() → POST /auth/refresh restores the session.
  await context.storageState({ path: outFile });
  await browser.close();
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async function globalSetup(_config: FullConfig): Promise<void> {
  // Ensure auth directory exists
  fs.mkdirSync(AUTH_DIR, { recursive: true });

  // Reset and re-seed the E2E test database.
  // In CI, the backend webServer env sets MONGODB_URI to power_gym_e2e.
  // In local dev (reuseExistingServer), the running backend uses the dev DB
  // (power_gym). We seed into whichever DB the backend is connected to so
  // that logins succeed. CI always uses the dedicated E2E database.
  const seedMongoUri =
    process.env.CI
      ? 'mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym_e2e?authSource=admin'
      : 'mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym?authSource=admin';
  execSync('pnpm seed:e2e:reset', {
    cwd: BACKEND_DIR,
    stdio: 'inherit',
    env: { ...process.env, MONGODB_URI: seedMongoUri },
  });

  // Save auth storage state for each role
  await loginAs('owner@test.com', 'TestPass123!', path.join(AUTH_DIR, 'owner.json'));
  await loginAs('trainer@test.com', 'TestPass123!', path.join(AUTH_DIR, 'trainer.json'));
  await loginAs('member@test.com', 'TestPass123!', path.join(AUTH_DIR, 'member.json'));
}
