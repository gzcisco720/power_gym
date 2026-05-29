import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync, statSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';
import { chromium, request } from '@playwright/test';

const PASSWORD = 'TestPass123!';
const MONGODB_URI = process.env.E2E_MONGODB_URI ?? 'mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym?authSource=admin';

/** Run a mongosh script file with execFileSync — no shell, no injection risk. */
function runMongosh(scriptFile: string): string {
  return execFileSync('mongosh', ['--quiet', MONGODB_URI, scriptFile], { encoding: 'utf8' });
}

function checkUsersSeeded(): boolean {
  const scriptFile = join(tmpdir(), 'power-gym-check.js');
  writeFileSync(scriptFile, `
    const db = db.getSiblingDB('power_gym_test');
    const owner = db.users.findOne({ email: 'owner@test.com' });
    const trainer = db.users.findOne({ email: 'trainer@test.com' });
    const member = db.users.findOne({ email: 'member@test.com' });
    print(owner && trainer && member ? 'SEEDED' : 'NOT_SEEDED');
  `);
  try {
    const output = runMongosh(scriptFile);
    return output.includes('SEEDED');
  } finally {
    unlinkSync(scriptFile);
  }
}

function cleanupTestData(): void {
  const scriptFile = join(tmpdir(), 'power-gym-cleanup.js');
  writeFileSync(scriptFile, `
    const db = db.getSiblingDB('power_gym_test');
    // Find the test member
    const member = db.users.findOne({ email: 'member@test.com' });
    if (member) {
      // Clean up E2E-created test data for the test member
      db.getCollection('bodytests').deleteMany({ memberId: member._id });
      db.getCollection('memberinjuries').deleteMany({ memberId: member._id });
      db.getCollection('workoutsessions').deleteMany({ memberId: member._id });
      db.getCollection('memberplans').deleteMany({ memberId: member._id });
      db.getCollection('membernutritionplans').deleteMany({ memberId: member._id });
      print('Cleaned up test data for member');
    }
    // Find the test trainer and clean up their plan templates
    const trainer = db.users.findOne({ email: 'trainer@test.com' });
    if (trainer) {
      db.getCollection('plantemplates').deleteMany({ createdBy: trainer._id });
      db.getCollection('nutritiontemplates').deleteMany({ createdBy: trainer._id });
      db.getCollection('foods').deleteMany({ createdBy: trainer._id });
      print('Cleaned up test data for trainer');
    }
  `);
  try {
    runMongosh(scriptFile);
  } finally {
    unlinkSync(scriptFile);
  }
}

function seedNutritionTemplateWithMeals(): void {
  const scriptFile = join(tmpdir(), 'power-gym-seed-nutrition.js');
  writeFileSync(scriptFile, `
    const db = db.getSiblingDB('power_gym_test');
    const trainer = db.users.findOne({ email: 'trainer@test.com' });
    if (!trainer) { print('trainer not found — skipping nutrition seed'); quit(); }
    // Only seed if no template with meals exists for the trainer
    const existing = db.getCollection('nutritiontemplates').findOne({
      createdBy: trainer._id,
      'dayTypes.0': { $exists: true }
    });
    if (existing) { print('seeded nutrition template already exists'); quit(); }
    db.getCollection('nutritiontemplates').insertOne({
      _id: new ObjectId(),
      name: 'E2E Seeded Plan',
      description: 'Seeded for E2E macro row test',
      createdBy: trainer._id,
      dayTypes: [
        {
          name: 'Training Day',
          meals: [
            {
              name: 'Breakfast',
              order: 1,
              items: [
                { foodName: 'Eggs', quantityG: 150, kcal: 210, protein: 18, carbs: 1, fat: 14 },
                { foodName: 'Oats', quantityG: 80, kcal: 296, protein: 10, carbs: 54, fat: 5 },
              ]
            },
            {
              name: 'Lunch',
              order: 2,
              items: [
                { foodName: 'Chicken Breast', quantityG: 200, kcal: 330, protein: 62, carbs: 0, fat: 7 },
                { foodName: 'Rice', quantityG: 150, kcal: 195, protein: 4, carbs: 43, fat: 1 },
              ]
            }
          ]
        }
      ],
      createdAt: new Date(),
    });
    print('Seeded E2E nutrition template with meals');
  `);
  try {
    runMongosh(scriptFile);
  } finally {
    unlinkSync(scriptFile);
  }
}

