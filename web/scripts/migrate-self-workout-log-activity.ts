/**
 * One-time migration: backfill `lastActivityAt` on SelfWorkoutLog documents
 * that predate the field's introduction.
 *
 * For documents missing `lastActivityAt`, sets it equal to `startedAt` —
 * the earliest sensible proxy for "last known activity".
 *
 * Safe to re-run — the filter excludes already-populated documents.
 *
 * Usage:
 *   pnpm migrate:self-workout-log-activity
 */

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env.local');

  await mongoose.connect(uri);
  console.log('Connected to', uri.replace(/\/\/[^@]+@/, '//***@'));

  const db = mongoose.connection.db!;
  const col = db.collection('selfworkoutlogs');

  const result = await col.updateMany(
    { lastActivityAt: { $exists: false } },
    [{ $set: { lastActivityAt: '$startedAt' } }],
  );

  console.log(`Backfilled lastActivityAt on ${result.modifiedCount} SelfWorkoutLog document(s).`);
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => mongoose.disconnect());
