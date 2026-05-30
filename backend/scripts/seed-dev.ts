/**
 * Dev database seed CLI entrypoint.
 *
 * Usage:
 *   pnpm seed:dev           — seed (skip Phase 2 if data exists)
 *   pnpm seed:dev:reset     — wipe all collections then reseed
 *
 * Credentials:
 *   owner@dev.com   / Dev123!  (owner)
 *   trainer@dev.com / Dev123!  (trainer)
 *   member@dev.com  / Dev123!  (member — full data)
 *   member2@dev.com / Dev123!  (member — managed by owner, full data)
 */

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { UserModel } from '../src/database/models/index';
import { seedCatalogs, seedDevData } from '../src/scripts/seed-dev';

const RESET = process.argv.includes('--reset');

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/powergym_dev';

  await mongoose.connect(uri);
  console.log('Connected to', uri.replace(/\/\/[^@]+@/, '//***@'));
  console.log(RESET ? 'Mode: RESET (drop all + reseed)' : 'Mode: seed (skip Phase 2 if data exists)');

  if (RESET) {
    const db = mongoose.connection.db!;
    const cols = await db.listCollections().toArray();
    await Promise.all(cols.map((c) => db.dropCollection(c.name)));
    console.log(`\nDropped ${cols.length} collection(s).\n`);
  }

  console.log('\n── Phase 1: Catalog data ─────────────────────────────────────');
  await seedCatalogs();

  const userCount = await UserModel.countDocuments();
  if (userCount > 0 && !RESET) {
    console.log(`\nDatabase already has ${userCount} users — skipping Phase 2.`);
    console.log('Run "pnpm seed:dev:reset" to wipe and reseed.\n');
  } else {
    console.log('\n── Phase 2: Dev data ─────────────────────────────────────────');
    await seedDevData();

    console.log('\n── Summary ───────────────────────────────────────────────────');
    console.log('Accounts:');
    console.log('  owner@dev.com   / Dev123!  (owner)');
    console.log('  trainer@dev.com / Dev123!  (trainer)');
    console.log('  member@dev.com  / Dev123!  (member — full data)');
    console.log('  member2@dev.com / Dev123!  (member — managed by owner, full data)');
  }

  await mongoose.disconnect();
  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
