/**
 * Unified seed script.
 *
 * Usage:
 *   pnpm seed         — seed catalogs always; skip dev data if DB already has users
 *   pnpm seed:reset   — drop every collection, then seed everything fresh
 *
 * Accounts (dev data):
 *   owner@dev.com   / Dev123!  (owner)
 *   trainer@dev.com / Dev123!  (trainer)
 *   member@dev.com  / Dev123!  (member — full data)
 *   member2@dev.com / Dev123!  (member — no data)
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// ── App models ───────────────────────────────────────────────────────────────
import { UserModel } from '../src/lib/db/models/user.model';
import { ExerciseModel } from '../src/lib/db/models/exercise.model';
import { FoodModel } from '../src/lib/db/models/food.model';
import { PlanTemplateModel } from '../src/lib/db/models/plan-template.model';
import { MemberPlanModel } from '../src/lib/db/models/member-plan.model';
import { WorkoutSessionModel } from '../src/lib/db/models/workout-session.model';
import { PersonalBestModel } from '../src/lib/db/models/personal-best.model';
import { NutritionTemplateModel } from '../src/lib/db/models/nutrition-template.model';
import { MemberNutritionPlanModel } from '../src/lib/db/models/member-nutrition-plan.model';
import { BodyTestModel } from '../src/lib/db/models/body-test.model';
import { ScheduledSessionModel } from '../src/lib/db/models/scheduled-session.model';
import { MemberInjuryModel } from '../src/lib/db/models/member-injury.model';
import { CheckInConfigModel } from '../src/lib/db/models/check-in-config.model';
import { CheckInModel } from '../src/lib/db/models/check-in.model';
import { EquipmentModel } from '../src/lib/db/models/equipment.model';
import { ConditionReportModel } from '../src/lib/db/models/condition-report.model';

// ── Catalog model (inline — not used by the app at runtime) ─────────────────
const GymEquipmentCatalogModel: mongoose.Model<mongoose.Document & { catalogId: string; name: string }> =
  mongoose.models.GymEquipmentCatalog ??
  mongoose.model(
    'GymEquipmentCatalog',
    new mongoose.Schema(
      { catalogId: { type: String, required: true, unique: true }, name: { type: String, required: true } },
      { timestamps: false },
    ),
  );

// ── Helpers ──────────────────────────────────────────────────────────────────
const RESET = process.argv.includes('--reset');
const PASS  = 'Dev123!';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

interface RawExercise { id: string; name: string; body_parts: string[]; image: string }
interface RawEquipmentCatalog { equipment: { id: string; name: string }[] }

// ── Phase 1: Catalog (always upsert, unaffected by --reset) ─────────────────
async function seedCatalogs() {
  // Exercise catalog
  const exercisesPath = path.join(process.cwd(), 'context/data/exercises_catalog.json');
  const rawExercises: RawExercise[] = JSON.parse(fs.readFileSync(exercisesPath, 'utf-8'));
  for (const ex of rawExercises) {
    await ExerciseModel.findOneAndUpdate(
      { name: ex.name, isGlobal: true },
      { $set: { name: ex.name, isGlobal: true, bodyParts: ex.body_parts, imageUrl: ex.image, muscleGroup: ex.body_parts[0] ?? null, isBodyweight: false, createdBy: null } },
      { upsert: true },
    );
  }
  console.log(`  ✓ Exercise catalog: ${rawExercises.length} upserted`);

  // Equipment catalog
  const equipPath = path.join(process.cwd(), 'context/data/gym_equipment.json');
  const { equipment }: RawEquipmentCatalog = JSON.parse(fs.readFileSync(equipPath, 'utf-8'));
  for (const eq of equipment) {
    await GymEquipmentCatalogModel.findOneAndUpdate(
      { catalogId: eq.id },
      { $set: { catalogId: eq.id, name: eq.name } },
      { upsert: true },
    );
  }
  console.log(`  ✓ Equipment catalog: ${equipment.length} upserted`);
}

// ── Phase 2: Dev data ────────────────────────────────────────────────────────
async function seedDevData() {
  const hash = await bcrypt.hash(PASS, 10);

  // ── Users ──────────────────────────────────────────────────────────────────
  const owner = await UserModel.create({ name: 'Dev Owner', email: 'owner@dev.com', passwordHash: hash, role: 'owner', trainerId: null });
  const trainer = await UserModel.create({ name: 'Dev Trainer', email: 'trainer@dev.com', passwordHash: hash, role: 'trainer', trainerId: owner._id });
  const member = await UserModel.create({ name: 'Dev Member', email: 'member@dev.com', passwordHash: hash, role: 'member', trainerId: trainer._id });
  await UserModel.create({ name: 'Dev Member 2', email: 'member2@dev.com', passwordHash: hash, role: 'member', trainerId: trainer._id });
  console.log('  ✓ Users: 4 created');

  // ── Exercises (4 core lifts for plans) ────────────────────────────────────
  const [benchPress, squat, deadlift, pullUp] = await Promise.all([
    ExerciseModel.create({ name: 'Bench Press', muscleGroup: 'chest', isGlobal: true, createdBy: null, imageUrl: null, isBodyweight: false }),
    ExerciseModel.create({ name: 'Squat', muscleGroup: 'legs', isGlobal: true, createdBy: null, imageUrl: null, isBodyweight: false }),
    ExerciseModel.create({ name: 'Deadlift', muscleGroup: 'back', isGlobal: true, createdBy: null, imageUrl: null, isBodyweight: false }),
    ExerciseModel.create({ name: 'Pull-Up', muscleGroup: 'back', isGlobal: true, createdBy: null, imageUrl: null, isBodyweight: true }),
  ]);
  console.log('  ✓ Exercises: 4 created (dev plan exercises)');

  // ── Foods ──────────────────────────────────────────────────────────────────
  const [rice, chicken, egg, oats] = await Promise.all([
    FoodModel.create({ name: 'White Rice', brand: null, source: 'manual', isGlobal: true, per100g: { kcal: 365, protein: 7.1, carbs: 79.0, fat: 0.7 } }),
    FoodModel.create({ name: 'Chicken Breast', brand: null, source: 'manual', isGlobal: true, per100g: { kcal: 165, protein: 31.0, carbs: 0.0, fat: 3.6 } }),
    FoodModel.create({ name: 'Whole Egg', brand: null, source: 'manual', isGlobal: true, per100g: { kcal: 155, protein: 13.0, carbs: 1.1, fat: 11.0 } }),
    FoodModel.create({ name: 'Rolled Oats', brand: null, source: 'manual', isGlobal: true, per100g: { kcal: 389, protein: 17.0, carbs: 66.0, fat: 7.0 } }),
  ]);
  console.log('  ✓ Foods: 4 created');

  // ── Equipment ──────────────────────────────────────────────────────────────
  const [treadmill, smithMachine, legPress] = await Promise.all([
    EquipmentModel.create({ name: 'Treadmill', brand: 'Life Fitness', quantity: 3, status: 'active', trackCondition: true, images: [], note: 'Zone A, rows 1–3' }),
    EquipmentModel.create({ name: 'Smith Machine', brand: 'Matrix', quantity: 2, status: 'active', trackCondition: true, images: [], note: null }),
    EquipmentModel.create({ name: 'Leg Press Machine', brand: null, quantity: 2, status: 'maintenance', trackCondition: true, images: [], note: 'One unit under repair' }),
    EquipmentModel.create({ name: 'Dumbbells', brand: null, quantity: 40, status: 'active', trackCondition: false, images: [], note: '2 kg – 40 kg, 2 kg increments' }),
    EquipmentModel.create({ name: 'Olympic Barbell', brand: null, quantity: 10, status: 'active', trackCondition: false, images: [], note: null }),
    EquipmentModel.create({ name: 'Weight Plates', brand: null, quantity: 120, status: 'active', trackCondition: false, images: [], note: '1.25 kg – 25 kg pairs' }),
    EquipmentModel.create({ name: 'Rowing Machine', brand: 'Concept2', quantity: 4, status: 'active', trackCondition: true, images: [], note: null }),
  ]);

  // Condition reports for tracked equipment
  await Promise.all([
    ConditionReportModel.create({ equipmentId: treadmill._id, note: 'Belt slightly worn on unit #2. Scheduled for replacement next week.', reportedAt: daysAgo(14) }),
    ConditionReportModel.create({ equipmentId: treadmill._id, note: 'Belt replaced on unit #2, all units running normally.', reportedAt: daysAgo(7) }),
    ConditionReportModel.create({ equipmentId: legPress._id, note: 'Unit #1 cable frayed — taken offline. Technician booked.', reportedAt: daysAgo(5) }),
    ConditionReportModel.create({ equipmentId: smithMachine._id, note: 'Lubricated guide rails on both units. Operating smoothly.', reportedAt: daysAgo(21) }),
  ]);
  console.log('  ✓ Equipment: 7 items + 4 condition reports created');

  // ── Plan Template ──────────────────────────────────────────────────────────
  const g1 = new mongoose.Types.ObjectId().toString();
  const g2 = new mongoose.Types.ObjectId().toString();
  const g3 = new mongoose.Types.ObjectId().toString();

  const planTemplate = await PlanTemplateModel.create({
    name: 'PPL — 3-Day Split',
    description: 'Push / Pull / Legs rotating split',
    createdBy: trainer._id,
    days: [
      { dayNumber: 1, name: 'Push', exercises: [
        { groupId: g1, isSuperset: false, exerciseId: benchPress._id, exerciseName: 'Bench Press', imageUrl: null, isBodyweight: false, sets: 4, repsMin: 6, repsMax: 10, restSeconds: 120 },
      ]},
      { dayNumber: 2, name: 'Pull', exercises: [
        { groupId: g2, isSuperset: false, exerciseId: deadlift._id, exerciseName: 'Deadlift', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 5, repsMax: 8, restSeconds: 180 },
        { groupId: g3, isSuperset: false, exerciseId: pullUp._id, exerciseName: 'Pull-Up', imageUrl: null, isBodyweight: true, sets: 3, repsMin: 6, repsMax: 10, restSeconds: 90 },
      ]},
      { dayNumber: 3, name: 'Legs', exercises: [
        { groupId: new mongoose.Types.ObjectId().toString(), isSuperset: false, exerciseId: squat._id, exerciseName: 'Squat', imageUrl: null, isBodyweight: false, sets: 4, repsMin: 6, repsMax: 10, restSeconds: 150 },
      ]},
    ],
  });

  // ── Member Plan ────────────────────────────────────────────────────────────
  const memberPlan = await MemberPlanModel.create({
    memberId: member._id, trainerId: trainer._id, templateId: planTemplate._id,
    name: planTemplate.name, days: planTemplate.days, isActive: true, assignedAt: daysAgo(30),
  });
  console.log('  ✓ Plan template + member plan created');

  // ── Workout Sessions (12 sessions, 6 weeks) ────────────────────────────────
  const sessionDays = [42, 39, 35, 32, 28, 25, 21, 18, 14, 11, 7, 4];
  for (const [i, ago] of sessionDays.entries()) {
    const d = daysAgo(ago);
    const weight = 60 + i * 1.25;
    const session = await WorkoutSessionModel.create({
      memberId: member._id, memberPlanId: memberPlan._id,
      dayNumber: (i % 3) + 1, dayName: ['Push', 'Pull', 'Legs'][i % 3],
      startedAt: d, completedAt: d,
      sets: [{
        exerciseId: benchPress._id, exerciseName: 'Bench Press',
        groupId: g1, isSuperset: false, isBodyweight: false,
        setNumber: 1, prescribedRepsMin: 6, prescribedRepsMax: 10,
        isExtraSet: false, actualWeight: weight, actualReps: 8, completedAt: d,
      }],
    });
    if (i === sessionDays.length - 1) {
      await PersonalBestModel.create({
        memberId: member._id, exerciseId: benchPress._id, exerciseName: 'Bench Press',
        bestWeight: weight, bestReps: 8,
        estimatedOneRM: Math.round(weight / (1.0278 - 0.0278 * 8) * 10) / 10,
        achievedAt: d, sessionId: session._id,
      });
    }
  }
  console.log('  ✓ Workout sessions: 12 created + 1 PB');

  // ── Nutrition Template ─────────────────────────────────────────────────────
  const nutritionTemplate = await NutritionTemplateModel.create({
    name: 'Lean Bulk — 2800 kcal', description: null, createdBy: trainer._id,
    dayTypes: [
      {
        name: 'Training Day', targetKcal: 2800, targetProtein: 210, targetCarbs: 310, targetFat: 70,
        meals: [
          { name: 'Breakfast', order: 1, items: [
            { foodId: oats._id, foodName: 'Rolled Oats', quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6 },
            { foodId: egg._id, foodName: 'Whole Egg', quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7, fat: 16.5 },
          ]},
          { name: 'Lunch', order: 2, items: [
            { foodId: rice._id, foodName: 'White Rice', quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0, fat: 1.4 },
            { foodId: chicken._id, foodName: 'Chicken Breast', quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0, fat: 7.2 },
          ]},
          { name: 'Dinner', order: 3, items: [
            { foodId: rice._id, foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 },
            { foodId: chicken._id, foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 },
          ]},
        ],
      },
      {
        name: 'Rest Day', targetKcal: 2300, targetProtein: 200, targetCarbs: 230, targetFat: 70,
        meals: [
          { name: 'Breakfast', order: 1, items: [
            { foodId: oats._id, foodName: 'Rolled Oats', quantityG: 60, kcal: 233, protein: 10.2, carbs: 39.6, fat: 4.2 },
            { foodId: egg._id, foodName: 'Whole Egg', quantityG: 120, kcal: 186, protein: 15.6, carbs: 1.3, fat: 13.2 },
          ]},
          { name: 'Lunch', order: 2, items: [
            { foodId: rice._id, foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 },
            { foodId: chicken._id, foodName: 'Chicken Breast', quantityG: 180, kcal: 297, protein: 55.8, carbs: 0.0, fat: 6.5 },
          ]},
        ],
      },
    ],
  });
  await MemberNutritionPlanModel.create({
    memberId: member._id, trainerId: trainer._id, templateId: nutritionTemplate._id,
    name: nutritionTemplate.name, isActive: true, assignedAt: daysAgo(25), dayTypes: nutritionTemplate.dayTypes,
  });
  console.log('  ✓ Nutrition template + member plan created');

  // ── Body Tests (5 data points, 8 weeks) ───────────────────────────────────
  const bodyTestData = [
    { ago: 56, weight: 82, chest: 26, abdominal: 32, thigh: 20 },
    { ago: 42, weight: 81, chest: 25, abdominal: 30, thigh: 19 },
    { ago: 28, weight: 80, chest: 23, abdominal: 28, thigh: 18 },
    { ago: 14, weight: 79, chest: 22, abdominal: 26, thigh: 17 },
    { ago: 0,  weight: 78, chest: 21, abdominal: 24, thigh: 16 },
  ];
  for (const { ago, weight, chest, abdominal, thigh } of bodyTestData) {
    const sum = chest + abdominal + thigh;
    const age = 28;
    const density = 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age;
    const bfPct = Math.round(((4.95 / density) - 4.50) * 1000) / 10;
    const fatMass = Math.round(weight * bfPct / 100 * 10) / 10;
    await BodyTestModel.create({
      memberId: member._id, trainerId: trainer._id, date: daysAgo(ago),
      age, sex: 'male', weight, protocol: '3site',
      chest, abdominal, thigh,
      bodyFatPct: bfPct, leanMassKg: Math.round((weight - fatMass) * 10) / 10, fatMassKg: fatMass,
      targetWeight: 75, targetBodyFatPct: 12,
    });
  }
  console.log('  ✓ Body tests: 5 created');

  // ── Scheduled Sessions ─────────────────────────────────────────────────────
  const nextMon = new Date();
  const dow = nextMon.getDay();
  nextMon.setDate(nextMon.getDate() + (dow === 0 ? 1 : 8 - dow));
  nextMon.setHours(9, 0, 0, 0);
  await ScheduledSessionModel.create({ seriesId: null, trainerId: trainer._id, memberIds: [member._id], date: nextMon, startTime: '09:00', endTime: '10:00', status: 'scheduled', reminderSentAt: null });
  await ScheduledSessionModel.create({ seriesId: null, trainerId: trainer._id, memberIds: [member._id], date: daysAgo(7), startTime: '09:00', endTime: '10:00', status: 'scheduled', reminderSentAt: null });
  console.log('  ✓ Scheduled sessions: 2 created');

  // ── Member Injury ──────────────────────────────────────────────────────────
  await MemberInjuryModel.create({
    memberId: member._id, title: 'Right shoulder tightness', status: 'active',
    recordedAt: daysAgo(14), trainerNotes: 'Avoid overhead pressing for 2 weeks',
    memberNotes: null, affectedMovements: 'Overhead press, upright row',
  });
  console.log('  ✓ Member injury: 1 created');

  // ── Check-In Config ────────────────────────────────────────────────────────
  await CheckInConfigModel.create({ memberId: member._id, trainerId: trainer._id, dayOfWeek: 4, hour: 7, minute: 0, active: true, reminderSentAt: null });

  // ── Check-In History (6 weeks) ─────────────────────────────────────────────
  const checkIns = [
    { ago: 42, sleep: 6, stress: 6, fatigue: 6, hunger: 5, recovery: 5, energy: 6, digestion: 7, weight: 82.0, sleepHrs: 6.5, diet: 'partial' as const, dietDetails: 'Hit protein but went over on carbs', wellbeing: 'A bit tired from work stress', notes: 'Work hectic, keeping up with training' },
    { ago: 35, sleep: 7, stress: 5, fatigue: 5, hunger: 6, recovery: 7, energy: 7, digestion: 7, weight: 81.5, sleepHrs: 7.0, diet: 'yes' as const, dietDetails: 'Followed plan closely, meals prepped Sunday', wellbeing: 'Feeling better this week', notes: 'Upped calories slightly' },
    { ago: 28, sleep: 8, stress: 4, fatigue: 4, hunger: 6, recovery: 8, energy: 8, digestion: 8, weight: 80.5, sleepHrs: 7.5, diet: 'yes' as const, dietDetails: 'Nailed every meal', wellbeing: 'Great energy, training going well', notes: 'Everything clicking' },
    { ago: 21, sleep: 7, stress: 5, fatigue: 5, hunger: 7, recovery: 7, energy: 7, digestion: 8, weight: 80.0, sleepHrs: 7.0, diet: 'yes' as const, dietDetails: 'Stuck to plan, one cheat meal Saturday', wellbeing: 'Consistent week', notes: 'Squat PR this week' },
    { ago: 14, sleep: 6, stress: 7, fatigue: 7, hunger: 5, recovery: 6, energy: 6, digestion: 6, weight: 79.5, sleepHrs: 6.0, diet: 'no' as const, dietDetails: 'Ate out, could not track macros', wellbeing: 'Tough week, travel', notes: 'Missed 2 sessions' },
    { ago: 7,  sleep: 8, stress: 3, fatigue: 3, hunger: 7, recovery: 9, energy: 9, digestion: 8, weight: 78.0, sleepHrs: 8.0, diet: 'yes' as const, dietDetails: 'Perfect adherence, hit all targets', wellbeing: 'Best week in months', notes: 'Everything dialed in' },
  ];
  for (const c of checkIns) {
    await CheckInModel.create({
      memberId: member._id, trainerId: trainer._id, submittedAt: daysAgo(c.ago),
      sleepQuality: c.sleep, stress: c.stress, fatigue: c.fatigue, hunger: c.hunger,
      recovery: c.recovery, energy: c.energy, digestion: c.digestion,
      weight: c.weight, waist: null, steps: null, exerciseMinutes: null,
      walkRunDistance: null, sleepHours: c.sleepHrs,
      dietDetails: c.dietDetails, stuckToDiet: c.diet, wellbeing: c.wellbeing,
      notes: c.notes, photos: [],
    });
  }
  console.log('  ✓ Check-in config + 6 check-in history records');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env.local');

  await mongoose.connect(uri);
  console.log('Connected to', uri.replace(/\/\/[^@]+@/, '//***@'));
  console.log(RESET ? 'Mode: RESET (drop all + reseed)' : 'Mode: seed (skip if data exists)');

  if (RESET) {
    const db = mongoose.connection.db!;
    const cols = await db.listCollections().toArray();
    await Promise.all(cols.map((c) => db.dropCollection(c.name)));
    console.log(`\nDropped ${cols.length} collection(s).\n`);
  }

  // Phase 1 — catalogs (always)
  console.log('\n── Catalog data ─────────────────────────────────────────────');
  await seedCatalogs();

  // Phase 2 — dev data (skip if users already exist)
  const userCount = await UserModel.countDocuments();
  if (userCount > 0 && !RESET) {
    console.log(`\nDatabase already has ${userCount} users — skipping dev data.`);
    console.log('Run "pnpm seed:reset" to wipe and reseed.\n');
  } else {
    console.log('\n── Dev data ─────────────────────────────────────────────────');
    await seedDevData();
    console.log('\n── Summary ──────────────────────────────────────────────────');
    console.log('Accounts:');
    console.log('  owner@dev.com   / Dev123!  (owner)');
    console.log('  trainer@dev.com / Dev123!  (trainer)');
    console.log('  member@dev.com  / Dev123!  (member — full data)');
    console.log('  member2@dev.com / Dev123!  (member — no data yet)');
    console.log('\nEquipment (tracked):  Treadmill, Smith Machine, Leg Press, Rowing Machine');
    console.log('Equipment (no track): Dumbbells, Olympic Barbell, Weight Plates');
  }

  await mongoose.disconnect();
  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
