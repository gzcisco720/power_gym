/**
 * One-time migration: clean up stale fields from the Equipment collection.
 *
 * Removes: purchasedAt, category, notes (old field — replaced by `note`)
 * Safe to re-run — $unset is idempotent.
 *
 * Usage:
 *   pnpm migrate:equipment
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
  const result = await db.collection('equipments').updateMany(
    {},
    { $unset: { purchasedAt: '', category: '', notes: '' } },
  );

  console.log(`Updated ${result.modifiedCount} equipment documents.`);
  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
