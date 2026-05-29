import { execFileSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as bcrypt from 'bcryptjs';

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

export default async function globalSetup() {
  // Check if test users already exist directly in MongoDB (no API calls = no rate limiting)
  if (checkUsersSeeded()) return;

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
}