function seedEquipment(): void {
  const scriptFile = join(tmpdir(), 'power-gym-seed-equipment.js');
  writeFileSync(scriptFile, `
    const db = db.getSiblingDB('power_gym_test');
    const count = db.getCollection('equipment').countDocuments();
    if (count > 0) { print('equipment already seeded: ' + count + ' items'); quit(); }
    db.getCollection('equipment').insertMany([
      { _id: new ObjectId(), name: 'Barbell', status: 'active', brand: null, quantity: 4, note: null, trackCondition: false, createdAt: new Date() },
      { _id: new ObjectId(), name: 'Treadmill', status: 'maintenance', brand: 'Life Fitness', quantity: 2, note: 'Annual service', trackCondition: true, createdAt: new Date() },
      { _id: new ObjectId(), name: 'Old Bike', status: 'retired', brand: null, quantity: 1, note: null, trackCondition: false, createdAt: new Date() },
    ]);
    print('Seeded 3 equipment items');
  `);
  try {
    runMongosh(scriptFile);
  } finally {
    unlinkSync(scriptFile);
  }
}

async function loginAndSave(
  browser: import('@playwright/test').Browser,
  email: string,
  password: string,
  waitUrl: string,
  filePath: string,
): Promise<void> {
  const context = await browser.newContext({ baseURL: 'http://localhost:5173' });
  const page = await context.newPage();
  await page.goto('/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(waitUrl, { timeout: 15000 });
  await context.storageState({ path: filePath });
  await context.close();
}

/** Returns true if all auth state files exist. */
function authFilesExist(authDir: string): boolean {
  const files = [
    'owner.json', 'trainer.json', 'member.json',
    'owner-domain.json', 'trainer-domain.json', 'member-domain.json',
    'owner-integration.json', 'trainer-integration.json', 'member-integration.json',
    'member-zauth.json', 'trainer-member-setup.json', 'trainer-hub.json',
  ];
  for (const file of files) {
    try {
      statSync(join(authDir, file));
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Returns true if the stored refresh token in the given auth file is still usable.
 * Calls /api/v1/auth/refresh (which is @SkipThrottle) with the stored httpOnly cookie.
 */
async function authTokenIsValid(authFilePath: string): Promise<boolean> {
  try {
    const state = JSON.parse(readFileSync(authFilePath, 'utf8')) as {
      cookies: Array<{ name: string; value: string; domain: string; path: string }>;
    };
    const refreshCookie = state.cookies.find((c) => c.name === 'refresh_token');
    if (!refreshCookie) return false;

    const ctx = await request.newContext({ baseURL: 'http://localhost:3001' });
    const res = await ctx.post('/api/v1/auth/refresh', {
      headers: { Cookie: `refresh_token=${refreshCookie.value}` },
    });
    await ctx.dispose();
    return res.ok();
  } catch {
    return false;
  }
}

async function saveAuthStates() {
  const AUTH_DIR = join(process.cwd(), 'e2e', '.auth');
  mkdirSync(AUTH_DIR, { recursive: true });

  // Skip re-logging in if auth files exist and their tokens are still valid.
  // The refresh endpoint is @SkipThrottle so we can probe it without burning the
  // rate-limited login quota. Token rotation during a test run invalidates old cookies,
  // so we check liveness rather than file age.
  if (authFilesExist(AUTH_DIR)) {
    const ownerFile = join(AUTH_DIR, 'owner.json');
    const isValid = await authTokenIsValid(ownerFile);
    if (isValid) {
      console.log('global-setup: auth tokens are still valid — skipping re-login');
      return;
    }
    console.log('global-setup: auth tokens expired/rotated — re-logging in');
  }

  const browser = await chromium.launch();

  // Each spec file that needs real authentication gets its own fresh login so
  // token rotation does not revoke another spec's httpOnly cookie.
  // access-control.spec — base files (stale tokens still redirect correctly)
  await loginAndSave(browser, 'owner@test.com', PASSWORD, '/owner', join(AUTH_DIR, 'owner.json'));
  await loginAndSave(browser, 'trainer@test.com', PASSWORD, '/trainer/members', join(AUTH_DIR, 'trainer.json'));
  await loginAndSave(browser, 'member@test.com', PASSWORD, '/member', join(AUTH_DIR, 'member.json'));

  // owner.spec, trainer.spec, member.spec — dedicated fresh tokens
  await loginAndSave(browser, 'owner@test.com', PASSWORD, '/owner', join(AUTH_DIR, 'owner-domain.json'));
  await loginAndSave(browser, 'trainer@test.com', PASSWORD, '/trainer/members', join(AUTH_DIR, 'trainer-domain.json'));
  await loginAndSave(browser, 'member@test.com', PASSWORD, '/member', join(AUTH_DIR, 'member-domain.json'));

  // integration.spec — dedicated fresh tokens
  await loginAndSave(browser, 'owner@test.com', PASSWORD, '/owner', join(AUTH_DIR, 'owner-integration.json'));
  await loginAndSave(browser, 'trainer@test.com', PASSWORD, '/trainer/members', join(AUTH_DIR, 'trainer-integration.json'));
  await loginAndSave(browser, 'member@test.com', PASSWORD, '/member', join(AUTH_DIR, 'member-integration.json'));

  // z-auth.spec deep-link test — dedicated fresh member token
  await loginAndSave(browser, 'member@test.com', PASSWORD, '/member', join(AUTH_DIR, 'member-zauth.json'));

  // member.spec.ts beforeAll — trainer token for plan setup (avoids burning the rate limit at test time)
  await loginAndSave(browser, 'trainer@test.com', PASSWORD, '/trainer/members', join(AUTH_DIR, 'trainer-member-setup.json'));

  // member-hub.spec.ts — dedicated fresh trainer token
  await loginAndSave(browser, 'trainer@test.com', PASSWORD, '/trainer/members', join(AUTH_DIR, 'trainer-hub.json'));

  await browser.close();
}

export default async function globalSetup() {
  // Always clean up test data from previous runs first
  if (checkUsersSeeded()) {
    cleanupTestData();
    seedNutritionTemplateWithMeals();
    seedEquipment();
    await saveAuthStates();
    return;
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const now = new Date().toISOString();

  // Write seed values to a JSON file so the mongosh script reads them
  // without any shell interpolation of the hash string
  const dataFile = join(tmpdir(), 'power-gym-seed-data.json');
  const scriptFile = join(tmpdir(), 'power-gym-seed.js');

  writeFileSync(dataFile, JSON.stringify({ passwordHash, now }));

  // The DB enforces a partial unique index on { role: 'owner' }, so there can
  // only be one owner. If a non-test owner already exists, we update their
  // credentials to match the test fixtures rather than inserting a second owner.
  const seedScript = `
    const raw = fs.readFileSync(${JSON.stringify(dataFile)}, 'utf8');
    const { passwordHash, now } = JSON.parse(raw);
    const db = db.getSiblingDB('power_gym_test');

    // Ensure owner test user exists (update existing owner if needed)
    const existingOwner = db.users.findOne({ role: 'owner' });
    let ownerId;
    if (existingOwner) {
      if (existingOwner.email !== 'owner@test.com') {
        db.users.updateOne(
          { _id: existingOwner._id },
          { $set: { email: 'owner@test.com', firstName: 'Test', lastName: 'Owner', passwordHash } }
        );
        print('Updated existing owner to owner@test.com');
      }
      ownerId = existingOwner._id;
    } else {
      ownerId = new ObjectId();
      db.users.insertOne({
        _id: ownerId,
        email: 'owner@test.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'Owner',
        role: 'owner',
        trainerId: null,
        createdAt: new Date(now),
        __v: 0,
      });
      print('Inserted owner@test.com');
    }

    // Ensure trainer test user exists
    const existingTrainer = db.users.findOne({ email: 'trainer@test.com' });
    let trainerId;
    if (existingTrainer) {
      trainerId = existingTrainer._id;
      print('trainer@test.com already exists');
    } else {
      trainerId = new ObjectId();
      db.users.insertOne({
        _id: trainerId,
        email: 'trainer@test.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'Trainer',
        role: 'trainer',
        trainerId: null,
        createdAt: new Date(now),
        __v: 0,
      });
      print('Inserted trainer@test.com');
    }

    // Ensure member test user exists
    const existingMember = db.users.findOne({ email: 'member@test.com' });
    if (existingMember) {
      print('member@test.com already exists');
    } else {
      db.users.insertOne({
        _id: new ObjectId(),
        email: 'member@test.com',
        passwordHash,
        firstName: 'Test',
        lastName: 'Member',
        role: 'member',
        trainerId,
        createdAt: new Date(now),
        __v: 0,
      });
      print('Inserted member@test.com');
    }
  `;

  writeFileSync(scriptFile, seedScript);

  try {
    runMongosh(scriptFile);
  } finally {
    unlinkSync(dataFile);
    unlinkSync(scriptFile);
  }

  seedNutritionTemplateWithMeals();
  seedEquipment();
  await saveAuthStates();
}
