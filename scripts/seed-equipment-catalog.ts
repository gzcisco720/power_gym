/**
 * One-time equipment catalog seed.
 *
 * Usage:
 *   pnpm seed:equipment-catalog
 *
 * Safe to re-run — upserts on catalogId so existing docs are not duplicated.
 * Syncs name changes from gym_equipment.json to existing catalog entries.
 */

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const GymEquipmentCatalogSchema = new mongoose.Schema(
  {
    catalogId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
  },
  { timestamps: false },
);

const GymEquipmentCatalogModel: mongoose.Model<mongoose.Document & { catalogId: string; name: string }> =
  mongoose.models.GymEquipmentCatalog ??
  mongoose.model('GymEquipmentCatalog', GymEquipmentCatalogSchema);

interface RawEquipmentFile {
  equipment: { id: string; name: string }[];
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env.local');

  await mongoose.connect(uri);
  console.log('Connected to', uri.replace(/\/\/[^@]+@/, '//***@'));

  const filePath = path.join(process.cwd(), 'context/data/gym_equipment.json');
  const { equipment }: RawEquipmentFile = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

  let upserted = 0;
  for (const eq of equipment) {
    await GymEquipmentCatalogModel.findOneAndUpdate(
      { catalogId: eq.id },
      { $set: { catalogId: eq.id, name: eq.name } },
      { upsert: true },
    );
    upserted++;
  }

  console.log(`Upserted ${upserted} equipment catalog items.`);

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
