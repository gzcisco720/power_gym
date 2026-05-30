/**
 * Production exercise + equipment catalog seed.
 *
 * Upserts exercises and equipment catalog entries into the production database.
 * Safe to re-run — all operations are idempotent upserts.
 *
 * Usage:
 *   pnpm seed:equipments-exercises
 *
 * Requires MONGODB_URI_PROD to be set in .env.local.
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { ExerciseModel } from '../src/lib/db/models/exercise.model';

const GymEquipmentCatalogModel: mongoose.Model<mongoose.Document & { catalogId: string; name: string }> =
  mongoose.models.GymEquipmentCatalog ??
  mongoose.model(
    'GymEquipmentCatalog',
    new mongoose.Schema(
      { catalogId: { type: String, required: true, unique: true }, name: { type: String, required: true } },
      { timestamps: false },
    ),
  );

interface RawExercise { id: string; name: string; body_parts: string[]; image: string }
interface RawEquipmentCatalog { equipment: { id: string; name: string }[] }

async function main() {
  const uri = process.env.MONGODB_URI_PROD;
  if (!uri) throw new Error('MONGODB_URI_PROD not set in .env.local');

  await mongoose.connect(uri);
  console.log('Connected to', uri.replace(/\/\/[^@]+@/, '//***@'));

  const exercisesPath = path.join(process.cwd(), 'context/data/exercises_catalog.json');
  const rawExercises: RawExercise[] = JSON.parse(fs.readFileSync(exercisesPath, 'utf-8'));
  for (const ex of rawExercises) {
    await ExerciseModel.findOneAndUpdate(
      { name: ex.name, isGlobal: true },
      { $set: { name: ex.name, isGlobal: true, bodyParts: ex.body_parts, imageUrl: ex.image, muscleGroup: ex.body_parts[0] ?? null, isBodyweight: false, createdBy: null } },
      { upsert: true },
    );
  }
  console.log(`Upserted ${rawExercises.length} exercises.`);

  const equipPath = path.join(process.cwd(), 'context/data/gym_equipment.json');
  const { equipment }: RawEquipmentCatalog = JSON.parse(fs.readFileSync(equipPath, 'utf-8'));
  for (const eq of equipment) {
    await GymEquipmentCatalogModel.findOneAndUpdate(
      { catalogId: eq.id },
      { $set: { catalogId: eq.id, name: eq.name } },
      { upsert: true },
    );
  }
  console.log(`Upserted ${equipment.length} equipment catalog items.`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
