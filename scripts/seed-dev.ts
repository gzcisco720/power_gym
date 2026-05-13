/**
 * Dev database seed script.
 *
 * Phase 1 — Catalog data (always upserted, idempotent):
 *   • Exercise catalog from context/data/exercises_catalog.json
 *   • Equipment catalog from context/data/gym_equipment.json
 *
 * Phase 2 — Dev data (skipped if users already exist, unless --reset):
 *   • 4 accounts with profiles, equipment, plans, nutrition, check-ins, injuries, and more.
 *
 * Usage:
 *   pnpm seed:dev           — seed (skip Phase 2 if data already exists)
 *   pnpm seed:dev:reset     — wipe all collections then reseed
 *
 * Credentials:
 *   owner@dev.com   / Dev123!
 *   trainer@dev.com / Dev123!
 *   member@dev.com  / Dev123!
 *   member2@dev.com / Dev123!
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { UserModel } from '../src/lib/db/models/user.model';
import { UserProfileModel } from '../src/lib/db/models/user-profile.model';
import { ExerciseModel } from '../src/lib/db/models/exercise.model';
import { ExerciseNoteModel } from '../src/lib/db/models/exercise-note.model';
import { EquipmentModel } from '../src/lib/db/models/equipment.model';
import { ConditionReportModel } from '../src/lib/db/models/condition-report.model';
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
import { FoodModel } from '../src/lib/db/models/food.model';
import { NutritionDailyLogModel } from '../src/lib/db/models/nutrition-daily-log.model';
import { InviteTokenModel } from '../src/lib/db/models/invite-token.model';
import { SelfWorkoutLogModel } from '../src/lib/db/models/self-workout-log.model';
import { FOOD_EXTRAS_PER_100G, withExtras } from './food-extras';

const GymEquipmentCatalogModel: mongoose.Model<mongoose.Document & { catalogId: string; name: string }> =
  mongoose.models.GymEquipmentCatalog ??
  mongoose.model(
    'GymEquipmentCatalog',
    new mongoose.Schema(
      { catalogId: { type: String, required: true, unique: true }, name: { type: String, required: true } },
      { timestamps: false },
    ),
  );

const RESET = process.argv.includes('--reset');
const PASS  = 'Dev123!';

interface RawExercise { id: string; name: string; body_parts: string[]; image: string }
interface RawEquipmentCatalog { equipment: { id: string; name: string }[] }

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function dateISO(offset: number): string {
  return daysAgo(offset).toISOString().slice(0, 10);
}

// Mon/Wed/Fri = Training Day, rest = Rest Day
function memberDayType(offset: number): string {
  return [1, 3, 5].includes(daysAgo(offset).getDay()) ? 'Training Day' : 'Rest Day';
}

function epley1RM(weight: number, reps: number): number {
  return Math.round(weight / (1.0278 - 0.0278 * reps) * 10) / 10;
}

// weeksOffset: 0 = next Monday, -1 = last Monday, 1 = Monday after next
function mondayAt(weeksOffset: number, hour = 9): Date {
  const d = new Date();
  const dow = d.getDay();
  const daysUntilMon = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + daysUntilMon + weeksOffset * 7);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// Next occurrence of a day-of-week (1=Mon..7=Sun in ISO convention, but JS getDay 0=Sun..6=Sat)
function nextDow(jsDow: number, weeksOffset = 0, hour = 10): Date {
  const d = new Date();
  const today = d.getDay();
  let diff = (jsDow - today + 7) % 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() + diff + weeksOffset * 7);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function makeSet(
  exerciseId: mongoose.Types.ObjectId,
  exerciseName: string,
  groupId: string,
  isBodyweight: boolean,
  setNumber: number,
  repsMin: number,
  repsMax: number,
  weight: number | null,
  reps: number,
  date: Date,
  isExtra = false,
  isSuperset = false,
) {
  return {
    exerciseId,
    exerciseName,
    groupId,
    isSuperset,
    isBodyweight,
    setNumber,
    prescribedRepsMin: repsMin,
    prescribedRepsMax: repsMax,
    isExtraSet: isExtra,
    actualWeight: weight,
    actualReps: reps,
    completedAt: date,
  };
}

// Freestyle set for SelfWorkoutLog (no prescribedReps, no isExtraSet)
function makeSelfSet(
  exerciseId: mongoose.Types.ObjectId,
  exerciseName: string,
  groupId: string,
  isBodyweight: boolean,
  setNumber: number,
  weight: number | null,
  reps: number,
  date: Date,
) {
  return {
    exerciseId,
    exerciseName,
    groupId,
    isSuperset: false,
    isBodyweight,
    setNumber,
    prescribedRepsMin: null,
    prescribedRepsMax: null,
    actualWeight: weight,
    actualReps: reps,
    completedAt: date,
  };
}

// ── Phase 1: Catalog ──────────────────────────────────────────────────────────

async function seedCatalogs() {
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

// ── Phase 2: Dev data ─────────────────────────────────────────────────────────

async function seedDevData() {
  const hash = await bcrypt.hash(PASS, 10);

  // ── Users ──────────────────────────────────────────────────────────────────
  const owner = await UserModel.create({ firstName: 'Dev', lastName: 'Owner', email: 'owner@dev.com', passwordHash: hash, role: 'owner', trainerId: null });
  const trainer = await UserModel.create({ firstName: 'Dev', lastName: 'Trainer', email: 'trainer@dev.com', passwordHash: hash, role: 'trainer', trainerId: owner._id });
  const member = await UserModel.create({ firstName: 'Dev', lastName: 'Member', email: 'member@dev.com', passwordHash: hash, role: 'member', trainerId: trainer._id });
  const member2 = await UserModel.create({ firstName: 'Dev', lastName: 'Member2', email: 'member2@dev.com', passwordHash: hash, role: 'member', trainerId: owner._id });
  console.log('  ✓ Users: 4 created');

  // ── User Profiles ──────────────────────────────────────────────────────────
  await Promise.all([
    UserProfileModel.create({
      userId: owner._id,
      mobile: '+61 400 111 222',
      sex: 'male',
      dateOfBirth: new Date('1980-03-12'),
      height: 182,
      fitnessGoal: 'maintain',
      fitnessLevel: 'advanced',
      bio: 'Owner of PowerGym. 20 years of training experience.',
      specializations: ['Business Management', 'Strength Training'],
      certifications: [],
      gymInfo: { name: 'PowerGym', address: null, phone: null, email: null, website: null, hours: null, description: null },
    }),
    UserProfileModel.create({
      userId: trainer._id,
      mobile: '+61 400 333 444',
      sex: 'male',
      dateOfBirth: new Date('1992-07-25'),
      height: 180,
      fitnessGoal: 'improve_performance',
      fitnessLevel: 'advanced',
      bio: 'CSCS certified trainer. Specialising in strength & conditioning and body recomposition. 5+ years coaching experience.',
      specializations: ['Strength & Conditioning', 'Weight Loss', 'Powerlifting'],
      certifications: ['CSCS'],
    }),
    UserProfileModel.create({
      userId: member._id,
      mobile: '+61 400 555 666',
      sex: 'male',
      dateOfBirth: new Date('1996-04-15'),
      height: 178,
      fitnessGoal: 'build_muscle',
      fitnessLevel: 'intermediate',
      bio: null,
      specializations: [],
      certifications: [],
    }),
    UserProfileModel.create({
      userId: member2._id,
      mobile: '+61 400 777 888',
      sex: 'female',
      dateOfBirth: new Date('1997-08-20'),
      height: 165,
      fitnessGoal: 'lose_fat',
      fitnessLevel: 'beginner',
      bio: null,
      specializations: [],
      certifications: [],
    }),
  ]);
  console.log('  ✓ User profiles: 4 created');

  // ── Equipment + Condition Reports ──────────────────────────────────────────
  const [treadmill, smithMachine, legPress,,,, rowingMachine] = await Promise.all([
    EquipmentModel.create({ name: 'Treadmill',         brand: 'Life Fitness', quantity: 3,  status: 'active',      trackCondition: true,  images: [], note: 'Zone A, rows 1–3' }),
    EquipmentModel.create({ name: 'Smith Machine',     brand: 'Matrix',       quantity: 2,  status: 'active',      trackCondition: true,  images: [], note: null }),
    EquipmentModel.create({ name: 'Leg Press Machine', brand: null,           quantity: 2,  status: 'maintenance', trackCondition: true,  images: [], note: 'One unit under repair' }),
    EquipmentModel.create({ name: 'Dumbbells',         brand: null,           quantity: 40, status: 'active',      trackCondition: false, images: [], note: '2 kg – 40 kg, 2 kg increments' }),
    EquipmentModel.create({ name: 'Olympic Barbell',   brand: null,           quantity: 10, status: 'active',      trackCondition: false, images: [], note: null }),
    EquipmentModel.create({ name: 'Weight Plates',     brand: null,           quantity: 120,status: 'active',      trackCondition: false, images: [], note: '1.25 kg – 25 kg pairs' }),
    EquipmentModel.create({ name: 'Rowing Machine',    brand: 'Concept2',     quantity: 4,  status: 'active',      trackCondition: true,  images: [], note: null }),
    EquipmentModel.create({ name: 'Cable Cross Machine',brand: 'Technogym',  quantity: 1,  status: 'retired',     trackCondition: false, images: [], note: 'Decommissioned — replaced by new functional trainer unit' }),
  ]);
  await Promise.all([
    // Treadmill — two-event history: problem then fix
    ConditionReportModel.create({ equipmentId: treadmill._id,    note: 'Belt slightly worn on unit #2. Scheduled for replacement next week.',   reportedAt: daysAgo(14) }),
    ConditionReportModel.create({ equipmentId: treadmill._id,    note: 'Belt replaced on unit #2, all units running normally.',                  reportedAt: daysAgo(7)  }),
    // Leg press — ongoing issue
    ConditionReportModel.create({ equipmentId: legPress._id,     note: 'Unit #1 cable frayed — taken offline. Technician booked.',              reportedAt: daysAgo(5)  }),
    // Smith machine — multiple maintenance history entries
    ConditionReportModel.create({ equipmentId: smithMachine._id, note: 'Annual service completed. Guide rails lubricated, all hardware torqued.', reportedAt: daysAgo(60) }),
    ConditionReportModel.create({ equipmentId: smithMachine._id, note: 'Unit #1 locking pins stiff. Applied lubricant. Monitor next week.',      reportedAt: daysAgo(30) }),
    ConditionReportModel.create({ equipmentId: smithMachine._id, note: 'Lubricated guide rails on both units. Operating smoothly.',             reportedAt: daysAgo(21) }),
    // Rowing machine — maintenance + replacement record
    ConditionReportModel.create({ equipmentId: rowingMachine._id,note: 'Unit #2 monitor unresponsive. Replacement ordered.',                    reportedAt: daysAgo(20) }),
    ConditionReportModel.create({ equipmentId: rowingMachine._id,note: 'Chain tension adjusted on unit #3. Performance monitor battery replaced.', reportedAt: daysAgo(10) }),
    ConditionReportModel.create({ equipmentId: rowingMachine._id,note: 'Monitor replaced on unit #2. All 4 units fully operational.',           reportedAt: daysAgo(3)  }),
  ]);
  console.log('  ✓ Equipment: 8 items + 9 condition reports created (multi-event histories)');

  // ── Exercises ──────────────────────────────────────────────────────────────
  // 4 compound lifts for plan templates
  const [benchPress, squat, deadlift, pullUp] = await Promise.all([
    ExerciseModel.create({ name: 'Bench Press', muscleGroup: 'chest', isGlobal: true,  createdBy: null,        imageUrl: null, isBodyweight: false }),
    ExerciseModel.create({ name: 'Squat',       muscleGroup: 'legs',  isGlobal: true,  createdBy: null,        imageUrl: null, isBodyweight: false }),
    ExerciseModel.create({ name: 'Deadlift',    muscleGroup: 'back',  isGlobal: true,  createdBy: null,        imageUrl: null, isBodyweight: false }),
    ExerciseModel.create({ name: 'Pull-Up',     muscleGroup: 'back',  isGlobal: true,  createdBy: null,        imageUrl: null, isBodyweight: true  }),
  ]);
  // 2 trainer-created custom exercises
  const [cableFly, facePull] = await Promise.all([
    ExerciseModel.create({ name: 'Cable Fly',  muscleGroup: 'chest', isGlobal: false, createdBy: trainer._id, imageUrl: null, isBodyweight: false }),
    ExerciseModel.create({ name: 'Face Pull',  muscleGroup: 'back',  isGlobal: false, createdBy: trainer._id, imageUrl: null, isBodyweight: false }),
  ]);
  // 3 more global exercises used in self-tracking sessions
  const [ohp, hipThrust, latPulldown] = await Promise.all([
    ExerciseModel.create({ name: 'Overhead Press', muscleGroup: 'shoulders', isGlobal: true,  createdBy: null,        imageUrl: null, isBodyweight: false }),
    ExerciseModel.create({ name: 'Hip Thrust',     muscleGroup: 'legs',      isGlobal: true,  createdBy: null,        imageUrl: null, isBodyweight: false }),
    ExerciseModel.create({ name: 'Lat Pulldown',   muscleGroup: 'back',      isGlobal: false, createdBy: trainer._id, imageUrl: null, isBodyweight: false }),
  ]);
  // Owner-created food-prep exercise (tests owner-custom exercise path)
  await ExerciseModel.create({ name: 'Dumbbell Curl', muscleGroup: 'arms', isGlobal: false, createdBy: owner._id, imageUrl: null, isBodyweight: false });
  console.log('  ✓ Exercises: 4 global + 2 trainer-custom created + 3 more globals + 1 owner-custom');

  // ── Plan Templates ─────────────────────────────────────────────────────────
  // GroupIds for PPL (trainer)
  const g1  = new mongoose.Types.ObjectId().toString(); // Bench Press   — Push
  const g2  = new mongoose.Types.ObjectId().toString(); // Deadlift      — Pull
  const g3  = new mongoose.Types.ObjectId().toString(); // Pull-Up       — Pull
  const g4  = new mongoose.Types.ObjectId().toString(); // Squat         — Legs
  const g5  = new mongoose.Types.ObjectId().toString(); // Cable Fly     — Push (accessory)
  const g6  = new mongoose.Types.ObjectId().toString(); // Face Pull     — Pull (accessory)

  const pplTemplate = await PlanTemplateModel.create({
    name: 'PPL — 3-Day Split',
    description: 'Push / Pull / Legs rotating split. Compound-first, 3–4 sets per movement.',
    createdBy: trainer._id,
    days: [
      {
        dayNumber: 1, name: 'Push',
        exercises: [
          { groupId: g1, isSuperset: false, exerciseId: benchPress._id, exerciseName: 'Bench Press', imageUrl: null, isBodyweight: false, sets: 4, repsMin: 6, repsMax: 10, restSeconds: 120 },
          { groupId: g5, isSuperset: false, exerciseId: cableFly._id,   exerciseName: 'Cable Fly',   imageUrl: null, isBodyweight: false, sets: 3, repsMin: 10, repsMax: 15, restSeconds: 60  },
        ],
      },
      {
        dayNumber: 2, name: 'Pull',
        exercises: [
          { groupId: g2, isSuperset: false, exerciseId: deadlift._id, exerciseName: 'Deadlift', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 5, repsMax: 8,  restSeconds: 180 },
          { groupId: g3, isSuperset: false, exerciseId: pullUp._id,   exerciseName: 'Pull-Up',  imageUrl: null, isBodyweight: true,  sets: 3, repsMin: 6, repsMax: 10, restSeconds: 90  },
          { groupId: g6, isSuperset: false, exerciseId: facePull._id, exerciseName: 'Face Pull', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 12, repsMax: 20, restSeconds: 60 },
        ],
      },
      {
        dayNumber: 3, name: 'Legs',
        exercises: [
          { groupId: g4, isSuperset: false, exerciseId: squat._id, exerciseName: 'Squat', imageUrl: null, isBodyweight: false, sets: 4, repsMin: 6, repsMax: 10, restSeconds: 150 },
        ],
      },
    ],
  });

  // GroupIds for Full Body (owner)
  const gA1 = new mongoose.Types.ObjectId().toString(); // Squat      — Day A
  const gA2 = new mongoose.Types.ObjectId().toString(); // Bench Press— Day A
  const gB1 = new mongoose.Types.ObjectId().toString(); // Deadlift   — Day B
  const gB2 = new mongoose.Types.ObjectId().toString(); // Pull-Up    — Day B
  const gC1 = new mongoose.Types.ObjectId().toString(); // Squat      — Day C

  const fullBodyTemplate = await PlanTemplateModel.create({
    name: 'Full Body 3-Day',
    description: 'Beginner-friendly full-body rotation. Perfect for learning the big lifts.',
    createdBy: owner._id,
    days: [
      {
        dayNumber: 1, name: 'Day A',
        exercises: [
          { groupId: gA1, isSuperset: false, exerciseId: squat._id,      exerciseName: 'Squat',       imageUrl: null, isBodyweight: false, sets: 4, repsMin: 8, repsMax: 12, restSeconds: 120 },
          { groupId: gA2, isSuperset: false, exerciseId: benchPress._id, exerciseName: 'Bench Press', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120 },
        ],
      },
      {
        dayNumber: 2, name: 'Day B',
        exercises: [
          { groupId: gB1, isSuperset: false, exerciseId: deadlift._id, exerciseName: 'Deadlift', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 5, repsMax: 8,  restSeconds: 180 },
          { groupId: gB2, isSuperset: false, exerciseId: pullUp._id,   exerciseName: 'Pull-Up',  imageUrl: null, isBodyweight: true,  sets: 3, repsMin: 6, repsMax: 10, restSeconds: 90  },
        ],
      },
      {
        dayNumber: 3, name: 'Day C',
        exercises: [
          { groupId: gC1, isSuperset: false, exerciseId: squat._id, exerciseName: 'Squat', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 10, repsMax: 15, restSeconds: 90 },
        ],
      },
    ],
  });

  // GroupIds for Upper/Lower (trainer)
  const gU1 = new mongoose.Types.ObjectId().toString(); // Bench Press  — Upper A
  const gU2 = new mongoose.Types.ObjectId().toString(); // OHP          — Upper A
  const gU3 = new mongoose.Types.ObjectId().toString(); // Pull-Up      — Upper A
  const gU4 = new mongoose.Types.ObjectId().toString(); // Lat Pulldown — Upper B
  const gU5 = new mongoose.Types.ObjectId().toString(); // Face Pull    — Upper B
  const gL1 = new mongoose.Types.ObjectId().toString(); // Squat        — Lower A
  const gL2 = new mongoose.Types.ObjectId().toString(); // Hip Thrust   — Lower A
  const gL3 = new mongoose.Types.ObjectId().toString(); // Deadlift     — Lower B
  const gL4 = new mongoose.Types.ObjectId().toString(); // Hip Thrust   — Lower B

  await PlanTemplateModel.create({
    name: 'Upper / Lower 4-Day',
    description: 'Intermediate 4-day split alternating upper and lower body. Higher frequency per muscle group than PPL.',
    createdBy: trainer._id,
    days: [
      {
        dayNumber: 1, name: 'Upper A',
        exercises: [
          { groupId: gU1, isSuperset: false, exerciseId: benchPress._id, exerciseName: 'Bench Press',   imageUrl: null, isBodyweight: false, sets: 4, repsMin: 5, repsMax: 8,  restSeconds: 150 },
          { groupId: gU2, isSuperset: false, exerciseId: ohp._id,        exerciseName: 'Overhead Press', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 6, repsMax: 10, restSeconds: 120 },
          { groupId: gU3, isSuperset: false, exerciseId: pullUp._id,     exerciseName: 'Pull-Up',        imageUrl: null, isBodyweight: true,  sets: 3, repsMin: 6, repsMax: 10, restSeconds: 90  },
        ],
      },
      {
        dayNumber: 2, name: 'Lower A',
        exercises: [
          { groupId: gL1, isSuperset: false, exerciseId: squat._id,     exerciseName: 'Squat',     imageUrl: null, isBodyweight: false, sets: 4, repsMin: 5, repsMax: 8,  restSeconds: 180 },
          { groupId: gL2, isSuperset: false, exerciseId: hipThrust._id, exerciseName: 'Hip Thrust', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 90  },
        ],
      },
      {
        dayNumber: 3, name: 'Upper B',
        exercises: [
          { groupId: gU4, isSuperset: false, exerciseId: latPulldown._id, exerciseName: 'Lat Pulldown', imageUrl: null, isBodyweight: false, sets: 4, repsMin: 8, repsMax: 12, restSeconds: 90  },
          { groupId: gU5, isSuperset: false, exerciseId: facePull._id,    exerciseName: 'Face Pull',    imageUrl: null, isBodyweight: false, sets: 3, repsMin: 12, repsMax: 20, restSeconds: 60 },
        ],
      },
      {
        dayNumber: 4, name: 'Lower B',
        exercises: [
          { groupId: gL3, isSuperset: false, exerciseId: deadlift._id,  exerciseName: 'Deadlift',  imageUrl: null, isBodyweight: false, sets: 3, repsMin: 5, repsMax: 8,  restSeconds: 180 },
          { groupId: gL4, isSuperset: false, exerciseId: hipThrust._id, exerciseName: 'Hip Thrust', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 10, repsMax: 15, restSeconds: 90 },
        ],
      },
    ],
  });

  const memberPlan = await MemberPlanModel.create({
    memberId: member._id, trainerId: trainer._id, templateId: pplTemplate._id,
    name: pplTemplate.name, days: pplTemplate.days, isActive: true, assignedAt: daysAgo(45),
  });
  const member2Plan = await MemberPlanModel.create({
    memberId: member2._id, trainerId: owner._id, templateId: fullBodyTemplate._id,
    name: fullBodyTemplate.name, days: fullBodyTemplate.days, isActive: true, assignedAt: daysAgo(20),
  });
  console.log('  ✓ Plan templates: 3 created (PPL, Full Body 3-Day, Upper/Lower 4-Day) + 2 member plans');

  // ── Member Workout Sessions (12 sessions, PPL rotating) ───────────────────
  //   Push (i%3=0): Bench Press + Cable Fly
  //   Pull (i%3=1): Deadlift + Pull-Up + Face Pull
  //   Legs (i%3=2): Squat
  const sessionDays = [42, 39, 35, 32, 28, 25, 21, 18, 14, 11, 7, 4];
  // Weight progression per day type (4 sessions each)
  const benchWeights = [60, 65, 70, 72.5];
  const dlWeights    = [80, 90, 100, 105];
  const squatWeights = [70, 80, 87.5, 92.5];

  const pushRpe:  (number | null)[] = [null, 7, 8, 8];
  const pullRpe:  (number | null)[] = [7, null, 8, 9];
  const legsRpe:  (number | null)[] = [null, 7, 8, 9];
  const pushNote: (string | null)[] = [null, null, 'Felt good, shoulder is holding up', 'Best bench day in months — 72.5 kg for 8'];
  const pullNote: (string | null)[] = [null, null, 'Deadlift back strength improving', 'Finally hit 100+ kg deadlift!'];
  const legsNote: (string | null)[] = [null, null, 'Squats feeling stronger, depth better', 'Hit 92.5 for 8 — new PB!'];

  let pi = 0, li = 0, lgi = 0;
  // Store last session of each type for PBs and exercise notes
  const benchSessionIds: mongoose.Types.ObjectId[] = [];
  const dlSessionIds: mongoose.Types.ObjectId[] = [];
  const squatSessionIds: mongoose.Types.ObjectId[] = [];

  for (const [i, ago] of sessionDays.entries()) {
    const d = daysAgo(ago);
    const dayType = i % 3;

    if (dayType === 0) { // Push
      const w = benchWeights[pi];
      const reps = [8, 8, 7, pi < 2 ? 7 : 6];
      const session = await WorkoutSessionModel.create({
        memberId: member._id, memberPlanId: memberPlan._id,
        dayNumber: 1, dayName: 'Push', startedAt: d, completedAt: d, lastActivityAt: d,
        loggedBy: pi === 3 ? trainer._id : null,
        rpe: pushRpe[pi], memberNote: pushNote[pi],
        sets: [
          makeSet(benchPress._id, 'Bench Press', g1, false, 1, 6, 10, w,       reps[0], d),
          makeSet(benchPress._id, 'Bench Press', g1, false, 2, 6, 10, w,       reps[1], d),
          makeSet(benchPress._id, 'Bench Press', g1, false, 3, 6, 10, w,       reps[2], d),
          makeSet(benchPress._id, 'Bench Press', g1, false, 4, 6, 10, w - 2.5, reps[3], d),
          makeSet(cableFly._id,   'Cable Fly',   g5, false, 1, 10, 15, 15,     12,      d),
          makeSet(cableFly._id,   'Cable Fly',   g5, false, 2, 10, 15, 15,     12,      d),
          makeSet(cableFly._id,   'Cable Fly',   g5, false, 3, 10, 15, 15,     11,      d),
        ],
      });
      benchSessionIds.push(session._id);
      pi++;
    } else if (dayType === 1) { // Pull
      const w = dlWeights[li];
      const dlReps = li < 2 ? [6, 5, 5] : [5, 5, 5];
      const puReps = [8 + li, 7 + li, 6 + li];
      const session = await WorkoutSessionModel.create({
        memberId: member._id, memberPlanId: memberPlan._id,
        dayNumber: 2, dayName: 'Pull', startedAt: d, completedAt: d, lastActivityAt: d,
        loggedBy: li === 3 ? trainer._id : null,
        rpe: pullRpe[li], memberNote: pullNote[li],
        sets: [
          makeSet(deadlift._id, 'Deadlift', g2, false, 1, 5, 8, w,     dlReps[0], d),
          makeSet(deadlift._id, 'Deadlift', g2, false, 2, 5, 8, w,     dlReps[1], d),
          makeSet(deadlift._id, 'Deadlift', g2, false, 3, 5, 8, w - 5, dlReps[2], d),
          makeSet(pullUp._id,   'Pull-Up',  g3, true,  1, 6, 10, null, puReps[0], d),
          makeSet(pullUp._id,   'Pull-Up',  g3, true,  2, 6, 10, null, puReps[1], d),
          makeSet(pullUp._id,   'Pull-Up',  g3, true,  3, 6, 10, null, puReps[2], d),
          makeSet(facePull._id, 'Face Pull',g6, false, 1, 12, 20, 20,  15,        d),
          makeSet(facePull._id, 'Face Pull',g6, false, 2, 12, 20, 20,  14,        d),
          makeSet(facePull._id, 'Face Pull',g6, false, 3, 12, 20, 17.5,13,        d),
        ],
      });
      dlSessionIds.push(session._id);
      li++;
    } else { // Legs
      const w = squatWeights[lgi];
      const reps = [8, 8, lgi < 2 ? 8 : 7, lgi < 1 ? 7 : 6];
      const session = await WorkoutSessionModel.create({
        memberId: member._id, memberPlanId: memberPlan._id,
        dayNumber: 3, dayName: 'Legs', startedAt: d, completedAt: d, lastActivityAt: d,
        rpe: legsRpe[lgi], memberNote: legsNote[lgi],
        sets: [
          makeSet(squat._id, 'Squat', g4, false, 1, 6, 10, w,     reps[0], d),
          makeSet(squat._id, 'Squat', g4, false, 2, 6, 10, w,     reps[1], d),
          makeSet(squat._id, 'Squat', g4, false, 3, 6, 10, w,     reps[2], d),
          makeSet(squat._id, 'Squat', g4, false, 4, 6, 10, w - 5, reps[3], d),
        ],
      });
      squatSessionIds.push(session._id);
      lgi++;
    }
  }
  console.log('  ✓ Member workout sessions: 12 created (Push/Pull/Legs, correct exercises per day)');

  // ── Personal Bests for member ──────────────────────────────────────────────
  // Bench: best at 4th Push session (i=9, daysAgo 11), 72.5 kg × 8
  // Deadlift: best at 4th Pull session (i=10, daysAgo 7), 105 kg × 5
  // Squat: best at 4th Legs session (i=11, daysAgo 4), 92.5 kg × 8
  await Promise.all([
    PersonalBestModel.create({
      memberId: member._id, exerciseId: benchPress._id, exerciseName: 'Bench Press',
      bestWeight: 72.5, bestReps: 8, estimatedOneRM: epley1RM(72.5, 8),
      achievedAt: daysAgo(11), sessionId: benchSessionIds[3],
    }),
    PersonalBestModel.create({
      memberId: member._id, exerciseId: deadlift._id, exerciseName: 'Deadlift',
      bestWeight: 105, bestReps: 5, estimatedOneRM: epley1RM(105, 5),
      achievedAt: daysAgo(7), sessionId: dlSessionIds[3],
    }),
    PersonalBestModel.create({
      memberId: member._id, exerciseId: squat._id, exerciseName: 'Squat',
      bestWeight: 92.5, bestReps: 8, estimatedOneRM: epley1RM(92.5, 8),
      achievedAt: daysAgo(4), sessionId: squatSessionIds[3],
    }),
  ]);
  // Pull-Up PB: bodyweight — best set is 10 reps in the last Pull session
  await PersonalBestModel.create({
    memberId: member._id, exerciseId: pullUp._id, exerciseName: 'Pull-Up',
    bestWeight: 0, bestReps: 10, estimatedOneRM: 0,
    achievedAt: daysAgo(7), sessionId: dlSessionIds[dlSessionIds.length - 1],
  });
  console.log('  ✓ Member PBs: Bench 72.5 kg | Deadlift 105 kg | Squat 92.5 kg | Pull-Up 10 reps');

  // ── Member2 Workout Sessions (4 sessions, Full Body) ──────────────────────
  // Day A (i%3=0): Squat + Bench Press
  // Day B (i%3=1): Deadlift + Pull-Up
  // Day C (i%3=2): Squat only
  const m2Sessions = [
    { ago: 15, dayNum: 1, dayName: 'Day A' },
    { ago: 11, dayNum: 2, dayName: 'Day B' },
    { ago: 7,  dayNum: 3, dayName: 'Day C' },
    { ago: 3,  dayNum: 1, dayName: 'Day A' },
  ];
  const m2SquatW  = [45, null, 47.5, 50];   // null on Day B
  const m2BenchW  = [35, null, null,  37.5]; // only on Day A
  const m2DlW     = [null, 55, null, null];  // only on Day B
  const m2Notes: (string | null)[] = [
    'First Day A — learning the form', null, 'Squats felt better this time', null,
  ];
  const m2Rpe: (number | null)[] = [6, 7, 6, 7];

  const m2SquatSessionIds: mongoose.Types.ObjectId[] = [];
  const m2BenchSessionIds: mongoose.Types.ObjectId[] = [];
  const m2DlSessionIds: mongoose.Types.ObjectId[] = [];

  for (let idx = 0; idx < m2Sessions.length; idx++) {
    const { ago, dayNum, dayName } = m2Sessions[idx];
    const d = daysAgo(ago);
    const sets = [];

    if (dayNum === 1) { // Day A: Squat + Bench
      const sw = m2SquatW[idx]!;
      const bw = m2BenchW[idx]!;
      sets.push(
        makeSet(squat._id,      'Squat',       gA1, false, 1, 8, 12, sw,      8, d),
        makeSet(squat._id,      'Squat',       gA1, false, 2, 8, 12, sw,      8, d),
        makeSet(squat._id,      'Squat',       gA1, false, 3, 8, 12, sw,      7, d),
        makeSet(squat._id,      'Squat',       gA1, false, 4, 8, 12, sw - 5,  7, d),
        makeSet(benchPress._id, 'Bench Press', gA2, false, 1, 8, 12, bw,      8, d),
        makeSet(benchPress._id, 'Bench Press', gA2, false, 2, 8, 12, bw,      8, d),
        makeSet(benchPress._id, 'Bench Press', gA2, false, 3, 8, 12, bw - 2.5,7, d),
      );
    } else if (dayNum === 2) { // Day B: Deadlift + Pull-Up
      const dw = m2DlW[idx]!;
      sets.push(
        makeSet(deadlift._id, 'Deadlift', gB1, false, 1, 5, 8, dw,     6,    d),
        makeSet(deadlift._id, 'Deadlift', gB1, false, 2, 5, 8, dw,     5,    d),
        makeSet(deadlift._id, 'Deadlift', gB1, false, 3, 5, 8, dw - 5, 5,    d),
        makeSet(pullUp._id,   'Pull-Up',  gB2, true,  1, 6, 10, null,  6,    d),
        makeSet(pullUp._id,   'Pull-Up',  gB2, true,  2, 6, 10, null,  5,    d),
        makeSet(pullUp._id,   'Pull-Up',  gB2, true,  3, 6, 10, null,  4,    d),
      );
    } else { // Day C: Squat
      const sw = m2SquatW[idx]!;
      sets.push(
        makeSet(squat._id, 'Squat', gC1, false, 1, 10, 15, sw,     10, d),
        makeSet(squat._id, 'Squat', gC1, false, 2, 10, 15, sw,     9,  d),
        makeSet(squat._id, 'Squat', gC1, false, 3, 10, 15, sw - 5, 9,  d),
      );
    }

    const session = await WorkoutSessionModel.create({
      memberId: member2._id, memberPlanId: member2Plan._id,
      dayNumber: dayNum, dayName, startedAt: d, completedAt: d, lastActivityAt: d,
      loggedBy: idx === 3 ? owner._id : null,
      rpe: m2Rpe[idx], memberNote: m2Notes[idx], sets,
    });

    if (dayNum === 1) { m2SquatSessionIds.push(session._id); m2BenchSessionIds.push(session._id); }
    if (dayNum === 2) m2DlSessionIds.push(session._id);
    if (dayNum === 3) m2SquatSessionIds.push(session._id);
  }
  console.log('  ✓ Member2 workout sessions: 4 created (with actual sets)');

  // ── Trainer Self-Tracking Sessions (SelfWorkoutLog) ───────────────────────
  // 8 completed freestyle sessions over the past 4 weeks — Push/Pull/Legs rotation.
  // Trainer lifts at intermediate-to-advanced level (CSCS, 5+ years coaching).
  const trainerSessions = [
    { ago: 28, dayName: 'Push',      rpe: 8,    note: 'Bench felt great today, new top set' },
    { ago: 25, dayName: 'Pull',      rpe: 7,    note: null },
    { ago: 21, dayName: 'Legs',      rpe: 8,    note: 'Hip thrust is really helping squat lockout' },
    { ago: 18, dayName: 'Push',      rpe: 9,    note: 'Pushed hard — left shoulder a bit tight at end' },
    { ago: 14, dayName: 'Pull',      rpe: 7,    note: null },
    { ago: 11, dayName: 'Legs',      rpe: 8,    note: 'New squat PB — 127.5 for 5' },
    { ago:  7, dayName: 'Push',      rpe: 8,    note: null },
    { ago:  3, dayName: 'Pull',      rpe: 7,    note: 'Deadlift technique improving — smoother off the floor' },
  ];
  const benchWeightsT = [102.5, 102.5, 105.0, 105.0, 107.5, 107.5, 110.0, 110.0];
  const dlWeightsT    = [140.0, 140.0, 142.5, 142.5, 145.0, 145.0, 147.5, 147.5];
  const squatWeightsT = [120.0, 120.0, 122.5, 122.5, 125.0, 125.0, 127.5, 127.5];
  let tPush = 0, tPull = 0, tLegs = 0;
  for (const s of trainerSessions) {
    const d = daysAgo(s.ago);
    const sg1 = new mongoose.Types.ObjectId().toString();
    const sg2 = new mongoose.Types.ObjectId().toString();
    const sg3 = new mongoose.Types.ObjectId().toString();
    let sets: ReturnType<typeof makeSelfSet>[] = [];
    if (s.dayName === 'Push') {
      const w = benchWeightsT[tPush];
      sets = [
        makeSelfSet(benchPress._id, 'Bench Press',   sg1, false, 1, w,    6, d),
        makeSelfSet(benchPress._id, 'Bench Press',   sg1, false, 2, w,    6, d),
        makeSelfSet(benchPress._id, 'Bench Press',   sg1, false, 3, w,    5, d),
        makeSelfSet(benchPress._id, 'Bench Press',   sg1, false, 4, w,    5, d),
        makeSelfSet(ohp._id,        'Overhead Press', sg2, false, 1, 72.5, 8, d),
        makeSelfSet(ohp._id,        'Overhead Press', sg2, false, 2, 72.5, 8, d),
        makeSelfSet(ohp._id,        'Overhead Press', sg2, false, 3, 72.5, 7, d),
        makeSelfSet(cableFly._id,   'Cable Fly',      sg3, false, 1, 22.5, 12, d),
        makeSelfSet(cableFly._id,   'Cable Fly',      sg3, false, 2, 22.5, 12, d),
        makeSelfSet(cableFly._id,   'Cable Fly',      sg3, false, 3, 22.5, 11, d),
      ];
      tPush++;
    } else if (s.dayName === 'Pull') {
      const w = dlWeightsT[tPull];
      sets = [
        makeSelfSet(deadlift._id,    'Deadlift',     sg1, false, 1, w,    5, d),
        makeSelfSet(deadlift._id,    'Deadlift',     sg1, false, 2, w,    5, d),
        makeSelfSet(deadlift._id,    'Deadlift',     sg1, false, 3, w,    5, d),
        makeSelfSet(latPulldown._id, 'Lat Pulldown', sg2, false, 1, 80.0, 10, d),
        makeSelfSet(latPulldown._id, 'Lat Pulldown', sg2, false, 2, 80.0, 10, d),
        makeSelfSet(latPulldown._id, 'Lat Pulldown', sg2, false, 3, 80.0,  9, d),
        makeSelfSet(facePull._id,    'Face Pull',    sg3, false, 1, 25.0, 15, d),
        makeSelfSet(facePull._id,    'Face Pull',    sg3, false, 2, 25.0, 15, d),
        makeSelfSet(facePull._id,    'Face Pull',    sg3, false, 3, 25.0, 14, d),
      ];
      tPull++;
    } else {
      const w = squatWeightsT[tLegs];
      sets = [
        makeSelfSet(squat._id,     'Squat',      sg1, false, 1, w,     6, d),
        makeSelfSet(squat._id,     'Squat',      sg1, false, 2, w,     6, d),
        makeSelfSet(squat._id,     'Squat',      sg1, false, 3, w,     5, d),
        makeSelfSet(squat._id,     'Squat',      sg1, false, 4, w,     5, d),
        makeSelfSet(hipThrust._id, 'Hip Thrust', sg2, false, 1, 100.0, 10, d),
        makeSelfSet(hipThrust._id, 'Hip Thrust', sg2, false, 2, 102.5, 10, d),
        makeSelfSet(hipThrust._id, 'Hip Thrust', sg2, false, 3, 102.5,  9, d),
      ];
      tLegs++;
    }
    await SelfWorkoutLogModel.create({
      userId: trainer._id,
      startedAt: d, completedAt: d, lastActivityAt: d,
      autoSealed: false,
      sourceTemplateId: null, sourceTemplateDayNumber: null,
      dayName: s.dayName, sets, rpe: s.rpe, note: s.note,
    });
  }
  console.log('  ✓ Trainer self-tracking sessions: 8 created (Push/Pull/Legs, 28-day history)');

  // ── Owner Self-Tracking Sessions ──────────────────────────────────────────
  // 3 completed sessions — Upper/Lower style. Owner has 20 years of training.
  const ownerSelfSessions = [
    { ago: 19, dayName: 'Upper A', sets: [
      makeSelfSet(benchPress._id, 'Bench Press',   new mongoose.Types.ObjectId().toString(), false, 1, 115, 5, daysAgo(19)),
      makeSelfSet(benchPress._id, 'Bench Press',   new mongoose.Types.ObjectId().toString(), false, 2, 115, 5, daysAgo(19)),
      makeSelfSet(benchPress._id, 'Bench Press',   new mongoose.Types.ObjectId().toString(), false, 3, 115, 4, daysAgo(19)),
      makeSelfSet(pullUp._id,     'Pull-Up',        new mongoose.Types.ObjectId().toString(), true,  1, null, 8, daysAgo(19)),
      makeSelfSet(pullUp._id,     'Pull-Up',        new mongoose.Types.ObjectId().toString(), true,  2, null, 8, daysAgo(19)),
      makeSelfSet(pullUp._id,     'Pull-Up',        new mongoose.Types.ObjectId().toString(), true,  3, null, 7, daysAgo(19)),
    ], rpe: 8, note: null },
    { ago: 12, dayName: 'Lower', sets: [
      makeSelfSet(squat._id,     'Squat',      new mongoose.Types.ObjectId().toString(), false, 1, 130, 5, daysAgo(12)),
      makeSelfSet(squat._id,     'Squat',      new mongoose.Types.ObjectId().toString(), false, 2, 130, 5, daysAgo(12)),
      makeSelfSet(squat._id,     'Squat',      new mongoose.Types.ObjectId().toString(), false, 3, 130, 5, daysAgo(12)),
      makeSelfSet(squat._id,     'Squat',      new mongoose.Types.ObjectId().toString(), false, 4, 130, 4, daysAgo(12)),
      makeSelfSet(hipThrust._id, 'Hip Thrust', new mongoose.Types.ObjectId().toString(), false, 1, 110, 8, daysAgo(12)),
      makeSelfSet(hipThrust._id, 'Hip Thrust', new mongoose.Types.ObjectId().toString(), false, 2, 112.5, 8, daysAgo(12)),
      makeSelfSet(hipThrust._id, 'Hip Thrust', new mongoose.Types.ObjectId().toString(), false, 3, 112.5, 7, daysAgo(12)),
    ], rpe: 9, note: 'Legs are responding well to the higher frequency' },
    { ago:  5, dayName: 'Upper B', sets: [
      makeSelfSet(ohp._id,      'Overhead Press', new mongoose.Types.ObjectId().toString(), false, 1, 87.5, 5, daysAgo(5)),
      makeSelfSet(ohp._id,      'Overhead Press', new mongoose.Types.ObjectId().toString(), false, 2, 87.5, 5, daysAgo(5)),
      makeSelfSet(ohp._id,      'Overhead Press', new mongoose.Types.ObjectId().toString(), false, 3, 87.5, 4, daysAgo(5)),
      makeSelfSet(pullUp._id,   'Pull-Up',        new mongoose.Types.ObjectId().toString(), true,  1, null,  9, daysAgo(5)),
      makeSelfSet(pullUp._id,   'Pull-Up',        new mongoose.Types.ObjectId().toString(), true,  2, null,  9, daysAgo(5)),
      makeSelfSet(facePull._id, 'Face Pull',      new mongoose.Types.ObjectId().toString(), false, 1, 27.5, 12, daysAgo(5)),
      makeSelfSet(facePull._id, 'Face Pull',      new mongoose.Types.ObjectId().toString(), false, 2, 27.5, 12, daysAgo(5)),
    ], rpe: 7, note: null },
  ];
  for (const s of ownerSelfSessions) {
    const d = daysAgo(s.ago);
    await SelfWorkoutLogModel.create({
      userId: owner._id,
      startedAt: d, completedAt: d, lastActivityAt: d,
      autoSealed: false,
      sourceTemplateId: null, sourceTemplateDayNumber: null,
      dayName: s.dayName, sets: s.sets, rpe: s.rpe, note: s.note,
    });
  }
  console.log('  ✓ Owner self-tracking sessions: 3 created (Upper/Lower, 19-day history)');

  // ── Personal Bests for member2 ─────────────────────────────────────────────
  // Squat: 50 kg at 2nd Day A (session idx=3, daysAgo 3)
  // Bench: 37.5 kg at 2nd Day A
  // Deadlift: 55 kg at Day B (session idx=1, daysAgo 11)
  await Promise.all([
    PersonalBestModel.create({
      memberId: member2._id, exerciseId: squat._id, exerciseName: 'Squat',
      bestWeight: 50, bestReps: 8, estimatedOneRM: epley1RM(50, 8),
      achievedAt: daysAgo(3), sessionId: m2SquatSessionIds[m2SquatSessionIds.length - 1],
    }),
    PersonalBestModel.create({
      memberId: member2._id, exerciseId: benchPress._id, exerciseName: 'Bench Press',
      bestWeight: 37.5, bestReps: 8, estimatedOneRM: epley1RM(37.5, 8),
      achievedAt: daysAgo(3), sessionId: m2BenchSessionIds[m2BenchSessionIds.length - 1],
    }),
    PersonalBestModel.create({
      memberId: member2._id, exerciseId: deadlift._id, exerciseName: 'Deadlift',
      bestWeight: 55, bestReps: 6, estimatedOneRM: epley1RM(55, 6),
      achievedAt: daysAgo(11), sessionId: m2DlSessionIds[0],
    }),
  ]);
  console.log('  ✓ Member2 PBs: Squat 50 kg | Bench 37.5 kg | Deadlift 55 kg');

  // ── Exercise Notes ─────────────────────────────────────────────────────────
  await Promise.all([
    ExerciseNoteModel.create({
      memberId: member._id, exerciseId: benchPress._id, exerciseName: 'Bench Press', trainerId: trainer._id,
      entries: [
        { content: 'Elbows slightly flaring. Cue: think "bend the bar". Tuck elbows to 45°.',                    sessionId: benchSessionIds[1], createdAt: daysAgo(32) },
        { content: 'Arch and leg drive looking much better. Keep chest high at unrack.',                          sessionId: benchSessionIds[2], createdAt: daysAgo(21) },
        { content: 'Excellent session — bar path and control are on point. Keep the same setup next week.',       sessionId: benchSessionIds[3], createdAt: daysAgo(11) },
      ],
    }),
    ExerciseNoteModel.create({
      memberId: member._id, exerciseId: deadlift._id, exerciseName: 'Deadlift', trainerId: trainer._id,
      entries: [
        { content: 'Lower back rounding slightly past knee. Cue: big chest before you pull, push floor away.',   sessionId: dlSessionIds[1], createdAt: daysAgo(28) },
        { content: 'Lockout looking solid. Hinge is much cleaner. Try 100 kg next Pull session.',                 sessionId: dlSessionIds[2], createdAt: daysAgo(18) },
        { content: 'Hit 105 kg for 5 — phenomenal. Start working sumo stance as a variation.',                   sessionId: dlSessionIds[3], createdAt: daysAgo(7)  },
      ],
    }),
    ExerciseNoteModel.create({
      memberId: member._id, exerciseId: squat._id, exerciseName: 'Squat', trainerId: trainer._id,
      entries: [
        { content: 'Heels slightly rising at depth. Try elevating heels 1 cm, or work ankle mobility.',          sessionId: squatSessionIds[1], createdAt: daysAgo(25) },
        { content: 'Heel cue fixed. Depth is much better. Knees tracking well over toes.',                       sessionId: squatSessionIds[2], createdAt: daysAgo(14) },
        { content: 'Hit 92.5 for 8 — new PB. Upper back staying tall throughout. Elite progress this block.',    sessionId: squatSessionIds[3], createdAt: daysAgo(4)  },
      ],
    }),
    ExerciseNoteModel.create({
      memberId: member2._id, exerciseId: squat._id, exerciseName: 'Squat', trainerId: owner._id,
      entries: [
        { content: 'Good first attempt! Work on keeping chest up. Try goblet squat for depth drill.',            sessionId: m2SquatSessionIds[0], createdAt: daysAgo(15) },
        { content: 'Noticeable improvement in depth and chest position. Increased load to 50 kg — handled well.',sessionId: m2SquatSessionIds[m2SquatSessionIds.length - 1], createdAt: daysAgo(3) },
      ],
    }),
  ]);
  console.log('  ✓ Exercise notes: Bench/Deadlift/Squat for member, Squat for member2');

  // ── Nutrition Templates + Plans ────────────────────────────────────────────
  const nutritionTemplate = await NutritionTemplateModel.create({
    name: 'Lean Bulk — 2800 kcal',
    description: 'Moderate surplus with high protein. Training days higher carb, rest days lower.',
    createdBy: trainer._id,
    dayTypes: [
      {
        name: 'Training Day',
        meals: [
          { name: 'Breakfast', order: 1, items: [
            withExtras({ foodName: 'Rolled Oats',   quantityG: 80,  kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6  }),
            withExtras({ foodName: 'Whole Egg',     quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7,  fat: 16.5 }),
          ]},
          { name: 'Lunch', order: 2, items: [
            withExtras({ foodName: 'White Rice',    quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0,fat: 1.4  }),
            withExtras({ foodName: 'Chicken Breast',quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0,  fat: 7.2  }),
          ]},
          { name: 'Dinner', order: 3, items: [
            withExtras({ foodName: 'White Rice',    quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5,fat: 1.1  }),
            withExtras({ foodName: 'Chicken Breast',quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0,  fat: 5.4  }),
          ]},
        ],
      },
      {
        name: 'Rest Day',
        meals: [
          { name: 'Breakfast', order: 1, items: [
            withExtras({ foodName: 'Rolled Oats',   quantityG: 60, kcal: 233, protein: 10.2, carbs: 39.6, fat: 4.2  }),
            withExtras({ foodName: 'Whole Egg',     quantityG: 120,kcal: 186, protein: 15.6, carbs: 1.3,  fat: 13.2 }),
          ]},
          { name: 'Lunch', order: 2, items: [
            withExtras({ foodName: 'White Rice',    quantityG: 150,kcal: 548, protein: 10.7, carbs: 118.5,fat: 1.1  }),
            withExtras({ foodName: 'Chicken Breast',quantityG: 180,kcal: 297, protein: 55.8, carbs: 0.0,  fat: 6.5  }),
          ]},
        ],
      },
    ],
  });

  const nextMonIso = mondayAt(0).toISOString().slice(0, 10);

  const memberNutritionPlan = await MemberNutritionPlanModel.create({
    memberId: member._id, assignedById: trainer._id, templateId: nutritionTemplate._id,
    name: nutritionTemplate.name, isActive: true, assignedAt: daysAgo(30),
    dayTypes: nutritionTemplate.dayTypes,
    schedule: {
      weeklyPattern: [
        { dayOfWeek: 1, dayTypeName: 'Training Day' },
        { dayOfWeek: 2, dayTypeName: 'Rest Day' },
        { dayOfWeek: 3, dayTypeName: 'Training Day' },
        { dayOfWeek: 4, dayTypeName: 'Rest Day' },
        { dayOfWeek: 5, dayTypeName: 'Training Day' },
        { dayOfWeek: 6, dayTypeName: 'Rest Day' },
        { dayOfWeek: 0, dayTypeName: 'Rest Day' },
      ],
      calendarOverrides: [
        // Next Monday overridden to Rest Day — simulating a deload week
        { date: nextMonIso, dayTypeName: 'Rest Day' },
      ],
      iterate: true,
    },
  });

  const ownerNutritionTemplate = await NutritionTemplateModel.create({
    name: 'Cutting Plan — 1800 kcal',
    description: 'Moderate deficit, high protein. Suitable for fat loss phase.',
    createdBy: owner._id,
    dayTypes: [
      {
        name: 'Training Day',
        meals: [
          { name: 'Breakfast', order: 1, items: [
            withExtras({ foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18,   carbs: 8,   fat: 0.8  }),
            withExtras({ foodName: 'Blueberries',   quantityG: 100, kcal: 57,  protein: 0.7,  carbs: 14,  fat: 0.3  }),
            withExtras({ foodName: 'Whey Protein',  quantityG: 30,  kcal: 117, protein: 24,   carbs: 2.5, fat: 1.2  }),
          ]},
          { name: 'Lunch', order: 2, items: [
            withExtras({ foodName: 'Chicken Breast',quantityG: 150, kcal: 248, protein: 46.5, carbs: 0,   fat: 5.4  }),
            withExtras({ foodName: 'Sweet Potato',  quantityG: 200, kcal: 172, protein: 3.2,  carbs: 41,  fat: 0.2  }),
            withExtras({ foodName: 'Mixed Greens',  quantityG: 100, kcal: 23,  protein: 2.2,  carbs: 3.6, fat: 0.4  }),
          ]},
          { name: 'Dinner', order: 3, items: [
            withExtras({ foodName: 'Salmon Fillet', quantityG: 150, kcal: 312, protein: 31.5, carbs: 0,   fat: 19.5 }),
            withExtras({ foodName: 'Brown Rice',    quantityG: 120, kcal: 135, protein: 2.8,  carbs: 28.5,fat: 1.1  }),
          ]},
        ],
      },
      {
        name: 'Rest Day',
        meals: [
          { name: 'Breakfast', order: 1, items: [
            withExtras({ foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18,   carbs: 8,   fat: 0.8  }),
            withExtras({ foodName: 'Almonds',       quantityG: 30,  kcal: 174, protein: 6.4,  carbs: 6.5, fat: 15   }),
          ]},
          { name: 'Lunch', order: 2, items: [
            withExtras({ foodName: 'Tuna',          quantityG: 120, kcal: 132, protein: 30,   carbs: 0,   fat: 1.1  }),
            withExtras({ foodName: 'Mixed Greens',  quantityG: 150, kcal: 35,  protein: 3.3,  carbs: 5.4, fat: 0.6  }),
          ]},
        ],
      },
    ],
  });

  const member2NutritionPlan = await MemberNutritionPlanModel.create({
    memberId: member2._id, assignedById: owner._id, templateId: ownerNutritionTemplate._id,
    name: ownerNutritionTemplate.name, isActive: true, assignedAt: daysAgo(18),
    dayTypes: ownerNutritionTemplate.dayTypes,
    schedule: {
      weeklyPattern: [
        { dayOfWeek: 1, dayTypeName: 'Training Day' },
        { dayOfWeek: 2, dayTypeName: 'Rest Day' },
        { dayOfWeek: 3, dayTypeName: 'Training Day' },
        { dayOfWeek: 4, dayTypeName: 'Rest Day' },
        { dayOfWeek: 5, dayTypeName: 'Training Day' },
        { dayOfWeek: 6, dayTypeName: 'Rest Day' },
        { dayOfWeek: 0, dayTypeName: 'Rest Day' },
      ],
      calendarOverrides: [],
      iterate: true,
    },
  });
  console.log('  ✓ Nutrition templates + plans: 2 each created');

  // ── Custom Foods ───────────────────────────────────────────────────────────
  await FoodModel.create([
    // Trainer foods
    { createdBy: trainer._id, name: 'Coles Chicken Breast 100g Pack', brand: 'Coles',
      macrosPer100g: { ...FOOD_EXTRAS_PER_100G['Coles Chicken Breast 100g Pack'], kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
      servings: [{ label: '100 g', grams: 100 }, { label: 'Whole pack 500 g', grams: 500 }] },
    { createdBy: trainer._id, name: 'Woolworths Rolled Oats', brand: 'Woolworths',
      macrosPer100g: { ...FOOD_EXTRAS_PER_100G['Woolworths Rolled Oats'], kcal: 389, protein: 17, carbs: 58, fat: 7 },
      servings: [{ label: '40 g serving', grams: 40 }, { label: '80 g serving', grams: 80 }] },
    { createdBy: trainer._id, name: 'Tip Top Wholemeal Bread', brand: 'Tip Top',
      macrosPer100g: { ...FOOD_EXTRAS_PER_100G['Tip Top Wholemeal Bread'], kcal: 244, protein: 10, carbs: 40, fat: 3.8 },
      servings: [{ label: '1 slice (40 g)', grams: 40 }, { label: '2 slices (80 g)', grams: 80 }] },
    { createdBy: trainer._id, name: 'Bega Cheese', brand: 'Bega',
      macrosPer100g: { ...FOOD_EXTRAS_PER_100G['Bega Cheese'], kcal: 395, protein: 24, carbs: 0.2, fat: 33 },
      servings: [{ label: '20 g slice', grams: 20 }, { label: '40 g serve', grams: 40 }] },
    { createdBy: trainer._id, name: 'Vegemite', brand: 'Bega',
      macrosPer100g: { ...FOOD_EXTRAS_PER_100G['Vegemite'], kcal: 185, protein: 27, carbs: 15, fat: 0.6 },
      servings: [{ label: '5 g serve', grams: 5 }] },
    { createdBy: trainer._id, name: 'Brown Rice (dry)', brand: null,
      macrosPer100g: { ...FOOD_EXTRAS_PER_100G['Brown Rice'], kcal: 370, protein: 7.9, carbs: 77, fat: 2.9 },
      servings: [{ label: '75 g dry', grams: 75 }, { label: '150 g dry', grams: 150 }] },
    // Owner foods
    { createdBy: owner._id, name: 'Reset Whey Protein', brand: 'Reset Nutrition',
      macrosPer100g: { ...FOOD_EXTRAS_PER_100G['Reset Whey Protein'], kcal: 390, protein: 75, carbs: 8, fat: 6 },
      servings: [{ label: '30 g scoop', grams: 30 }] },
    { createdBy: owner._id, name: 'Premium Almonds', brand: null,
      macrosPer100g: { ...FOOD_EXTRAS_PER_100G['Premium Almonds'], kcal: 579, protein: 21, carbs: 22, fat: 50 },
      servings: [{ label: '30 g handful', grams: 30 }] },
    { createdBy: owner._id, name: 'MCT Oil', brand: null,
      macrosPer100g: { ...FOOD_EXTRAS_PER_100G['MCT Oil'], kcal: 870, protein: 0, carbs: 0, fat: 97 },
      servings: [{ label: '1 tbsp (15 g)', grams: 15 }] },
    { createdBy: owner._id, name: 'Salmon Fillet (fresh)', brand: null,
      macrosPer100g: { ...FOOD_EXTRAS_PER_100G['Salmon Fillet'], kcal: 208, protein: 21, carbs: 0, fat: 13 },
      servings: [{ label: '150 g fillet', grams: 150 }, { label: '200 g fillet', grams: 200 }] },
  ]);
  console.log('  ✓ Custom foods: 6 trainer + 4 owner created');

  // ── Member Nutrition Daily Logs (7 days) ───────────────────────────────────
  await NutritionDailyLogModel.create([
    // Day 0 — today: breakfast done, rest pending
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(0), dayTypeName: memberDayType(0), dayCompleted: false,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          withExtras({ foodName: 'Rolled Oats',   quantityG: 80,  kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6  }),
          withExtras({ foodName: 'Whole Egg',     quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7,  fat: 16.5 }),
        ]},
        { name: 'Lunch',    order: 2, completed: false, items: [
          withExtras({ foodName: 'White Rice',    quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0,fat: 1.4  }),
          withExtras({ foodName: 'Chicken Breast',quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0,  fat: 7.2  }),
        ]},
        { name: 'Dinner',   order: 3, completed: false, items: [
          withExtras({ foodName: 'White Rice',    quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5,fat: 1.1  }),
          withExtras({ foodName: 'Chicken Breast',quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0,  fat: 5.4  }),
        ]},
      ],
    },
    // Day 1 — yesterday: all complete
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(1), dayTypeName: memberDayType(1), dayCompleted: true,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          withExtras({ foodName: 'Rolled Oats',   quantityG: 80,  kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6  }),
          withExtras({ foodName: 'Whole Egg',     quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7,  fat: 16.5 }),
        ]},
        { name: 'Lunch',    order: 2, completed: true, items: [
          withExtras({ foodName: 'White Rice',    quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0,fat: 1.4  }),
          withExtras({ foodName: 'Chicken Breast',quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0,  fat: 7.2  }),
        ]},
        { name: 'Dinner',   order: 3, completed: true, items: [
          withExtras({ foodName: 'White Rice',    quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5,fat: 1.1  }),
          withExtras({ foodName: 'Chicken Breast',quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0,  fat: 5.4  }),
        ]},
      ],
    },
    // Day 2 — member subbed lunch: bread + cheese instead of rice
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(2), dayTypeName: memberDayType(2), dayCompleted: false,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          withExtras({ foodName: 'Rolled Oats',   quantityG: 80,  kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6  }),
          withExtras({ foodName: 'Whole Egg',     quantityG: 120, kcal: 186, protein: 15.6, carbs: 1.3,  fat: 13.2 }),
        ]},
        { name: 'Lunch',    order: 2, completed: true, items: [
          withExtras({ foodName: 'Tip Top Wholemeal Bread',       quantityG: 80,  kcal: 195, protein: 8.0,  carbs: 32.0, fat: 3.0, fiber: 4.6 }),
          withExtras({ foodName: 'Bega Cheese',                   quantityG: 40,  kcal: 158, protein: 9.6,  carbs: 0.1,  fat: 13.2 }),
          withExtras({ foodName: 'Coles Chicken Breast 100g Pack',quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0,  fat: 5.4  }),
        ]},
        { name: 'Dinner',   order: 3, completed: false, items: [
          withExtras({ foodName: 'White Rice',    quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5,fat: 1.1  }),
          withExtras({ foodName: 'Chicken Breast',quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0,  fat: 5.4  }),
        ]},
      ],
    },
    // Day 3 — rest day, both meals done
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(3), dayTypeName: memberDayType(3), dayCompleted: true,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          withExtras({ foodName: 'Rolled Oats',   quantityG: 60, kcal: 233, protein: 10.2, carbs: 39.6, fat: 4.2  }),
          withExtras({ foodName: 'Whole Egg',     quantityG: 120,kcal: 186, protein: 15.6, carbs: 1.3,  fat: 13.2 }),
        ]},
        { name: 'Lunch',    order: 2, completed: true, items: [
          withExtras({ foodName: 'White Rice',    quantityG: 150,kcal: 548, protein: 10.7, carbs: 118.5,fat: 1.1  }),
          withExtras({ foodName: 'Chicken Breast',quantityG: 180,kcal: 297, protein: 55.8, carbs: 0.0,  fat: 6.5  }),
        ]},
      ],
    },
    // Day 4 — added a protein shake to breakfast
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(4), dayTypeName: memberDayType(4), dayCompleted: false,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          withExtras({ foodName: 'Rolled Oats',    quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6  }),
          withExtras({ foodName: 'Whole Egg',      quantityG: 150,kcal: 233, protein: 19.5, carbs: 1.7,  fat: 16.5 }),
          withExtras({ foodName: 'Reset Whey Protein',quantityG: 30,kcal: 117,protein: 22.5,carbs: 2.4,  fat: 1.8  }),
        ]},
        { name: 'Lunch',    order: 2, completed: false, items: [
          withExtras({ foodName: 'White Rice',     quantityG: 200,kcal: 730, protein: 14.2, carbs: 158.0,fat: 1.4  }),
          withExtras({ foodName: 'Chicken Breast', quantityG: 200,kcal: 330, protein: 62.0, carbs: 0.0,  fat: 7.2  }),
        ]},
        { name: 'Dinner',   order: 3, completed: false, items: [
          withExtras({ foodName: 'White Rice',     quantityG: 150,kcal: 548, protein: 10.7, carbs: 118.5,fat: 1.1  }),
          withExtras({ foodName: 'Chicken Breast', quantityG: 150,kcal: 248, protein: 46.5, carbs: 0.0,  fat: 5.4  }),
        ]},
      ],
    },
    // Day 5 — fully complete
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(5), dayTypeName: memberDayType(5), dayCompleted: true,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          withExtras({ foodName: 'Rolled Oats',   quantityG: 60, kcal: 233, protein: 10.2, carbs: 39.6, fat: 4.2  }),
          withExtras({ foodName: 'Whole Egg',     quantityG: 120,kcal: 186, protein: 15.6, carbs: 1.3,  fat: 13.2 }),
        ]},
        { name: 'Lunch',    order: 2, completed: true, items: [
          withExtras({ foodName: 'White Rice',    quantityG: 150,kcal: 548, protein: 10.7, carbs: 118.5,fat: 1.1  }),
          withExtras({ foodName: 'Chicken Breast',quantityG: 180,kcal: 297, protein: 55.8, carbs: 0.0,  fat: 6.5  }),
        ]},
      ],
    },
    // Day 6 — busy day, nothing logged
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(6), dayTypeName: memberDayType(6), dayCompleted: false,
      meals: [
        { name: 'Breakfast', order: 1, completed: false, items: [
          withExtras({ foodName: 'Rolled Oats',   quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6  }),
          withExtras({ foodName: 'Whole Egg',     quantityG: 150,kcal: 233, protein: 19.5, carbs: 1.7,  fat: 16.5 }),
        ]},
        { name: 'Lunch',    order: 2, completed: false, items: [
          withExtras({ foodName: 'White Rice',    quantityG: 200,kcal: 730, protein: 14.2, carbs: 158.0,fat: 1.4  }),
          withExtras({ foodName: 'Chicken Breast',quantityG: 200,kcal: 330, protein: 62.0, carbs: 0.0,  fat: 7.2  }),
        ]},
        { name: 'Dinner',   order: 3, completed: false, items: [
          withExtras({ foodName: 'White Rice',    quantityG: 150,kcal: 548, protein: 10.7, carbs: 118.5,fat: 1.1  }),
          withExtras({ foodName: 'Chicken Breast',quantityG: 150,kcal: 248, protein: 46.5, carbs: 0.0,  fat: 5.4  }),
        ]},
      ],
    },
    // Days 7–13: older history for analytics / chart testing
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(7),  dayTypeName: memberDayType(7),  dayCompleted: true,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [ withExtras({ foodName: 'Rolled Oats', quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6 }), withExtras({ foodName: 'Whole Egg', quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7, fat: 16.5 }) ]},
        { name: 'Lunch',    order: 2, completed: true, items: [ withExtras({ foodName: 'White Rice', quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0, fat: 1.4 }), withExtras({ foodName: 'Chicken Breast', quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0, fat: 7.2 }) ]},
        { name: 'Dinner',   order: 3, completed: true, items: [ withExtras({ foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 }), withExtras({ foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 }) ]},
      ],
    },
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(8),  dayTypeName: memberDayType(8),  dayCompleted: false,
      meals: [
        { name: 'Breakfast', order: 1, completed: true,  items: [ withExtras({ foodName: 'Rolled Oats', quantityG: 60, kcal: 233, protein: 10.2, carbs: 39.6, fat: 4.2 }), withExtras({ foodName: 'Whole Egg', quantityG: 120, kcal: 186, protein: 15.6, carbs: 1.3, fat: 13.2 }) ]},
        { name: 'Lunch',    order: 2, completed: false, items: [ withExtras({ foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 }), withExtras({ foodName: 'Chicken Breast', quantityG: 180, kcal: 297, protein: 55.8, carbs: 0.0, fat: 6.5 }) ]},
      ],
    },
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(9),  dayTypeName: memberDayType(9),  dayCompleted: true,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [ withExtras({ foodName: 'Rolled Oats', quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6 }), withExtras({ foodName: 'Whole Egg', quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7, fat: 16.5 }) ]},
        { name: 'Lunch',    order: 2, completed: true, items: [ withExtras({ foodName: 'White Rice', quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0, fat: 1.4 }), withExtras({ foodName: 'Chicken Breast', quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0, fat: 7.2 }) ]},
        { name: 'Dinner',   order: 3, completed: true, items: [ withExtras({ foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 }), withExtras({ foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 }) ]},
      ],
    },
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(10), dayTypeName: memberDayType(10), dayCompleted: true,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [ withExtras({ foodName: 'Rolled Oats', quantityG: 60, kcal: 233, protein: 10.2, carbs: 39.6, fat: 4.2 }), withExtras({ foodName: 'Whole Egg', quantityG: 120, kcal: 186, protein: 15.6, carbs: 1.3, fat: 13.2 }) ]},
        { name: 'Lunch',    order: 2, completed: true, items: [ withExtras({ foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 }), withExtras({ foodName: 'Chicken Breast', quantityG: 180, kcal: 297, protein: 55.8, carbs: 0.0, fat: 6.5 }) ]},
      ],
    },
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(11), dayTypeName: memberDayType(11), dayCompleted: false,
      meals: [
        { name: 'Breakfast', order: 1, completed: false, items: [ withExtras({ foodName: 'Rolled Oats', quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6 }), withExtras({ foodName: 'Whole Egg', quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7, fat: 16.5 }) ]},
        { name: 'Lunch',    order: 2, completed: false, items: [ withExtras({ foodName: 'White Rice', quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0, fat: 1.4 }), withExtras({ foodName: 'Chicken Breast', quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0, fat: 7.2 }) ]},
        { name: 'Dinner',   order: 3, completed: false, items: [ withExtras({ foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 }), withExtras({ foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 }) ]},
      ],
    },
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(12), dayTypeName: memberDayType(12), dayCompleted: true,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [ withExtras({ foodName: 'Rolled Oats', quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6 }), withExtras({ foodName: 'Whole Egg', quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7, fat: 16.5 }) ]},
        { name: 'Lunch',    order: 2, completed: true, items: [ withExtras({ foodName: 'White Rice', quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0, fat: 1.4 }), withExtras({ foodName: 'Chicken Breast', quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0, fat: 7.2 }) ]},
        { name: 'Dinner',   order: 3, completed: true, items: [ withExtras({ foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 }), withExtras({ foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 }) ]},
      ],
    },
    { memberId: member._id, planId: memberNutritionPlan._id, date: dateISO(13), dayTypeName: memberDayType(13), dayCompleted: false,
      meals: [
        { name: 'Breakfast', order: 1, completed: true,  items: [ withExtras({ foodName: 'Rolled Oats', quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6 }), withExtras({ foodName: 'Whole Egg', quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7, fat: 16.5 }) ]},
        { name: 'Lunch',    order: 2, completed: false, items: [ withExtras({ foodName: 'White Rice', quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0, fat: 1.4 }), withExtras({ foodName: 'Chicken Breast', quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0, fat: 7.2 }) ]},
        { name: 'Dinner',   order: 3, completed: false, items: [ withExtras({ foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 }), withExtras({ foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 }) ]},
      ],
    },
  ]);
  console.log('  ✓ Member nutrition logs: 14 days created');

  // ── Member2 Nutrition Daily Logs (7 days) ──────────────────────────────────
  await NutritionDailyLogModel.create([
    // Day 0 — today: breakfast only
    { memberId: member2._id, planId: member2NutritionPlan._id, date: dateISO(0), dayTypeName: 'Training Day', dayCompleted: false,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          withExtras({ foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18, carbs: 8, fat: 0.8 }),
          withExtras({ foodName: 'Blueberries',   quantityG: 100, kcal: 57,  protein: 0.7,carbs: 14,fat: 0.3 }),
        ]},
        { name: 'Lunch',  order: 2, completed: false, items: [] },
        { name: 'Dinner', order: 3, completed: false, items: [] },
      ],
    },
    // Day 1 — rest day, fully complete
    { memberId: member2._id, planId: member2NutritionPlan._id, date: dateISO(1), dayTypeName: 'Rest Day', dayCompleted: true,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          withExtras({ foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18,  carbs: 8,   fat: 0.8 }),
          withExtras({ foodName: 'Almonds',       quantityG: 30,  kcal: 174, protein: 6.4, carbs: 6.5, fat: 15  }),
        ]},
        { name: 'Lunch', order: 2, completed: true, items: [
          withExtras({ foodName: 'Tuna',        quantityG: 120, kcal: 132, protein: 30,   carbs: 0,   fat: 1.1 }),
          withExtras({ foodName: 'Mixed Greens',quantityG: 150, kcal: 35,  protein: 3.3,  carbs: 5.4, fat: 0.6 }),
        ]},
      ],
    },
    // Day 2 — training day, full compliance
    { memberId: member2._id, planId: member2NutritionPlan._id, date: dateISO(2), dayTypeName: 'Training Day', dayCompleted: true,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          withExtras({ foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18,   carbs: 8,    fat: 0.8  }),
          withExtras({ foodName: 'Whey Protein',  quantityG: 30,  kcal: 117, protein: 24,   carbs: 2.5,  fat: 1.2  }),
        ]},
        { name: 'Lunch', order: 2, completed: true, items: [
          withExtras({ foodName: 'Chicken Breast',quantityG: 150, kcal: 248, protein: 46.5, carbs: 0,    fat: 5.4  }),
          withExtras({ foodName: 'Sweet Potato',  quantityG: 200, kcal: 172, protein: 3.2,  carbs: 41,   fat: 0.2  }),
          withExtras({ foodName: 'Mixed Greens',  quantityG: 100, kcal: 23,  protein: 2.2,  carbs: 3.6,  fat: 0.4  }),
        ]},
        { name: 'Dinner', order: 3, completed: true, items: [
          withExtras({ foodName: 'Salmon Fillet', quantityG: 150, kcal: 312, protein: 31.5, carbs: 0,    fat: 19.5 }),
          withExtras({ foodName: 'Brown Rice',    quantityG: 120, kcal: 135, protein: 2.8,  carbs: 28.5, fat: 1.1  }),
        ]},
      ],
    },
    // Day 3 — rest day, both meals done
    { memberId: member2._id, planId: member2NutritionPlan._id, date: dateISO(3), dayTypeName: 'Rest Day', dayCompleted: true,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          withExtras({ foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18,  carbs: 8,   fat: 0.8 }),
          withExtras({ foodName: 'Blueberries',   quantityG: 80,  kcal: 46,  protein: 0.6, carbs: 11,  fat: 0.2 }),
        ]},
        { name: 'Lunch', order: 2, completed: true, items: [
          withExtras({ foodName: 'Tuna',        quantityG: 120, kcal: 132, protein: 30,  carbs: 0,   fat: 1.1 }),
          withExtras({ foodName: 'Mixed Greens',quantityG: 150, kcal: 35,  protein: 3.3, carbs: 5.4, fat: 0.6 }),
        ]},
      ],
    },
    // Day 4 — training day, breakfast only (had to rush)
    { memberId: member2._id, planId: member2NutritionPlan._id, date: dateISO(4), dayTypeName: 'Training Day', dayCompleted: false,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          withExtras({ foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18,  carbs: 8,   fat: 0.8 }),
        ]},
        { name: 'Lunch',  order: 2, completed: false, items: [
          withExtras({ foodName: 'Chicken Breast',quantityG: 150, kcal: 248, protein: 46.5,carbs: 0,   fat: 5.4 }),
          withExtras({ foodName: 'Sweet Potato',  quantityG: 200, kcal: 172, protein: 3.2, carbs: 41,  fat: 0.2 }),
        ]},
        { name: 'Dinner', order: 3, completed: false, items: [
          withExtras({ foodName: 'Salmon Fillet', quantityG: 150, kcal: 312, protein: 31.5,carbs: 0,   fat: 19.5}),
        ]},
      ],
    },
    // Day 5 — rest day, fully done
    { memberId: member2._id, planId: member2NutritionPlan._id, date: dateISO(5), dayTypeName: 'Rest Day', dayCompleted: true,
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          withExtras({ foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18,  carbs: 8,   fat: 0.8 }),
          withExtras({ foodName: 'Almonds',       quantityG: 30,  kcal: 174, protein: 6.4, carbs: 6.5, fat: 15  }),
        ]},
        { name: 'Lunch', order: 2, completed: true, items: [
          withExtras({ foodName: 'Tuna',        quantityG: 120, kcal: 132, protein: 30,  carbs: 0,   fat: 1.1 }),
          withExtras({ foodName: 'Mixed Greens',quantityG: 150, kcal: 35,  protein: 3.3, carbs: 5.4, fat: 0.6 }),
        ]},
      ],
    },
    // Day 6 — training day, nothing logged (tough week)
    { memberId: member2._id, planId: member2NutritionPlan._id, date: dateISO(6), dayTypeName: 'Training Day', dayCompleted: false,
      meals: [
        { name: 'Breakfast', order: 1, completed: false, items: [] },
        { name: 'Lunch',     order: 2, completed: false, items: [] },
        { name: 'Dinner',    order: 3, completed: false, items: [] },
      ],
    },
  ]);
  console.log('  ✓ Member2 nutrition logs: 7 days created');

  // ── Body Tests for member (5 data points, 3site male) ─────────────────────
  const memberBodyTests = [
    { ago: 56, weight: 82, chest: 26, abdominal: 32, thigh: 20 },
    { ago: 42, weight: 81, chest: 25, abdominal: 30, thigh: 19 },
    { ago: 28, weight: 80, chest: 23, abdominal: 28, thigh: 18 },
    { ago: 14, weight: 79, chest: 22, abdominal: 26, thigh: 17 },
    { ago: 0,  weight: 78, chest: 21, abdominal: 24, thigh: 16 },
  ];
  for (const { ago, weight, chest, abdominal, thigh } of memberBodyTests) {
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
  console.log('  ✓ Member body tests: 5 created (3site male)');

  // ── Body Tests for member2 (3 data points, 3site female) ──────────────────
  await BodyTestModel.create([
    { memberId: member2._id, trainerId: owner._id, date: daysAgo(45), age: 28, sex: 'female', weight: 65,   protocol: '3site', tricep: 18, suprailiac: 16, thigh: 22, bodyFatPct: 22.5, leanMassKg: 50.4, fatMassKg: 14.6, targetWeight: 60, targetBodyFatPct: 18 },
    { memberId: member2._id, trainerId: owner._id, date: daysAgo(28), age: 28, sex: 'female', weight: 64,   protocol: '3site', tricep: 16, suprailiac: 14, thigh: 20, bodyFatPct: 20.8, leanMassKg: 50.7, fatMassKg: 13.3, targetWeight: 60, targetBodyFatPct: 18 },
    { memberId: member2._id, trainerId: owner._id, date: daysAgo(7),  age: 28, sex: 'female', weight: 62.5, protocol: '3site', tricep: 14, suprailiac: 12, thigh: 18, bodyFatPct: 18.9, leanMassKg: 50.7, fatMassKg: 11.8, targetWeight: 60, targetBodyFatPct: 18 },
  ]);
  console.log('  ✓ Member2 body tests: 3 created (3site female)');

  // ── Scheduled Sessions ─────────────────────────────────────────────────────
  // Recurring Monday series: trainer + member
  const seriesId = new mongoose.Types.ObjectId();
  await Promise.all([
    // Past — 2 weeks ago (reminder sent)
    ScheduledSessionModel.create({ seriesId, trainerId: trainer._id, memberIds: [member._id], date: mondayAt(-2), startTime: '09:00', endTime: '10:00', status: 'scheduled', reminderSentAt: daysAgo(16) }),
    // Past — last week (reminder sent)
    ScheduledSessionModel.create({ seriesId, trainerId: trainer._id, memberIds: [member._id], date: mondayAt(-1), startTime: '09:00', endTime: '10:00', status: 'scheduled', reminderSentAt: daysAgo(9) }),
    // Upcoming — next Monday
    ScheduledSessionModel.create({ seriesId, trainerId: trainer._id, memberIds: [member._id], date: mondayAt(0),  startTime: '09:00', endTime: '10:00', status: 'scheduled', reminderSentAt: null }),
    // Upcoming — Monday after next
    ScheduledSessionModel.create({ seriesId, trainerId: trainer._id, memberIds: [member._id], date: mondayAt(1),  startTime: '09:00', endTime: '10:00', status: 'scheduled', reminderSentAt: null }),
    // Group session — both members, next Wednesday
    ScheduledSessionModel.create({ seriesId: null, trainerId: trainer._id, memberIds: [member._id, member2._id], date: nextDow(3, 0, 10), startTime: '10:00', endTime: '11:30', status: 'scheduled', reminderSentAt: null }),
    // Cancelled — last Wednesday
    ScheduledSessionModel.create({ seriesId: null, trainerId: trainer._id, memberIds: [member._id], date: nextDow(3, -1, 10), startTime: '10:00', endTime: '11:00', status: 'cancelled', reminderSentAt: null }),
    // member2 individual — next Thursday (with owner as trainer)
    ScheduledSessionModel.create({ seriesId: null, trainerId: owner._id, memberIds: [member2._id], date: nextDow(4, 0, 14), startTime: '14:00', endTime: '15:00', status: 'scheduled', reminderSentAt: null }),
  ]);
  console.log('  ✓ Scheduled sessions: 7 created (4-session series, group, cancelled, member2 solo)');

  // ── Member Injuries ────────────────────────────────────────────────────────
  await Promise.all([
    MemberInjuryModel.create({
      memberId: member._id, title: 'Right shoulder tightness', status: 'active',
      recordedAt: daysAgo(14), trainerNotes: 'Avoid overhead pressing for 2 weeks. Monitor on next Push session.',
      memberNotes: 'Feels stiff after sleeping on it. Worse in the morning.', affectedMovements: 'Overhead press, upright row',
    }),
    MemberInjuryModel.create({
      memberId: member._id, title: 'Lower back strain', status: 'resolved',
      recordedAt: daysAgo(56), trainerNotes: 'Rounded lower back on deadlift. Dropped load to 60 kg for 2 weeks. Fully resolved.',
      memberNotes: 'Pulled it on the third deadlift set — felt a sharp twinge.', affectedMovements: 'Deadlift, Romanian deadlift',
    }),
    // Old resolved injury — tests long-history filtering in UI
    MemberInjuryModel.create({
      memberId: member._id, title: 'Left ankle sprain', status: 'resolved',
      recordedAt: daysAgo(90), trainerNotes: 'Grade 1 sprain from outside activity. No impact on upper body work. Cleared after 3 weeks.',
      memberNotes: 'Rolled it playing basketball. Swelling gone after a week.', affectedMovements: 'Squat, lunge, running',
    }),
    MemberInjuryModel.create({
      memberId: member2._id, title: 'Left knee discomfort during squats', status: 'active',
      recordedAt: daysAgo(7), trainerNotes: 'Knee caving on descent. Cueing abduction. Avoid heavy load until form is dialed.',
      memberNotes: 'Noticeable ache during and after squats. Feels OK walking.', affectedMovements: 'Squat, leg press, lunges',
    }),
    // member2 resolved wrist issue — tests multi-injury view
    MemberInjuryModel.create({
      memberId: member2._id, title: 'Right wrist soreness', status: 'resolved',
      recordedAt: daysAgo(30), trainerNotes: 'Wrist flexion strain likely from gripping barbell. Used wrist wraps for 2 weeks. Resolved.',
      memberNotes: 'Sore when putting weight through it. Wraps helped a lot.', affectedMovements: 'Bench press, barbell row',
    }),
  ]);
  console.log('  ✓ Injuries: 3 for member (1 active, 2 resolved), 2 for member2 (1 active, 1 resolved)');

  // ── Check-In Configs ───────────────────────────────────────────────────────
  await Promise.all([
    CheckInConfigModel.create({ memberId: member._id,  trainerId: trainer._id, dayOfWeek: 4, hour: 7, minute: 0,  active: true, reminderSentAt: null }), // Thursday 07:00
    CheckInConfigModel.create({ memberId: member2._id, trainerId: owner._id,   dayOfWeek: 0, hour: 8, minute: 30, active: true, reminderSentAt: null }), // Sunday 08:30
  ]);
  console.log('  ✓ Check-in configs: member (Thu 07:00) + member2 (Sun 08:30)');

  // ── Check-In History for member (6 weeks) ─────────────────────────────────
  const memberCheckIns = [
    { ago: 42, sleep: 6, stress: 6, fatigue: 6, hunger: 5, recovery: 5, energy: 6, digestion: 7, weight: 82.0, waist: 87, steps: null,  exMin: null, sleepHrs: 6.5, diet: 'partial' as const, dietDetails: 'Hit protein but went over on carbs most days', wellbeing: 'A bit tired from work stress', notes: 'Work has been hectic, trying to keep up with training' },
    { ago: 35, sleep: 7, stress: 5, fatigue: 5, hunger: 6, recovery: 7, energy: 7, digestion: 7, weight: 81.5, waist: 86, steps: 7200,  exMin: 45,   sleepHrs: 7.0, diet: 'yes'     as const, dietDetails: 'Followed plan closely, meals prepped Sunday',       wellbeing: 'Feeling better this week',           notes: 'Upped calories slightly' },
    { ago: 28, sleep: 8, stress: 4, fatigue: 4, hunger: 6, recovery: 8, energy: 8, digestion: 8, weight: 80.5, waist: 85, steps: 9500,  exMin: 60,   sleepHrs: 7.5, diet: 'yes'     as const, dietDetails: 'Nailed every meal, very consistent',                wellbeing: 'Great energy, training is going well', notes: 'No issues this week, everything clicking' },
    { ago: 21, sleep: 7, stress: 5, fatigue: 5, hunger: 7, recovery: 7, energy: 7, digestion: 8, weight: 80.0, waist: 84, steps: 8800,  exMin: 55,   sleepHrs: 7.0, diet: 'yes'     as const, dietDetails: 'Stuck to plan, had one cheat meal Saturday',        wellbeing: 'Consistent week',                     notes: 'Squat PB this week' },
    { ago: 14, sleep: 6, stress: 7, fatigue: 7, hunger: 5, recovery: 6, energy: 6, digestion: 6, weight: 79.5, waist: null,steps: null, exMin: null, sleepHrs: 6.0, diet: 'no'      as const, dietDetails: 'Ate out most days, could not track macros',         wellbeing: 'Tough week, travel for work',          notes: 'Missed 2 sessions, shoulder flared up' },
    { ago: 7,  sleep: 8, stress: 3, fatigue: 3, hunger: 7, recovery: 9, energy: 9, digestion: 8, weight: 78.0, waist: 83, steps: 11000, exMin: 65,   sleepHrs: 8.0, diet: 'yes'     as const, dietDetails: 'Perfect adherence, hit all targets',                wellbeing: 'Best week in months, feeling strong',  notes: 'Everything dialed in, ready to push harder' },
  ];
  for (const c of memberCheckIns) {
    await CheckInModel.create({
      memberId: member._id, trainerId: trainer._id, submittedAt: daysAgo(c.ago),
      sleepQuality: c.sleep, stress: c.stress, fatigue: c.fatigue, hunger: c.hunger,
      recovery: c.recovery, energy: c.energy, digestion: c.digestion,
      weight: c.weight, waist: c.waist, steps: c.steps, exerciseMinutes: c.exMin,
      walkRunDistance: null, sleepHours: c.sleepHrs,
      dietDetails: c.dietDetails, stuckToDiet: c.diet,
      wellbeing: c.wellbeing, notes: c.notes, photos: [],
    });
  }
  console.log('  ✓ Member check-ins: 6 created (with waist + steps data)');

  // ── Check-In History for member2 (4 check-ins via owner) ──────────────────
  const member2CheckIns = [
    { ago: 21, sleep: 5, stress: 7, fatigue: 7, hunger: 4, recovery: 5, energy: 5, digestion: 6, weight: 65.0, waist: 74, steps: 5500, sleepHrs: 6.0, diet: 'partial' as const, dietDetails: 'Struggled to stick to the plan — ate out a lot', wellbeing: 'Feeling motivated but nutrition is hard to maintain', notes: 'Starting to get into the routine' },
    { ago: 14, sleep: 6, stress: 6, fatigue: 5, hunger: 6, recovery: 6, energy: 6, digestion: 7, weight: 64.0, waist: 73, steps: 7000, sleepHrs: 7.0, diet: 'yes'     as const, dietDetails: 'Followed the cutting plan, prepped meals on Sunday',  wellbeing: 'Feeling lighter and more energetic',               notes: 'Body fat coming down, happy with progress' },
    { ago: 7,  sleep: 7, stress: 5, fatigue: 4, hunger: 6, recovery: 7, energy: 7, digestion: 8, weight: 63.2, waist: 72, steps: 8200, sleepHrs: 7.5, diet: 'yes'     as const, dietDetails: 'Great week, no cheats. High protein intake.',        wellbeing: 'Feeling strong in the gym, squats improving',       notes: 'Knee is still a little sore but manageable' },
    { ago: 0,  sleep: 8, stress: 4, fatigue: 3, hunger: 7, recovery: 8, energy: 8, digestion: 8, weight: 62.5, waist: 71, steps: 9100, sleepHrs: 7.5, diet: 'yes'     as const, dietDetails: 'Perfect compliance, meal prep paid off.',             wellbeing: 'Best check-in yet — energy is great',               notes: 'New body test next week, looking forward to results' },
  ];
  for (const c of member2CheckIns) {
    await CheckInModel.create({
      memberId: member2._id, trainerId: owner._id, submittedAt: daysAgo(c.ago),
      sleepQuality: c.sleep, stress: c.stress, fatigue: c.fatigue, hunger: c.hunger,
      recovery: c.recovery, energy: c.energy, digestion: c.digestion,
      weight: c.weight, waist: c.waist, steps: c.steps, exerciseMinutes: null,
      walkRunDistance: null, sleepHours: c.sleepHrs,
      dietDetails: c.dietDetails, stuckToDiet: c.diet,
      wellbeing: c.wellbeing, notes: c.notes, photos: [],
    });
  }
  console.log('  ✓ Member2 check-ins: 4 created (via owner)');

  // ── Invite Tokens ──────────────────────────────────────────────────────────
  await Promise.all([
    // Used: owner invited trainer 90 days ago (still within 120-day validity window)
    InviteTokenModel.create({
      token: 'dev-token-trainer-90d',
      role: 'trainer',
      invitedBy: owner._id,
      recipientEmail: 'trainer@dev.com',
      expiresAt: daysFromNow(30),
      usedAt: daysAgo(90),
      trainerId: null,
    }),
    // Active pending: trainer just invited a prospective member
    InviteTokenModel.create({
      token: 'dev-token-member-pending',
      role: 'member',
      invitedBy: trainer._id,
      recipientEmail: 'potential.member@example.com',
      expiresAt: daysFromNow(6),
      usedAt: null,
      trainerId: trainer._id,
    }),
    // Active pending: owner invited a second trainer candidate
    InviteTokenModel.create({
      token: 'dev-token-trainer2-pending',
      role: 'trainer',
      invitedBy: owner._id,
      recipientEmail: 'newtrainer@example.com',
      expiresAt: daysFromNow(5),
      usedAt: null,
      trainerId: null,
    }),
    // Expired: member invite that was never accepted — tests expired-token UI state
    InviteTokenModel.create({
      token: 'dev-token-expired-member',
      role: 'member',
      invitedBy: trainer._id,
      recipientEmail: 'noshow@example.com',
      expiresAt: daysAgo(3),
      usedAt: null,
      trainerId: trainer._id,
    }),
  ]);
  console.log('  ✓ Invite tokens: 1 used + 2 active pending + 1 expired created');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env.local');

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
    console.log('\nmember@dev.com data:');
    console.log('  • PPL plan + 12 sessions (Push/Pull/Legs, correct exercises per day)');
    console.log('  • 4 PBs: Bench 72.5 kg | Deadlift 105 kg | Squat 92.5 kg | Pull-Up 10 reps');
    console.log('  • Exercise notes: Bench Press, Deadlift, Squat (3 entries each)');
    console.log('  • Lean Bulk 2800 kcal plan + 14 days nutrition logs');
    console.log('  • 5 body tests (56-day history)');
    console.log('  • 7 scheduled sessions (4-session Monday series included)');
    console.log('  • 3 injuries: right shoulder (active), lower back + ankle (resolved)');
    console.log('  • 6 check-ins with waist + step count data');
    console.log('\nmember2@dev.com data:');
    console.log('  • Full Body plan + 4 sessions (Day A/B/C with actual sets)');
    console.log('  • 3 PBs: Squat 50 kg | Bench 37.5 kg | Deadlift 55 kg');
    console.log('  • Exercise notes: Squat (2 entries)');
    console.log('  • Cutting Plan 1800 kcal + 7 days nutrition logs');
    console.log('  • 3 body tests (45-day history)');
    console.log('  • 2 injuries: left knee (active), right wrist (resolved)');
    console.log('  • 4 check-ins (via owner)');
    console.log('\ntrainer@dev.com self-tracking:');
    console.log('  • 8 freestyle sessions: Push/Pull/Legs rotation, 28-day history');
    console.log('\nowner@dev.com self-tracking:');
    console.log('  • 3 freestyle sessions: Upper/Lower, 19-day history');
    console.log('\nPlan templates: PPL | Full Body 3-Day | Upper/Lower 4-Day');
    console.log('Exercises: 7 global + 2 trainer-custom + 1 owner-custom');
    console.log('Equipment: 7 active/maintenance + 1 retired | 9 condition reports');
    console.log('Invite tokens: 1 used + 2 active pending + 1 expired');
  }

  await mongoose.disconnect();
  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
