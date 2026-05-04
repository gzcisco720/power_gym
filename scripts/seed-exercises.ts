/**
 * One-time exercise + equipment seed.
 *
 * Usage:
 *   pnpm seed:exercises
 *
 * Safe to re-run — uses upsert on exercise name (global only).
 */

import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { ExerciseModel } from '../src/lib/db/models/exercise.model';

// GymEquipment is a simple collection — define it inline to avoid circular deps
const GymEquipmentSchema = new mongoose.Schema(
  { name: { type: String, required: true, unique: true } },
  { timestamps: false },
);
const GymEquipmentModel: mongoose.Model<mongoose.Document & { name: string }> =
  mongoose.models.GymEquipment ?? mongoose.model('GymEquipment', GymEquipmentSchema);

interface RawExercise {
  id: string;
  name: string;
  body_parts: string[];
  image: string;
}

interface RawEquipmentFile {
  equipment: { id: string; name: string }[];
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env.local');

  await mongoose.connect(uri);
  console.log('Connected to', uri.replace(/\/\/[^@]+@/, '//***@'));

  // ── Exercises ─────────────────────────────────────────────────────────────
  const exercisesPath = path.join(process.cwd(), 'context/data/exercises_catalog.json');
  const rawExercises: RawExercise[] = JSON.parse(fs.readFileSync(exercisesPath, 'utf-8'));

  let upserted = 0;
  for (const ex of rawExercises) {
    await ExerciseModel.findOneAndUpdate(
      { name: ex.name, isGlobal: true },
      {
        $set: {
          name: ex.name,
          isGlobal: true,
          bodyParts: ex.body_parts,
          imageUrl: ex.image,
          muscleGroup: ex.body_parts[0] ?? null,
          isBodyweight: false,
          createdBy: null,
        },
      },
      { upsert: true },
    );
    upserted++;
  }
  console.log(`Upserted ${upserted} exercises.`);

  // ── Equipment ─────────────────────────────────────────────────────────────
  const equipmentPath = path.join(process.cwd(), 'context/data/gym_equipment.json');
  const rawEquipment: RawEquipmentFile = JSON.parse(fs.readFileSync(equipmentPath, 'utf-8'));

  let eqUpserted = 0;
  for (const eq of rawEquipment.equipment) {
    await GymEquipmentModel.findOneAndUpdate(
      { name: eq.name },
      { $set: { name: eq.name } },
      { upsert: true },
    );
    eqUpserted++;
  }
  console.log(`Upserted ${eqUpserted} equipment items.`);

  await mongoose.disconnect();
  console.log('\nDone. Exercise catalog seeded.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
