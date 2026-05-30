/**
 * E2E test fixture seed interface.
 *
 * The actual seed logic lives in backend/scripts/seed-e2e.ts and uses
 * backend Mongoose models. This module exposes the seed function by
 * spawning the backend seed script — keeping the frontend free of a
 * direct mongoose dependency.
 *
 * The seed creates:
 *   - owner@test.com / TestPass123!  (role: owner)
 *   - trainer@test.com / TestPass123!  (role: trainer)
 *   - member@test.com / TestPass123!  (role: member)
 *   plus supporting fixture data (plans, sessions, body tests, etc.)
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_DIR = path.join(__dirname, '..', '..', 'backend');

/**
 * Runs the backend E2E seed script synchronously.
 * Throws on non-zero exit (seed failure surfaces immediately).
 */
export function seed(): void {
  execSync('pnpm seed:e2e', { cwd: BACKEND_DIR, stdio: 'inherit' });
}

/**
 * Resets the E2E database and re-seeds it.
 */
export function seedReset(): void {
  execSync('pnpm seed:e2e:reset', { cwd: BACKEND_DIR, stdio: 'inherit' });
}
