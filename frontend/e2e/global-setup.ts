import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';
import { chromium } from '@playwright/test';

const PASSWORD = 'TestPass123!';
const MONGODB_URI = 'mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym_test?authSource=admin';

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

async function saveAuthStates() {
  const AUTH_DIR = join(process.cwd(), 'e2e', '.auth');
  mkdirSync(AUTH_DIR, { recursive: true });

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

  await browser.close();
}

export default async function globalSetup() {
  // Always clean up test data from previous runs first
  if (checkUsersSeeded()) {
    cleanupTestData();
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

  await saveAuthStates();
}
