/**
 * Dev seed logic — exported for testing.
 * Entry point: backend/scripts/seed-dev.ts
 */

import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import {
  UserModel,
  UserProfileModel,
  ExerciseModel,
  ExerciseNoteModel,
  EquipmentModel,
  ConditionReportModel,
  PlanTemplateModel,
  MemberPlanModel,
  WorkoutSessionModel,
  PersonalBestModel,
  NutritionTemplateModel,
  MemberNutritionPlanModel,
  BodyTestModel,
  ScheduledSessionModel,
  MemberInjuryModel,
  CheckInConfigModel,
  CheckInModel,
  FoodModel,
  NutritionDailyLogModel,
  InviteTokenModel,
  SelfWorkoutLogModel,
  ServiceTypeModel,
} from '../database/models/index';
import { FOOD_EXTRAS_PER_100G, withExtras } from '../../scripts/food-extras';

const PASS = 'Dev123!';

interface RawExercise {
  id: string;
  name: string;
  body_parts: string[];
  image: string;
}
interface RawEquipmentCatalog {
  equipment: { id: string; name: string }[];
}

const IMG_BASE =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';
const exImg = (id: string) => `${IMG_BASE}/${id}/0.jpg`;

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

function memberDayType(offset: number): string {
  return [1, 3, 5].includes(daysAgo(offset).getDay())
    ? 'Training Day'
    : 'Rest Day';
}

function epley1RM(weight: number, reps: number): number {
  return Math.round((weight / (1.0278 - 0.0278 * reps)) * 10) / 10;
}

function mondayAt(weeksOffset: number, hour = 9): Date {
  const d = new Date();
  const dow = d.getDay();
  const daysUntilMon = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + daysUntilMon + weeksOffset * 7);
  d.setHours(hour, 0, 0, 0);
  return d;
}

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

export async function seedCatalogs(): Promise<void> {
  const exercisesPath = path.join(
    process.cwd(),
    'context/data/exercises_catalog.json',
  );
  const rawExercises = JSON.parse(
    fs.readFileSync(exercisesPath, 'utf-8'),
  ) as RawExercise[];
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
  }
  console.log(`  ✓ Exercise catalog: ${rawExercises.length} upserted`);

  const equipPath = path.join(process.cwd(), 'context/data/gym_equipment.json');
  const { equipment } = JSON.parse(
    fs.readFileSync(equipPath, 'utf-8'),
  ) as RawEquipmentCatalog;
  // GymEquipmentCatalog is not a v2 model — skip or use a simple collection
  console.log(
    `  ✓ Equipment catalog: ${equipment.length} items (catalog reference only)`,
  );
}

// ── Phase 2: Dev data ─────────────────────────────────────────────────────────

export async function seedDevData(): Promise<void> {
  const hash = await bcrypt.hash(PASS, 10);

  // ── Users ──────────────────────────────────────────────────────────────────
  const owner = await UserModel.create({
    firstName: 'Dev',
    lastName: 'Owner',
    email: 'owner@dev.com',
    passwordHash: hash,
    role: 'owner',
    trainerId: null,
  });
  const trainer = await UserModel.create({
    firstName: 'Dev',
    lastName: 'Trainer',
    email: 'trainer@dev.com',
    passwordHash: hash,
    role: 'trainer',
    trainerId: owner._id,
  });
  const member = await UserModel.create({
    firstName: 'Dev',
    lastName: 'Member',
    email: 'member@dev.com',
    passwordHash: hash,
    role: 'member',
    trainerId: trainer._id,
  });
  const member2 = await UserModel.create({
    firstName: 'Dev',
    lastName: 'Member2',
    email: 'member2@dev.com',
    passwordHash: hash,
    role: 'member',
    trainerId: owner._id,
  });
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
      gymInfo: {
        name: 'PowerGym',
        address: null,
        phone: null,
        email: null,
        website: null,
        hours: null,
        description: null,
        logoUrl: null,
        loginLogoUrl: null,
      },
    }),
    UserProfileModel.create({
      userId: trainer._id,
      mobile: '+61 400 333 444',
      sex: 'male',
      dateOfBirth: new Date('1992-07-25'),
      height: 180,
      fitnessGoal: 'improve_performance',
      fitnessLevel: 'advanced',
      bio: 'CSCS certified trainer. Specialising in strength & conditioning and body recomposition.',
      specializations: [
        'Strength & Conditioning',
        'Weight Loss',
        'Powerlifting',
      ],
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

  // ── Equipment ──────────────────────────────────────────────────────────────
  const [
    treadmill,
    smithMachine,
    legPress,
    ,
    ,
    ,
    rowingMachine,
    ,
    functionalTrainer,
    powerRack,
  ] = await Promise.all([
    EquipmentModel.create({
      name: 'Treadmill',
      brand: 'Life Fitness',
      quantity: 3,
      status: 'active',
      trackCondition: true,
      images: [],
      note: 'Zone A, rows 1–3',
    }),
    EquipmentModel.create({
      name: 'Smith Machine',
      brand: 'Matrix',
      quantity: 2,
      status: 'active',
      trackCondition: true,
      images: [],
      note: null,
    }),
    EquipmentModel.create({
      name: 'Plate-Loaded Leg Press',
      brand: 'Hammer Strength',
      quantity: 2,
      status: 'maintenance',
      trackCondition: true,
      images: [],
      note: 'One unit under repair — cable issue',
    }),
    EquipmentModel.create({
      name: 'Dumbbells',
      brand: null,
      quantity: 40,
      status: 'active',
      trackCondition: false,
      images: [],
      note: '2 kg – 40 kg, 2 kg increments',
    }),
    EquipmentModel.create({
      name: 'Olympic Barbell',
      brand: null,
      quantity: 10,
      status: 'active',
      trackCondition: false,
      images: [],
      note: null,
    }),
    EquipmentModel.create({
      name: 'Weight Plates',
      brand: null,
      quantity: 120,
      status: 'active',
      trackCondition: false,
      images: [],
      note: '1.25 kg – 25 kg pairs',
    }),
    EquipmentModel.create({
      name: 'Rowing Machine',
      brand: 'Concept2',
      quantity: 4,
      status: 'active',
      trackCondition: true,
      images: [],
      note: null,
    }),
    EquipmentModel.create({
      name: 'Cable Crossover',
      brand: 'Technogym',
      quantity: 1,
      status: 'retired',
      trackCondition: false,
      images: [],
      note: 'Decommissioned',
    }),
    EquipmentModel.create({
      name: 'Functional Trainer',
      brand: 'Technogym',
      quantity: 1,
      status: 'active',
      trackCondition: true,
      images: [],
      note: 'New unit installed Dec 2024.',
    }),
    EquipmentModel.create({
      name: 'Power Rack',
      brand: 'Rogue',
      quantity: 4,
      status: 'active',
      trackCondition: true,
      images: [],
      note: 'Zone B, units 1–4.',
    }),
    EquipmentModel.create({
      name: 'Adjustable Bench',
      brand: 'Inspire',
      quantity: 6,
      status: 'active',
      trackCondition: false,
      images: [],
      note: null,
    }),
    EquipmentModel.create({
      name: 'Kettlebells',
      brand: null,
      quantity: 24,
      status: 'active',
      trackCondition: false,
      images: [],
      note: '8 kg – 48 kg, various increments',
    }),
  ]);
  await Promise.all([
    ConditionReportModel.create({
      equipmentId: treadmill._id,
      note: 'Belt slightly worn on unit #2.',
      reportedAt: daysAgo(14),
    }),
    ConditionReportModel.create({
      equipmentId: treadmill._id,
      note: 'Belt replaced on unit #2, all units running normally.',
      reportedAt: daysAgo(7),
    }),
    ConditionReportModel.create({
      equipmentId: legPress._id,
      note: 'Unit #1 cable frayed — taken offline. Technician booked.',
      reportedAt: daysAgo(5),
    }),
    ConditionReportModel.create({
      equipmentId: smithMachine._id,
      note: 'Annual service completed.',
      reportedAt: daysAgo(60),
    }),
    ConditionReportModel.create({
      equipmentId: smithMachine._id,
      note: 'Unit #1 locking pins stiff.',
      reportedAt: daysAgo(30),
    }),
    ConditionReportModel.create({
      equipmentId: smithMachine._id,
      note: 'Lubricated guide rails on both units.',
      reportedAt: daysAgo(21),
    }),
    ConditionReportModel.create({
      equipmentId: rowingMachine._id,
      note: 'Unit #2 monitor unresponsive.',
      reportedAt: daysAgo(20),
    }),
    ConditionReportModel.create({
      equipmentId: rowingMachine._id,
      note: 'Chain tension adjusted on unit #3.',
      reportedAt: daysAgo(10),
    }),
    ConditionReportModel.create({
      equipmentId: rowingMachine._id,
      note: 'Monitor replaced on unit #2. All 4 units fully operational.',
      reportedAt: daysAgo(3),
    }),
    ConditionReportModel.create({
      equipmentId: functionalTrainer._id,
      note: 'Post-installation check completed.',
      reportedAt: daysAgo(150),
    }),
    ConditionReportModel.create({
      equipmentId: powerRack._id,
      note: 'Annual inspection complete.',
      reportedAt: daysAgo(45),
    }),
  ]);
  console.log('  ✓ Equipment: 12 items + 11 condition reports');

  // ── Exercises ──────────────────────────────────────────────────────────────
  const [benchPress, squat, deadlift, pullUp] = await Promise.all([
    ExerciseModel.create({
      name: 'Bench Press',
      muscleGroup: 'chest',
      isGlobal: true,
      createdBy: null,
      imageUrl: exImg('Barbell_Bench_Press_-_Medium_Grip'),
      isBodyweight: false,
    }),
    ExerciseModel.create({
      name: 'Squat',
      muscleGroup: 'legs',
      isGlobal: true,
      createdBy: null,
      imageUrl: exImg('Barbell_Squat'),
      isBodyweight: false,
    }),
    ExerciseModel.create({
      name: 'Deadlift',
      muscleGroup: 'back',
      isGlobal: true,
      createdBy: null,
      imageUrl: exImg('Barbell_Deadlift'),
      isBodyweight: false,
    }),
    ExerciseModel.create({
      name: 'Pull-Up',
      muscleGroup: 'back',
      isGlobal: true,
      createdBy: null,
      imageUrl: exImg('Weighted_Pull_Ups'),
      isBodyweight: true,
    }),
  ]);
  const [cableFly, facePull] = await Promise.all([
    ExerciseModel.create({
      name: 'Cable Fly',
      muscleGroup: 'chest',
      isGlobal: false,
      createdBy: trainer._id,
      imageUrl: exImg('Flat_Bench_Cable_Flyes'),
      isBodyweight: false,
    }),
    ExerciseModel.create({
      name: 'Face Pull',
      muscleGroup: 'back',
      isGlobal: false,
      createdBy: trainer._id,
      imageUrl: exImg('Face_Pull'),
      isBodyweight: false,
    }),
  ]);
  const [ohp, hipThrust, latPulldown] = await Promise.all([
    ExerciseModel.create({
      name: 'Overhead Press',
      muscleGroup: 'shoulders',
      isGlobal: true,
      createdBy: null,
      imageUrl: exImg('Barbell_Shoulder_Press'),
      isBodyweight: false,
    }),
    ExerciseModel.create({
      name: 'Hip Thrust',
      muscleGroup: 'legs',
      isGlobal: true,
      createdBy: null,
      imageUrl: exImg('Barbell_Hip_Thrust'),
      isBodyweight: false,
    }),
    ExerciseModel.create({
      name: 'Lat Pulldown',
      muscleGroup: 'back',
      isGlobal: false,
      createdBy: trainer._id,
      imageUrl: exImg('Wide-Grip_Lat_Pulldown'),
      isBodyweight: false,
    }),
  ]);
  await ExerciseModel.create({
    name: 'Dumbbell Curl',
    muscleGroup: 'arms',
    isGlobal: false,
    createdBy: owner._id,
    imageUrl: exImg('Dumbbell_Bicep_Curl'),
    isBodyweight: false,
  });
  console.log(
    '  ✓ Exercises: 4 global + 2 trainer-custom + 3 more globals + 1 owner-custom',
  );

  // ── Plan Templates ─────────────────────────────────────────────────────────
  const g1 = new mongoose.Types.ObjectId().toString();
  const g2 = new mongoose.Types.ObjectId().toString();
  const g3 = new mongoose.Types.ObjectId().toString();
  const g4 = new mongoose.Types.ObjectId().toString();
  const g5 = new mongoose.Types.ObjectId().toString();
  const g6 = new mongoose.Types.ObjectId().toString();

  const pplTemplate = await PlanTemplateModel.create({
    name: 'PPL — 3-Day Split',
    description: 'Push / Pull / Legs rotating split.',
    createdBy: trainer._id,
    days: [
      {
        dayNumber: 1,
        name: 'Push',
        exercises: [
          {
            groupId: g1,
            isSuperset: false,
            exerciseId: benchPress._id,
            exerciseName: 'Bench Press',
            imageUrl: exImg('Barbell_Bench_Press_-_Medium_Grip'),
            isBodyweight: false,
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            restSeconds: 120,
          },
          {
            groupId: g5,
            isSuperset: false,
            exerciseId: cableFly._id,
            exerciseName: 'Cable Fly',
            imageUrl: exImg('Flat_Bench_Cable_Flyes'),
            isBodyweight: false,
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            restSeconds: 60,
          },
        ],
      },
      {
        dayNumber: 2,
        name: 'Pull',
        exercises: [
          {
            groupId: g2,
            isSuperset: false,
            exerciseId: deadlift._id,
            exerciseName: 'Deadlift',
            imageUrl: exImg('Barbell_Deadlift'),
            isBodyweight: false,
            sets: 3,
            repsMin: 5,
            repsMax: 8,
            restSeconds: 180,
          },
          {
            groupId: g3,
            isSuperset: false,
            exerciseId: pullUp._id,
            exerciseName: 'Pull-Up',
            imageUrl: exImg('Weighted_Pull_Ups'),
            isBodyweight: true,
            sets: 3,
            repsMin: 6,
            repsMax: 10,
            restSeconds: 90,
          },
          {
            groupId: g6,
            isSuperset: false,
            exerciseId: facePull._id,
            exerciseName: 'Face Pull',
            imageUrl: exImg('Face_Pull'),
            isBodyweight: false,
            sets: 3,
            repsMin: 12,
            repsMax: 20,
            restSeconds: 60,
          },
        ],
      },
      {
        dayNumber: 3,
        name: 'Legs',
        exercises: [
          {
            groupId: g4,
            isSuperset: false,
            exerciseId: squat._id,
            exerciseName: 'Squat',
            imageUrl: exImg('Barbell_Squat'),
            isBodyweight: false,
            sets: 4,
            repsMin: 6,
            repsMax: 10,
            restSeconds: 150,
          },
        ],
      },
    ],
  });

  const gA1 = new mongoose.Types.ObjectId().toString();
  const gA2 = new mongoose.Types.ObjectId().toString();
  const gB1 = new mongoose.Types.ObjectId().toString();
  const gB2 = new mongoose.Types.ObjectId().toString();
  const gC1 = new mongoose.Types.ObjectId().toString();

  const fullBodyTemplate = await PlanTemplateModel.create({
    name: 'Full Body 3-Day',
    description: 'Beginner-friendly full-body rotation.',
    createdBy: owner._id,
    days: [
      {
        dayNumber: 1,
        name: 'Day A',
        exercises: [
          {
            groupId: gA1,
            isSuperset: false,
            exerciseId: squat._id,
            exerciseName: 'Squat',
            imageUrl: exImg('Barbell_Squat'),
            isBodyweight: false,
            sets: 4,
            repsMin: 8,
            repsMax: 12,
            restSeconds: 120,
          },
          {
            groupId: gA2,
            isSuperset: false,
            exerciseId: benchPress._id,
            exerciseName: 'Bench Press',
            imageUrl: exImg('Barbell_Bench_Press_-_Medium_Grip'),
            isBodyweight: false,
            sets: 3,
            repsMin: 8,
            repsMax: 12,
            restSeconds: 120,
          },
        ],
      },
      {
        dayNumber: 2,
        name: 'Day B',
        exercises: [
          {
            groupId: gB1,
            isSuperset: false,
            exerciseId: deadlift._id,
            exerciseName: 'Deadlift',
            imageUrl: exImg('Barbell_Deadlift'),
            isBodyweight: false,
            sets: 3,
            repsMin: 5,
            repsMax: 8,
            restSeconds: 180,
          },
          {
            groupId: gB2,
            isSuperset: false,
            exerciseId: pullUp._id,
            exerciseName: 'Pull-Up',
            imageUrl: exImg('Weighted_Pull_Ups'),
            isBodyweight: true,
            sets: 3,
            repsMin: 6,
            repsMax: 10,
            restSeconds: 90,
          },
        ],
      },
      {
        dayNumber: 3,
        name: 'Day C',
        exercises: [
          {
            groupId: gC1,
            isSuperset: false,
            exerciseId: squat._id,
            exerciseName: 'Squat',
            imageUrl: exImg('Barbell_Squat'),
            isBodyweight: false,
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            restSeconds: 90,
          },
        ],
      },
    ],
  });

  const gU1 = new mongoose.Types.ObjectId().toString();
  const gU2 = new mongoose.Types.ObjectId().toString();
  const gU3 = new mongoose.Types.ObjectId().toString();
  const gU4 = new mongoose.Types.ObjectId().toString();
  const gU5 = new mongoose.Types.ObjectId().toString();
  const gL1 = new mongoose.Types.ObjectId().toString();
  const gL2 = new mongoose.Types.ObjectId().toString();
  const gL3 = new mongoose.Types.ObjectId().toString();
  const gL4 = new mongoose.Types.ObjectId().toString();

  await PlanTemplateModel.create({
    name: 'Upper / Lower 4-Day',
    description: 'Intermediate 4-day split.',
    createdBy: trainer._id,
    days: [
      {
        dayNumber: 1,
        name: 'Upper A',
        exercises: [
          {
            groupId: gU1,
            isSuperset: false,
            exerciseId: benchPress._id,
            exerciseName: 'Bench Press',
            imageUrl: exImg('Barbell_Bench_Press_-_Medium_Grip'),
            isBodyweight: false,
            sets: 4,
            repsMin: 5,
            repsMax: 8,
            restSeconds: 150,
          },
          {
            groupId: gU2,
            isSuperset: false,
            exerciseId: ohp._id,
            exerciseName: 'Overhead Press',
            imageUrl: exImg('Barbell_Shoulder_Press'),
            isBodyweight: false,
            sets: 3,
            repsMin: 6,
            repsMax: 10,
            restSeconds: 120,
          },
          {
            groupId: gU3,
            isSuperset: false,
            exerciseId: pullUp._id,
            exerciseName: 'Pull-Up',
            imageUrl: exImg('Weighted_Pull_Ups'),
            isBodyweight: true,
            sets: 3,
            repsMin: 6,
            repsMax: 10,
            restSeconds: 90,
          },
        ],
      },
      {
        dayNumber: 2,
        name: 'Lower A',
        exercises: [
          {
            groupId: gL1,
            isSuperset: false,
            exerciseId: squat._id,
            exerciseName: 'Squat',
            imageUrl: exImg('Barbell_Squat'),
            isBodyweight: false,
            sets: 4,
            repsMin: 5,
            repsMax: 8,
            restSeconds: 180,
          },
          {
            groupId: gL2,
            isSuperset: false,
            exerciseId: hipThrust._id,
            exerciseName: 'Hip Thrust',
            imageUrl: exImg('Barbell_Hip_Thrust'),
            isBodyweight: false,
            sets: 3,
            repsMin: 8,
            repsMax: 12,
            restSeconds: 90,
          },
        ],
      },
      {
        dayNumber: 3,
        name: 'Upper B',
        exercises: [
          {
            groupId: gU4,
            isSuperset: false,
            exerciseId: latPulldown._id,
            exerciseName: 'Lat Pulldown',
            imageUrl: exImg('Wide-Grip_Lat_Pulldown'),
            isBodyweight: false,
            sets: 4,
            repsMin: 8,
            repsMax: 12,
            restSeconds: 90,
          },
          {
            groupId: gU5,
            isSuperset: false,
            exerciseId: facePull._id,
            exerciseName: 'Face Pull',
            imageUrl: exImg('Face_Pull'),
            isBodyweight: false,
            sets: 3,
            repsMin: 12,
            repsMax: 20,
            restSeconds: 60,
          },
        ],
      },
      {
        dayNumber: 4,
        name: 'Lower B',
        exercises: [
          {
            groupId: gL3,
            isSuperset: false,
            exerciseId: deadlift._id,
            exerciseName: 'Deadlift',
            imageUrl: exImg('Barbell_Deadlift'),
            isBodyweight: false,
            sets: 3,
            repsMin: 5,
            repsMax: 8,
            restSeconds: 180,
          },
          {
            groupId: gL4,
            isSuperset: false,
            exerciseId: hipThrust._id,
            exerciseName: 'Hip Thrust',
            imageUrl: exImg('Barbell_Hip_Thrust'),
            isBodyweight: false,
            sets: 3,
            repsMin: 10,
            repsMax: 15,
            restSeconds: 90,
          },
        ],
      },
    ],
  });

  const memberPlan = await MemberPlanModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    templateId: pplTemplate._id,
    name: pplTemplate.name,
    days: pplTemplate.days,
    isActive: true,
    assignedAt: daysAgo(45),
  });
  const member2Plan = await MemberPlanModel.create({
    memberId: member2._id,
    trainerId: owner._id,
    templateId: fullBodyTemplate._id,
    name: fullBodyTemplate.name,
    days: fullBodyTemplate.days,
    isActive: true,
    assignedAt: daysAgo(20),
  });
  console.log('  ✓ Plan templates: 3 created + 2 member plans');

  // ── Member Workout Sessions (12) ──────────────────────────────────────────
  const sessionDays = [42, 39, 35, 32, 28, 25, 21, 18, 14, 11, 7, 4];
  const benchWeights = [60, 65, 70, 72.5];
  const dlWeights = [80, 90, 100, 105];
  const squatWeights = [70, 80, 87.5, 92.5];
  const pushRpe: (number | null)[] = [null, 7, 8, 8];
  const pullRpe: (number | null)[] = [7, null, 8, 9];
  const legsRpe: (number | null)[] = [null, 7, 8, 9];
  const pushNote: (string | null)[] = [
    null,
    null,
    'Felt good, shoulder is holding up',
    'Best bench day in months — 72.5 kg for 8',
  ];
  const pullNote: (string | null)[] = [
    null,
    null,
    'Deadlift back strength improving',
    'Finally hit 100+ kg deadlift!',
  ];
  const legsNote: (string | null)[] = [
    null,
    null,
    'Squats feeling stronger, depth better',
    'Hit 92.5 for 8 — new PB!',
  ];

  let pi = 0,
    li = 0,
    lgi = 0;
  const benchSessionIds: mongoose.Types.ObjectId[] = [];
  const dlSessionIds: mongoose.Types.ObjectId[] = [];
  const squatSessionIds: mongoose.Types.ObjectId[] = [];

  for (const [i, ago] of sessionDays.entries()) {
    const d = daysAgo(ago);
    const dayType = i % 3;

    if (dayType === 0) {
      const w = benchWeights[pi];
      const reps = [8, 8, 7, pi < 2 ? 7 : 6];
      const session = await WorkoutSessionModel.create({
        memberId: member._id,
        memberPlanId: memberPlan._id,
        dayNumber: 1,
        dayName: 'Push',
        startedAt: d,
        completedAt: d,
        lastActivityAt: d,
        loggedBy: pi === 3 ? trainer._id : null,
        rpe: pushRpe[pi],
        memberNote: pushNote[pi],
        sets: [
          makeSet(
            benchPress._id,
            'Bench Press',
            g1,
            false,
            1,
            6,
            10,
            w,
            reps[0],
            d,
          ),
          makeSet(
            benchPress._id,
            'Bench Press',
            g1,
            false,
            2,
            6,
            10,
            w,
            reps[1],
            d,
          ),
          makeSet(
            benchPress._id,
            'Bench Press',
            g1,
            false,
            3,
            6,
            10,
            w,
            reps[2],
            d,
          ),
          makeSet(
            benchPress._id,
            'Bench Press',
            g1,
            false,
            4,
            6,
            10,
            w - 2.5,
            reps[3],
            d,
          ),
          makeSet(cableFly._id, 'Cable Fly', g5, false, 1, 10, 15, 15, 12, d),
          makeSet(cableFly._id, 'Cable Fly', g5, false, 2, 10, 15, 15, 12, d),
          makeSet(cableFly._id, 'Cable Fly', g5, false, 3, 10, 15, 15, 11, d),
        ],
      });
      benchSessionIds.push(session._id);
      pi++;
    } else if (dayType === 1) {
      const w = dlWeights[li];
      const dlReps = li < 2 ? [6, 5, 5] : [5, 5, 5];
      const puReps = [8 + li, 7 + li, 6 + li];
      const session = await WorkoutSessionModel.create({
        memberId: member._id,
        memberPlanId: memberPlan._id,
        dayNumber: 2,
        dayName: 'Pull',
        startedAt: d,
        completedAt: d,
        lastActivityAt: d,
        loggedBy: li === 3 ? trainer._id : null,
        rpe: pullRpe[li],
        memberNote: pullNote[li],
        sets: [
          makeSet(
            deadlift._id,
            'Deadlift',
            g2,
            false,
            1,
            5,
            8,
            w,
            dlReps[0],
            d,
          ),
          makeSet(
            deadlift._id,
            'Deadlift',
            g2,
            false,
            2,
            5,
            8,
            w,
            dlReps[1],
            d,
          ),
          makeSet(
            deadlift._id,
            'Deadlift',
            g2,
            false,
            3,
            5,
            8,
            w - 5,
            dlReps[2],
            d,
          ),
          makeSet(
            pullUp._id,
            'Pull-Up',
            g3,
            true,
            1,
            6,
            10,
            null,
            puReps[0],
            d,
          ),
          makeSet(
            pullUp._id,
            'Pull-Up',
            g3,
            true,
            2,
            6,
            10,
            null,
            puReps[1],
            d,
          ),
          makeSet(
            pullUp._id,
            'Pull-Up',
            g3,
            true,
            3,
            6,
            10,
            null,
            puReps[2],
            d,
          ),
          makeSet(facePull._id, 'Face Pull', g6, false, 1, 12, 20, 20, 15, d),
          makeSet(facePull._id, 'Face Pull', g6, false, 2, 12, 20, 20, 14, d),
          makeSet(facePull._id, 'Face Pull', g6, false, 3, 12, 20, 17.5, 13, d),
        ],
      });
      dlSessionIds.push(session._id);
      li++;
    } else {
      const w = squatWeights[lgi];
      const reps = [8, 8, lgi < 2 ? 8 : 7, lgi < 1 ? 7 : 6];
      const session = await WorkoutSessionModel.create({
        memberId: member._id,
        memberPlanId: memberPlan._id,
        dayNumber: 3,
        dayName: 'Legs',
        startedAt: d,
        completedAt: d,
        lastActivityAt: d,
        rpe: legsRpe[lgi],
        memberNote: legsNote[lgi],
        sets: [
          makeSet(squat._id, 'Squat', g4, false, 1, 6, 10, w, reps[0], d),
          makeSet(squat._id, 'Squat', g4, false, 2, 6, 10, w, reps[1], d),
          makeSet(squat._id, 'Squat', g4, false, 3, 6, 10, w, reps[2], d),
          makeSet(squat._id, 'Squat', g4, false, 4, 6, 10, w - 5, reps[3], d),
        ],
      });
      squatSessionIds.push(session._id);
      lgi++;
    }
  }
  console.log('  ✓ Member workout sessions: 12 created');

  // ── Personal Bests for member ──────────────────────────────────────────────
  await Promise.all([
    PersonalBestModel.create({
      memberId: member._id,
      exerciseId: benchPress._id,
      exerciseName: 'Bench Press',
      bestWeight: 72.5,
      bestReps: 8,
      estimatedOneRM: epley1RM(72.5, 8),
      achievedAt: daysAgo(11),
      sessionId: benchSessionIds[3],
    }),
    PersonalBestModel.create({
      memberId: member._id,
      exerciseId: deadlift._id,
      exerciseName: 'Deadlift',
      bestWeight: 105,
      bestReps: 5,
      estimatedOneRM: epley1RM(105, 5),
      achievedAt: daysAgo(7),
      sessionId: dlSessionIds[3],
    }),
    PersonalBestModel.create({
      memberId: member._id,
      exerciseId: squat._id,
      exerciseName: 'Squat',
      bestWeight: 92.5,
      bestReps: 8,
      estimatedOneRM: epley1RM(92.5, 8),
      achievedAt: daysAgo(4),
      sessionId: squatSessionIds[3],
    }),
    PersonalBestModel.create({
      memberId: member._id,
      exerciseId: pullUp._id,
      exerciseName: 'Pull-Up',
      bestWeight: 0,
      bestReps: 10,
      estimatedOneRM: 0,
      achievedAt: daysAgo(7),
      sessionId: dlSessionIds[dlSessionIds.length - 1],
    }),
  ]);
  console.log('  ✓ Member PBs: Bench | Deadlift | Squat | Pull-Up');

  // ── Member2 Workout Sessions (4) ──────────────────────────────────────────
  const m2Sessions = [
    { ago: 15, dayNum: 1, dayName: 'Day A' },
    { ago: 11, dayNum: 2, dayName: 'Day B' },
    { ago: 7, dayNum: 3, dayName: 'Day C' },
    { ago: 3, dayNum: 1, dayName: 'Day A' },
  ];
  const m2SquatW = [45, null, 47.5, 50];
  const m2BenchW = [35, null, null, 37.5];
  const m2DlW = [null, 55, null, null];
  const m2Notes: (string | null)[] = [
    'First Day A — learning the form',
    null,
    'Squats felt better this time',
    null,
  ];
  const m2Rpe: (number | null)[] = [6, 7, 6, 7];

  const m2SquatSessionIds: mongoose.Types.ObjectId[] = [];
  const m2BenchSessionIds: mongoose.Types.ObjectId[] = [];
  const m2DlSessionIds: mongoose.Types.ObjectId[] = [];

  for (let idx = 0; idx < m2Sessions.length; idx++) {
    const { ago, dayNum, dayName } = m2Sessions[idx];
    const d = daysAgo(ago);
    const sets: ReturnType<typeof makeSet>[] = [];

    if (dayNum === 1) {
      const sw = m2SquatW[idx]!;
      const bw = m2BenchW[idx]!;
      sets.push(
        makeSet(squat._id, 'Squat', gA1, false, 1, 8, 12, sw, 8, d),
        makeSet(squat._id, 'Squat', gA1, false, 2, 8, 12, sw, 8, d),
        makeSet(squat._id, 'Squat', gA1, false, 3, 8, 12, sw, 7, d),
        makeSet(squat._id, 'Squat', gA1, false, 4, 8, 12, sw - 5, 7, d),
        makeSet(benchPress._id, 'Bench Press', gA2, false, 1, 8, 12, bw, 8, d),
        makeSet(benchPress._id, 'Bench Press', gA2, false, 2, 8, 12, bw, 8, d),
        makeSet(
          benchPress._id,
          'Bench Press',
          gA2,
          false,
          3,
          8,
          12,
          bw - 2.5,
          7,
          d,
        ),
      );
    } else if (dayNum === 2) {
      const dw = m2DlW[idx]!;
      sets.push(
        makeSet(deadlift._id, 'Deadlift', gB1, false, 1, 5, 8, dw, 6, d),
        makeSet(deadlift._id, 'Deadlift', gB1, false, 2, 5, 8, dw, 5, d),
        makeSet(deadlift._id, 'Deadlift', gB1, false, 3, 5, 8, dw - 5, 5, d),
        makeSet(pullUp._id, 'Pull-Up', gB2, true, 1, 6, 10, null, 6, d),
        makeSet(pullUp._id, 'Pull-Up', gB2, true, 2, 6, 10, null, 5, d),
        makeSet(pullUp._id, 'Pull-Up', gB2, true, 3, 6, 10, null, 4, d),
      );
    } else {
      const sw = m2SquatW[idx]!;
      sets.push(
        makeSet(squat._id, 'Squat', gC1, false, 1, 10, 15, sw, 10, d),
        makeSet(squat._id, 'Squat', gC1, false, 2, 10, 15, sw, 9, d),
        makeSet(squat._id, 'Squat', gC1, false, 3, 10, 15, sw - 5, 9, d),
      );
    }

    const session = await WorkoutSessionModel.create({
      memberId: member2._id,
      memberPlanId: member2Plan._id,
      dayNumber: dayNum,
      dayName,
      startedAt: d,
      completedAt: d,
      lastActivityAt: d,
      loggedBy: idx === 3 ? owner._id : null,
      rpe: m2Rpe[idx],
      memberNote: m2Notes[idx],
      sets,
    });

    if (dayNum === 1) {
      m2SquatSessionIds.push(session._id);
      m2BenchSessionIds.push(session._id);
    }
    if (dayNum === 2) m2DlSessionIds.push(session._id);
    if (dayNum === 3) m2SquatSessionIds.push(session._id);
  }
  console.log('  ✓ Member2 workout sessions: 4 created');

  // ── Trainer Self-Tracking Sessions ────────────────────────────────────────
  const trainerSessions = [
    { ago: 28, dayName: 'Push', rpe: 8, note: 'Bench felt great today' },
    { ago: 25, dayName: 'Pull', rpe: 7, note: null },
    {
      ago: 21,
      dayName: 'Legs',
      rpe: 8,
      note: 'Hip thrust is really helping squat lockout',
    },
    { ago: 18, dayName: 'Push', rpe: 9, note: 'Pushed hard' },
    { ago: 14, dayName: 'Pull', rpe: 7, note: null },
    { ago: 11, dayName: 'Legs', rpe: 8, note: 'New squat PB — 127.5 for 5' },
    { ago: 7, dayName: 'Push', rpe: 8, note: null },
    { ago: 3, dayName: 'Pull', rpe: 7, note: 'Deadlift technique improving' },
  ];
  const benchWeightsT = [
    102.5, 102.5, 105.0, 105.0, 107.5, 107.5, 110.0, 110.0,
  ];
  const dlWeightsT = [140.0, 140.0, 142.5, 142.5, 145.0, 145.0, 147.5, 147.5];
  const squatWeightsT = [
    120.0, 120.0, 122.5, 122.5, 125.0, 125.0, 127.5, 127.5,
  ];
  let tPush = 0,
    tPull = 0,
    tLegs = 0;
  for (const s of trainerSessions) {
    const d = daysAgo(s.ago);
    const sg1 = new mongoose.Types.ObjectId().toString();
    const sg2 = new mongoose.Types.ObjectId().toString();
    const sg3 = new mongoose.Types.ObjectId().toString();
    let sets: ReturnType<typeof makeSelfSet>[] = [];
    if (s.dayName === 'Push') {
      const w = benchWeightsT[tPush];
      sets = [
        makeSelfSet(benchPress._id, 'Bench Press', sg1, false, 1, w, 6, d),
        makeSelfSet(benchPress._id, 'Bench Press', sg1, false, 2, w, 6, d),
        makeSelfSet(benchPress._id, 'Bench Press', sg1, false, 3, w, 5, d),
        makeSelfSet(benchPress._id, 'Bench Press', sg1, false, 4, w, 5, d),
        makeSelfSet(ohp._id, 'Overhead Press', sg2, false, 1, 72.5, 8, d),
        makeSelfSet(ohp._id, 'Overhead Press', sg2, false, 2, 72.5, 8, d),
        makeSelfSet(ohp._id, 'Overhead Press', sg2, false, 3, 72.5, 7, d),
        makeSelfSet(cableFly._id, 'Cable Fly', sg3, false, 1, 22.5, 12, d),
        makeSelfSet(cableFly._id, 'Cable Fly', sg3, false, 2, 22.5, 12, d),
        makeSelfSet(cableFly._id, 'Cable Fly', sg3, false, 3, 22.5, 11, d),
      ];
      tPush++;
    } else if (s.dayName === 'Pull') {
      const w = dlWeightsT[tPull];
      sets = [
        makeSelfSet(deadlift._id, 'Deadlift', sg1, false, 1, w, 5, d),
        makeSelfSet(deadlift._id, 'Deadlift', sg1, false, 2, w, 5, d),
        makeSelfSet(deadlift._id, 'Deadlift', sg1, false, 3, w, 5, d),
        makeSelfSet(
          latPulldown._id,
          'Lat Pulldown',
          sg2,
          false,
          1,
          80.0,
          10,
          d,
        ),
        makeSelfSet(
          latPulldown._id,
          'Lat Pulldown',
          sg2,
          false,
          2,
          80.0,
          10,
          d,
        ),
        makeSelfSet(latPulldown._id, 'Lat Pulldown', sg2, false, 3, 80.0, 9, d),
        makeSelfSet(facePull._id, 'Face Pull', sg3, false, 1, 25.0, 15, d),
        makeSelfSet(facePull._id, 'Face Pull', sg3, false, 2, 25.0, 15, d),
        makeSelfSet(facePull._id, 'Face Pull', sg3, false, 3, 25.0, 14, d),
      ];
      tPull++;
    } else {
      const w = squatWeightsT[tLegs];
      sets = [
        makeSelfSet(squat._id, 'Squat', sg1, false, 1, w, 6, d),
        makeSelfSet(squat._id, 'Squat', sg1, false, 2, w, 6, d),
        makeSelfSet(squat._id, 'Squat', sg1, false, 3, w, 5, d),
        makeSelfSet(squat._id, 'Squat', sg1, false, 4, w, 5, d),
        makeSelfSet(hipThrust._id, 'Hip Thrust', sg2, false, 1, 100.0, 10, d),
        makeSelfSet(hipThrust._id, 'Hip Thrust', sg2, false, 2, 102.5, 10, d),
        makeSelfSet(hipThrust._id, 'Hip Thrust', sg2, false, 3, 102.5, 9, d),
      ];
      tLegs++;
    }
    await SelfWorkoutLogModel.create({
      userId: trainer._id,
      startedAt: d,
      completedAt: d,
      lastActivityAt: d,
      autoSealed: false,
      sourceTemplateId: null,
      sourceTemplateDayNumber: null,
      dayName: s.dayName,
      sets,
      rpe: s.rpe,
      note: s.note,
    });
  }
  console.log('  ✓ Trainer self-tracking sessions: 8 created');

  // ── Owner Self-Tracking Sessions ──────────────────────────────────────────
  const ownerSelfSessions = [
    {
      ago: 19,
      dayName: 'Upper A',
      sets: [
        makeSelfSet(
          benchPress._id,
          'Bench Press',
          new mongoose.Types.ObjectId().toString(),
          false,
          1,
          115,
          5,
          daysAgo(19),
        ),
        makeSelfSet(
          benchPress._id,
          'Bench Press',
          new mongoose.Types.ObjectId().toString(),
          false,
          2,
          115,
          5,
          daysAgo(19),
        ),
        makeSelfSet(
          benchPress._id,
          'Bench Press',
          new mongoose.Types.ObjectId().toString(),
          false,
          3,
          115,
          4,
          daysAgo(19),
        ),
        makeSelfSet(
          pullUp._id,
          'Pull-Up',
          new mongoose.Types.ObjectId().toString(),
          true,
          1,
          null,
          8,
          daysAgo(19),
        ),
        makeSelfSet(
          pullUp._id,
          'Pull-Up',
          new mongoose.Types.ObjectId().toString(),
          true,
          2,
          null,
          8,
          daysAgo(19),
        ),
        makeSelfSet(
          pullUp._id,
          'Pull-Up',
          new mongoose.Types.ObjectId().toString(),
          true,
          3,
          null,
          7,
          daysAgo(19),
        ),
      ],
      rpe: 8,
      note: null,
    },
    {
      ago: 12,
      dayName: 'Lower',
      sets: [
        makeSelfSet(
          squat._id,
          'Squat',
          new mongoose.Types.ObjectId().toString(),
          false,
          1,
          130,
          5,
          daysAgo(12),
        ),
        makeSelfSet(
          squat._id,
          'Squat',
          new mongoose.Types.ObjectId().toString(),
          false,
          2,
          130,
          5,
          daysAgo(12),
        ),
        makeSelfSet(
          squat._id,
          'Squat',
          new mongoose.Types.ObjectId().toString(),
          false,
          3,
          130,
          5,
          daysAgo(12),
        ),
        makeSelfSet(
          squat._id,
          'Squat',
          new mongoose.Types.ObjectId().toString(),
          false,
          4,
          130,
          4,
          daysAgo(12),
        ),
        makeSelfSet(
          hipThrust._id,
          'Hip Thrust',
          new mongoose.Types.ObjectId().toString(),
          false,
          1,
          110,
          8,
          daysAgo(12),
        ),
        makeSelfSet(
          hipThrust._id,
          'Hip Thrust',
          new mongoose.Types.ObjectId().toString(),
          false,
          2,
          112.5,
          8,
          daysAgo(12),
        ),
        makeSelfSet(
          hipThrust._id,
          'Hip Thrust',
          new mongoose.Types.ObjectId().toString(),
          false,
          3,
          112.5,
          7,
          daysAgo(12),
        ),
      ],
      rpe: 9,
      note: 'Legs are responding well',
    },
    {
      ago: 5,
      dayName: 'Upper B',
      sets: [
        makeSelfSet(
          ohp._id,
          'Overhead Press',
          new mongoose.Types.ObjectId().toString(),
          false,
          1,
          87.5,
          5,
          daysAgo(5),
        ),
        makeSelfSet(
          ohp._id,
          'Overhead Press',
          new mongoose.Types.ObjectId().toString(),
          false,
          2,
          87.5,
          5,
          daysAgo(5),
        ),
        makeSelfSet(
          ohp._id,
          'Overhead Press',
          new mongoose.Types.ObjectId().toString(),
          false,
          3,
          87.5,
          4,
          daysAgo(5),
        ),
        makeSelfSet(
          pullUp._id,
          'Pull-Up',
          new mongoose.Types.ObjectId().toString(),
          true,
          1,
          null,
          9,
          daysAgo(5),
        ),
        makeSelfSet(
          pullUp._id,
          'Pull-Up',
          new mongoose.Types.ObjectId().toString(),
          true,
          2,
          null,
          9,
          daysAgo(5),
        ),
        makeSelfSet(
          facePull._id,
          'Face Pull',
          new mongoose.Types.ObjectId().toString(),
          false,
          1,
          27.5,
          12,
          daysAgo(5),
        ),
        makeSelfSet(
          facePull._id,
          'Face Pull',
          new mongoose.Types.ObjectId().toString(),
          false,
          2,
          27.5,
          12,
          daysAgo(5),
        ),
      ],
      rpe: 7,
      note: null,
    },
  ];
  for (const s of ownerSelfSessions) {
    await SelfWorkoutLogModel.create({
      userId: owner._id,
      startedAt: daysAgo(s.ago),
      completedAt: daysAgo(s.ago),
      lastActivityAt: daysAgo(s.ago),
      autoSealed: false,
      sourceTemplateId: null,
      sourceTemplateDayNumber: null,
      dayName: s.dayName,
      sets: s.sets,
      rpe: s.rpe,
      note: s.note,
    });
  }
  console.log('  ✓ Owner self-tracking sessions: 3 created');

  // ── Personal Bests for member2 ─────────────────────────────────────────────
  await Promise.all([
    PersonalBestModel.create({
      memberId: member2._id,
      exerciseId: squat._id,
      exerciseName: 'Squat',
      bestWeight: 50,
      bestReps: 8,
      estimatedOneRM: epley1RM(50, 8),
      achievedAt: daysAgo(3),
      sessionId: m2SquatSessionIds[m2SquatSessionIds.length - 1],
    }),
    PersonalBestModel.create({
      memberId: member2._id,
      exerciseId: benchPress._id,
      exerciseName: 'Bench Press',
      bestWeight: 37.5,
      bestReps: 8,
      estimatedOneRM: epley1RM(37.5, 8),
      achievedAt: daysAgo(3),
      sessionId: m2BenchSessionIds[m2BenchSessionIds.length - 1],
    }),
    PersonalBestModel.create({
      memberId: member2._id,
      exerciseId: deadlift._id,
      exerciseName: 'Deadlift',
      bestWeight: 55,
      bestReps: 6,
      estimatedOneRM: epley1RM(55, 6),
      achievedAt: daysAgo(11),
      sessionId: m2DlSessionIds[0],
    }),
  ]);
  console.log('  ✓ Member2 PBs: Squat | Bench | Deadlift');

  // ── Exercise Notes ─────────────────────────────────────────────────────────
  await Promise.all([
    ExerciseNoteModel.create({
      memberId: member._id,
      exerciseId: benchPress._id,
      exerciseName: 'Bench Press',
      trainerId: trainer._id,
      entries: [
        {
          content: 'Elbows slightly flaring. Cue: think "bend the bar".',
          sessionId: benchSessionIds[1],
          createdAt: daysAgo(32),
        },
        {
          content: 'Arch and leg drive looking much better.',
          sessionId: benchSessionIds[2],
          createdAt: daysAgo(21),
        },
        {
          content: 'Excellent session — bar path and control are on point.',
          sessionId: benchSessionIds[3],
          createdAt: daysAgo(11),
        },
      ],
    }),
    ExerciseNoteModel.create({
      memberId: member._id,
      exerciseId: deadlift._id,
      exerciseName: 'Deadlift',
      trainerId: trainer._id,
      entries: [
        {
          content: 'Lower back rounding slightly past knee.',
          sessionId: dlSessionIds[1],
          createdAt: daysAgo(28),
        },
        {
          content: 'Lockout looking solid. Hinge is much cleaner.',
          sessionId: dlSessionIds[2],
          createdAt: daysAgo(18),
        },
        {
          content: 'Hit 105 kg for 5 — phenomenal.',
          sessionId: dlSessionIds[3],
          createdAt: daysAgo(7),
        },
      ],
    }),
    ExerciseNoteModel.create({
      memberId: member._id,
      exerciseId: squat._id,
      exerciseName: 'Squat',
      trainerId: trainer._id,
      entries: [
        {
          content: 'Heels slightly rising at depth.',
          sessionId: squatSessionIds[1],
          createdAt: daysAgo(25),
        },
        {
          content: 'Heel cue fixed. Depth is much better.',
          sessionId: squatSessionIds[2],
          createdAt: daysAgo(14),
        },
        {
          content: 'Hit 92.5 for 8 — new PB.',
          sessionId: squatSessionIds[3],
          createdAt: daysAgo(4),
        },
      ],
    }),
    ExerciseNoteModel.create({
      memberId: member2._id,
      exerciseId: squat._id,
      exerciseName: 'Squat',
      trainerId: owner._id,
      entries: [
        {
          content: 'Good first attempt! Work on keeping chest up.',
          sessionId: m2SquatSessionIds[0],
          createdAt: daysAgo(15),
        },
        {
          content: 'Noticeable improvement. Increased load to 50 kg.',
          sessionId: m2SquatSessionIds[m2SquatSessionIds.length - 1],
          createdAt: daysAgo(3),
        },
      ],
    }),
  ]);
  console.log('  ✓ Exercise notes: created');

  // ── Nutrition Templates + Plans ────────────────────────────────────────────
  const nutritionTemplate = await NutritionTemplateModel.create({
    name: 'Lean Bulk — 2800 kcal',
    description: 'Moderate surplus with high protein.',
    createdBy: trainer._id,
    dayTypes: [
      {
        name: 'Training Day',
        meals: [
          {
            name: 'Breakfast',
            order: 1,
            items: [
              withExtras({
                foodName: 'Rolled Oats',
                quantityG: 80,
                kcal: 311,
                protein: 13.6,
                carbs: 52.8,
                fat: 5.6,
              }),
              withExtras({
                foodName: 'Whole Egg',
                quantityG: 150,
                kcal: 233,
                protein: 19.5,
                carbs: 1.7,
                fat: 16.5,
              }),
            ],
          },
          {
            name: 'Lunch',
            order: 2,
            items: [
              withExtras({
                foodName: 'White Rice',
                quantityG: 200,
                kcal: 730,
                protein: 14.2,
                carbs: 158.0,
                fat: 1.4,
              }),
              withExtras({
                foodName: 'Chicken Breast',
                quantityG: 200,
                kcal: 330,
                protein: 62.0,
                carbs: 0.0,
                fat: 7.2,
              }),
            ],
          },
          {
            name: 'Dinner',
            order: 3,
            items: [
              withExtras({
                foodName: 'White Rice',
                quantityG: 150,
                kcal: 548,
                protein: 10.7,
                carbs: 118.5,
                fat: 1.1,
              }),
              withExtras({
                foodName: 'Chicken Breast',
                quantityG: 150,
                kcal: 248,
                protein: 46.5,
                carbs: 0.0,
                fat: 5.4,
              }),
            ],
          },
        ],
      },
      {
        name: 'Rest Day',
        meals: [
          {
            name: 'Breakfast',
            order: 1,
            items: [
              withExtras({
                foodName: 'Rolled Oats',
                quantityG: 60,
                kcal: 233,
                protein: 10.2,
                carbs: 39.6,
                fat: 4.2,
              }),
              withExtras({
                foodName: 'Whole Egg',
                quantityG: 120,
                kcal: 186,
                protein: 15.6,
                carbs: 1.3,
                fat: 13.2,
              }),
            ],
          },
          {
            name: 'Lunch',
            order: 2,
            items: [
              withExtras({
                foodName: 'White Rice',
                quantityG: 150,
                kcal: 548,
                protein: 10.7,
                carbs: 118.5,
                fat: 1.1,
              }),
              withExtras({
                foodName: 'Chicken Breast',
                quantityG: 180,
                kcal: 297,
                protein: 55.8,
                carbs: 0.0,
                fat: 6.5,
              }),
            ],
          },
        ],
      },
    ],
  });

  const nextMonIso = mondayAt(0).toISOString().slice(0, 10);

  const memberNutritionPlan = await MemberNutritionPlanModel.create({
    memberId: member._id,
    assignedById: trainer._id,
    templateId: nutritionTemplate._id,
    name: nutritionTemplate.name,
    isActive: true,
    assignedAt: daysAgo(30),
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
      calendarOverrides: [{ date: nextMonIso, dayTypeName: 'Rest Day' }],
      iterate: true,
    },
  });

  const ownerNutritionTemplate = await NutritionTemplateModel.create({
    name: 'Cutting Plan — 1800 kcal',
    description: 'Moderate deficit, high protein.',
    createdBy: owner._id,
    dayTypes: [
      {
        name: 'Training Day',
        meals: [
          {
            name: 'Breakfast',
            order: 1,
            items: [
              withExtras({
                foodName: 'Greek Yoghurt',
                quantityG: 200,
                kcal: 118,
                protein: 18,
                carbs: 8,
                fat: 0.8,
              }),
              withExtras({
                foodName: 'Blueberries',
                quantityG: 100,
                kcal: 57,
                protein: 0.7,
                carbs: 14,
                fat: 0.3,
              }),
              withExtras({
                foodName: 'Whey Protein',
                quantityG: 30,
                kcal: 117,
                protein: 24,
                carbs: 2.5,
                fat: 1.2,
              }),
            ],
          },
          {
            name: 'Lunch',
            order: 2,
            items: [
              withExtras({
                foodName: 'Chicken Breast',
                quantityG: 150,
                kcal: 248,
                protein: 46.5,
                carbs: 0,
                fat: 5.4,
              }),
              withExtras({
                foodName: 'Sweet Potato',
                quantityG: 200,
                kcal: 172,
                protein: 3.2,
                carbs: 41,
                fat: 0.2,
              }),
              withExtras({
                foodName: 'Mixed Greens',
                quantityG: 100,
                kcal: 23,
                protein: 2.2,
                carbs: 3.6,
                fat: 0.4,
              }),
            ],
          },
          {
            name: 'Dinner',
            order: 3,
            items: [
              withExtras({
                foodName: 'Salmon Fillet',
                quantityG: 150,
                kcal: 312,
                protein: 31.5,
                carbs: 0,
                fat: 19.5,
              }),
              withExtras({
                foodName: 'Brown Rice',
                quantityG: 120,
                kcal: 135,
                protein: 2.8,
                carbs: 28.5,
                fat: 1.1,
              }),
            ],
          },
        ],
      },
      {
        name: 'Rest Day',
        meals: [
          {
            name: 'Breakfast',
            order: 1,
            items: [
              withExtras({
                foodName: 'Greek Yoghurt',
                quantityG: 200,
                kcal: 118,
                protein: 18,
                carbs: 8,
                fat: 0.8,
              }),
              withExtras({
                foodName: 'Almonds',
                quantityG: 30,
                kcal: 174,
                protein: 6.4,
                carbs: 6.5,
                fat: 15,
              }),
            ],
          },
          {
            name: 'Lunch',
            order: 2,
            items: [
              withExtras({
                foodName: 'Tuna',
                quantityG: 120,
                kcal: 132,
                protein: 30,
                carbs: 0,
                fat: 1.1,
              }),
              withExtras({
                foodName: 'Mixed Greens',
                quantityG: 150,
                kcal: 35,
                protein: 3.3,
                carbs: 5.4,
                fat: 0.6,
              }),
            ],
          },
        ],
      },
    ],
  });

  const member2NutritionPlan = await MemberNutritionPlanModel.create({
    memberId: member2._id,
    assignedById: owner._id,
    templateId: ownerNutritionTemplate._id,
    name: ownerNutritionTemplate.name,
    isActive: true,
    assignedAt: daysAgo(18),
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
    {
      createdBy: trainer._id,
      name: 'Coles Chicken Breast 100g Pack',
      brand: 'Coles',
      macrosPer100g: {
        ...FOOD_EXTRAS_PER_100G['Coles Chicken Breast 100g Pack'],
        kcal: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      },
      servings: [
        { label: '100 g', grams: 100 },
        { label: 'Whole pack 500 g', grams: 500 },
      ],
    },
    {
      createdBy: trainer._id,
      name: 'Woolworths Rolled Oats',
      brand: 'Woolworths',
      macrosPer100g: {
        ...FOOD_EXTRAS_PER_100G['Woolworths Rolled Oats'],
        kcal: 389,
        protein: 17,
        carbs: 58,
        fat: 7,
      },
      servings: [
        { label: '40 g serving', grams: 40 },
        { label: '80 g serving', grams: 80 },
      ],
    },
    {
      createdBy: trainer._id,
      name: 'Tip Top Wholemeal Bread',
      brand: 'Tip Top',
      macrosPer100g: {
        ...FOOD_EXTRAS_PER_100G['Tip Top Wholemeal Bread'],
        kcal: 244,
        protein: 10,
        carbs: 40,
        fat: 3.8,
      },
      servings: [
        { label: '1 slice (40 g)', grams: 40 },
        { label: '2 slices (80 g)', grams: 80 },
      ],
    },
    {
      createdBy: trainer._id,
      name: 'Bega Cheese',
      brand: 'Bega',
      macrosPer100g: {
        ...FOOD_EXTRAS_PER_100G['Bega Cheese'],
        kcal: 395,
        protein: 24,
        carbs: 0.2,
        fat: 33,
      },
      servings: [
        { label: '20 g slice', grams: 20 },
        { label: '40 g serve', grams: 40 },
      ],
    },
    {
      createdBy: trainer._id,
      name: 'Vegemite',
      brand: 'Bega',
      macrosPer100g: {
        ...FOOD_EXTRAS_PER_100G['Vegemite'],
        kcal: 185,
        protein: 27,
        carbs: 15,
        fat: 0.6,
      },
      servings: [{ label: '5 g serve', grams: 5 }],
    },
    {
      createdBy: trainer._id,
      name: 'Brown Rice (dry)',
      brand: null,
      macrosPer100g: {
        ...FOOD_EXTRAS_PER_100G['Brown Rice'],
        kcal: 370,
        protein: 7.9,
        carbs: 77,
        fat: 2.9,
      },
      servings: [
        { label: '75 g dry', grams: 75 },
        { label: '150 g dry', grams: 150 },
      ],
    },
    {
      createdBy: owner._id,
      name: 'Reset Whey Protein',
      brand: 'Reset Nutrition',
      macrosPer100g: {
        ...FOOD_EXTRAS_PER_100G['Reset Whey Protein'],
        kcal: 390,
        protein: 75,
        carbs: 8,
        fat: 6,
      },
      servings: [{ label: '30 g scoop', grams: 30 }],
    },
    {
      createdBy: owner._id,
      name: 'Premium Almonds',
      brand: null,
      macrosPer100g: {
        ...FOOD_EXTRAS_PER_100G['Premium Almonds'],
        kcal: 579,
        protein: 21,
        carbs: 22,
        fat: 50,
      },
      servings: [{ label: '30 g handful', grams: 30 }],
    },
    {
      createdBy: owner._id,
      name: 'MCT Oil',
      brand: null,
      macrosPer100g: {
        ...FOOD_EXTRAS_PER_100G['MCT Oil'],
        kcal: 870,
        protein: 0,
        carbs: 0,
        fat: 97,
      },
      servings: [{ label: '1 tbsp (15 g)', grams: 15 }],
    },
    {
      createdBy: owner._id,
      name: 'Salmon Fillet (fresh)',
      brand: null,
      macrosPer100g: {
        ...FOOD_EXTRAS_PER_100G['Salmon Fillet'],
        kcal: 208,
        protein: 21,
        carbs: 0,
        fat: 13,
      },
      servings: [
        { label: '150 g fillet', grams: 150 },
        { label: '200 g fillet', grams: 200 },
      ],
    },
  ]);
  console.log('  ✓ Custom foods: 6 trainer + 4 owner');

  // ── Member Nutrition Daily Logs (14 days) ──────────────────────────────────
  await NutritionDailyLogModel.create([
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(0),
      dayTypeName: memberDayType(0),
      dayCompleted: false,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 80,
              kcal: 311,
              protein: 13.6,
              carbs: 52.8,
              fat: 5.6,
            }),
            withExtras({
              foodName: 'Whole Egg',
              quantityG: 150,
              kcal: 233,
              protein: 19.5,
              carbs: 1.7,
              fat: 16.5,
            }),
          ],
        },
        {
          name: 'Lunch',
          order: 2,
          completed: false,
          items: [
            withExtras({
              foodName: 'White Rice',
              quantityG: 200,
              kcal: 730,
              protein: 14.2,
              carbs: 158.0,
              fat: 1.4,
            }),
            withExtras({
              foodName: 'Chicken Breast',
              quantityG: 200,
              kcal: 330,
              protein: 62.0,
              carbs: 0.0,
              fat: 7.2,
            }),
          ],
        },
        {
          name: 'Dinner',
          order: 3,
          completed: false,
          items: [
            withExtras({
              foodName: 'White Rice',
              quantityG: 150,
              kcal: 548,
              protein: 10.7,
              carbs: 118.5,
              fat: 1.1,
            }),
            withExtras({
              foodName: 'Chicken Breast',
              quantityG: 150,
              kcal: 248,
              protein: 46.5,
              carbs: 0.0,
              fat: 5.4,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(1),
      dayTypeName: memberDayType(1),
      dayCompleted: true,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 80,
              kcal: 311,
              protein: 13.6,
              carbs: 52.8,
              fat: 5.6,
            }),
            withExtras({
              foodName: 'Whole Egg',
              quantityG: 150,
              kcal: 233,
              protein: 19.5,
              carbs: 1.7,
              fat: 16.5,
            }),
          ],
        },
        {
          name: 'Lunch',
          order: 2,
          completed: true,
          items: [
            withExtras({
              foodName: 'White Rice',
              quantityG: 200,
              kcal: 730,
              protein: 14.2,
              carbs: 158.0,
              fat: 1.4,
            }),
            withExtras({
              foodName: 'Chicken Breast',
              quantityG: 200,
              kcal: 330,
              protein: 62.0,
              carbs: 0.0,
              fat: 7.2,
            }),
          ],
        },
        {
          name: 'Dinner',
          order: 3,
          completed: true,
          items: [
            withExtras({
              foodName: 'White Rice',
              quantityG: 150,
              kcal: 548,
              protein: 10.7,
              carbs: 118.5,
              fat: 1.1,
            }),
            withExtras({
              foodName: 'Chicken Breast',
              quantityG: 150,
              kcal: 248,
              protein: 46.5,
              carbs: 0.0,
              fat: 5.4,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(2),
      dayTypeName: memberDayType(2),
      dayCompleted: false,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 80,
              kcal: 311,
              protein: 13.6,
              carbs: 52.8,
              fat: 5.6,
            }),
          ],
        },
        {
          name: 'Lunch',
          order: 2,
          completed: true,
          items: [
            withExtras({
              foodName: 'White Rice',
              quantityG: 200,
              kcal: 730,
              protein: 14.2,
              carbs: 158.0,
              fat: 1.4,
            }),
          ],
        },
        {
          name: 'Dinner',
          order: 3,
          completed: false,
          items: [
            withExtras({
              foodName: 'Chicken Breast',
              quantityG: 150,
              kcal: 248,
              protein: 46.5,
              carbs: 0.0,
              fat: 5.4,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(3),
      dayTypeName: memberDayType(3),
      dayCompleted: true,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 60,
              kcal: 233,
              protein: 10.2,
              carbs: 39.6,
              fat: 4.2,
            }),
          ],
        },
        {
          name: 'Lunch',
          order: 2,
          completed: true,
          items: [
            withExtras({
              foodName: 'White Rice',
              quantityG: 150,
              kcal: 548,
              protein: 10.7,
              carbs: 118.5,
              fat: 1.1,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(4),
      dayTypeName: memberDayType(4),
      dayCompleted: false,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 80,
              kcal: 311,
              protein: 13.6,
              carbs: 52.8,
              fat: 5.6,
            }),
          ],
        },
        {
          name: 'Lunch',
          order: 2,
          completed: false,
          items: [
            withExtras({
              foodName: 'White Rice',
              quantityG: 200,
              kcal: 730,
              protein: 14.2,
              carbs: 158.0,
              fat: 1.4,
            }),
          ],
        },
        {
          name: 'Dinner',
          order: 3,
          completed: false,
          items: [
            withExtras({
              foodName: 'Chicken Breast',
              quantityG: 150,
              kcal: 248,
              protein: 46.5,
              carbs: 0.0,
              fat: 5.4,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(5),
      dayTypeName: memberDayType(5),
      dayCompleted: true,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 60,
              kcal: 233,
              protein: 10.2,
              carbs: 39.6,
              fat: 4.2,
            }),
          ],
        },
        {
          name: 'Lunch',
          order: 2,
          completed: true,
          items: [
            withExtras({
              foodName: 'White Rice',
              quantityG: 150,
              kcal: 548,
              protein: 10.7,
              carbs: 118.5,
              fat: 1.1,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(6),
      dayTypeName: memberDayType(6),
      dayCompleted: false,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: false,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 80,
              kcal: 311,
              protein: 13.6,
              carbs: 52.8,
              fat: 5.6,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(7),
      dayTypeName: memberDayType(7),
      dayCompleted: true,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 80,
              kcal: 311,
              protein: 13.6,
              carbs: 52.8,
              fat: 5.6,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(8),
      dayTypeName: memberDayType(8),
      dayCompleted: false,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 60,
              kcal: 233,
              protein: 10.2,
              carbs: 39.6,
              fat: 4.2,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(9),
      dayTypeName: memberDayType(9),
      dayCompleted: true,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 80,
              kcal: 311,
              protein: 13.6,
              carbs: 52.8,
              fat: 5.6,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(10),
      dayTypeName: memberDayType(10),
      dayCompleted: true,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 60,
              kcal: 233,
              protein: 10.2,
              carbs: 39.6,
              fat: 4.2,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(11),
      dayTypeName: memberDayType(11),
      dayCompleted: false,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: false,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 80,
              kcal: 311,
              protein: 13.6,
              carbs: 52.8,
              fat: 5.6,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(12),
      dayTypeName: memberDayType(12),
      dayCompleted: true,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 80,
              kcal: 311,
              protein: 13.6,
              carbs: 52.8,
              fat: 5.6,
            }),
          ],
        },
      ],
    },
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(13),
      dayTypeName: memberDayType(13),
      dayCompleted: false,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Rolled Oats',
              quantityG: 80,
              kcal: 311,
              protein: 13.6,
              carbs: 52.8,
              fat: 5.6,
            }),
          ],
        },
      ],
    },
  ]);
  console.log('  ✓ Member nutrition logs: 14 days created');

  // ── Member2 Nutrition Daily Logs (7 days) ──────────────────────────────────
  await NutritionDailyLogModel.create([
    {
      memberId: member2._id,
      planId: member2NutritionPlan._id,
      date: dateISO(0),
      dayTypeName: 'Training Day',
      dayCompleted: false,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Greek Yoghurt',
              quantityG: 200,
              kcal: 118,
              protein: 18,
              carbs: 8,
              fat: 0.8,
            }),
          ],
        },
        { name: 'Lunch', order: 2, completed: false, items: [] },
        { name: 'Dinner', order: 3, completed: false, items: [] },
      ],
    },
    {
      memberId: member2._id,
      planId: member2NutritionPlan._id,
      date: dateISO(1),
      dayTypeName: 'Rest Day',
      dayCompleted: true,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Greek Yoghurt',
              quantityG: 200,
              kcal: 118,
              protein: 18,
              carbs: 8,
              fat: 0.8,
            }),
          ],
        },
        {
          name: 'Lunch',
          order: 2,
          completed: true,
          items: [
            withExtras({
              foodName: 'Tuna',
              quantityG: 120,
              kcal: 132,
              protein: 30,
              carbs: 0,
              fat: 1.1,
            }),
          ],
        },
      ],
    },
    {
      memberId: member2._id,
      planId: member2NutritionPlan._id,
      date: dateISO(2),
      dayTypeName: 'Training Day',
      dayCompleted: true,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Greek Yoghurt',
              quantityG: 200,
              kcal: 118,
              protein: 18,
              carbs: 8,
              fat: 0.8,
            }),
          ],
        },
        {
          name: 'Lunch',
          order: 2,
          completed: true,
          items: [
            withExtras({
              foodName: 'Chicken Breast',
              quantityG: 150,
              kcal: 248,
              protein: 46.5,
              carbs: 0,
              fat: 5.4,
            }),
          ],
        },
        {
          name: 'Dinner',
          order: 3,
          completed: true,
          items: [
            withExtras({
              foodName: 'Salmon Fillet',
              quantityG: 150,
              kcal: 312,
              protein: 31.5,
              carbs: 0,
              fat: 19.5,
            }),
          ],
        },
      ],
    },
    {
      memberId: member2._id,
      planId: member2NutritionPlan._id,
      date: dateISO(3),
      dayTypeName: 'Rest Day',
      dayCompleted: true,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Greek Yoghurt',
              quantityG: 200,
              kcal: 118,
              protein: 18,
              carbs: 8,
              fat: 0.8,
            }),
          ],
        },
      ],
    },
    {
      memberId: member2._id,
      planId: member2NutritionPlan._id,
      date: dateISO(4),
      dayTypeName: 'Training Day',
      dayCompleted: false,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Greek Yoghurt',
              quantityG: 200,
              kcal: 118,
              protein: 18,
              carbs: 8,
              fat: 0.8,
            }),
          ],
        },
        { name: 'Lunch', order: 2, completed: false, items: [] },
      ],
    },
    {
      memberId: member2._id,
      planId: member2NutritionPlan._id,
      date: dateISO(5),
      dayTypeName: 'Rest Day',
      dayCompleted: true,
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          completed: true,
          items: [
            withExtras({
              foodName: 'Greek Yoghurt',
              quantityG: 200,
              kcal: 118,
              protein: 18,
              carbs: 8,
              fat: 0.8,
            }),
          ],
        },
      ],
    },
    {
      memberId: member2._id,
      planId: member2NutritionPlan._id,
      date: dateISO(6),
      dayTypeName: 'Training Day',
      dayCompleted: false,
      meals: [{ name: 'Breakfast', order: 1, completed: false, items: [] }],
    },
  ]);
  console.log('  ✓ Member2 nutrition logs: 7 days created');

  // ── Body Tests ─────────────────────────────────────────────────────────────
  const memberBodyTests = [
    { ago: 182, weight: 87, chest: 31, abdominal: 38, thigh: 24 },
    { ago: 154, weight: 85, chest: 29, abdominal: 36, thigh: 23 },
    { ago: 133, weight: 85, chest: 29, abdominal: 36, thigh: 24 },
    { ago: 112, weight: 84, chest: 27, abdominal: 34, thigh: 22 },
    { ago: 84, weight: 83, chest: 27, abdominal: 34, thigh: 21 },
    { ago: 70, weight: 83, chest: 27, abdominal: 35, thigh: 22 },
    { ago: 56, weight: 82, chest: 26, abdominal: 32, thigh: 20 },
    { ago: 49, weight: 82, chest: 26, abdominal: 32, thigh: 21 },
    { ago: 42, weight: 81, chest: 25, abdominal: 30, thigh: 19 },
    { ago: 28, weight: 80, chest: 23, abdominal: 28, thigh: 18 },
    { ago: 14, weight: 79, chest: 22, abdominal: 26, thigh: 17 },
    { ago: 0, weight: 78, chest: 21, abdominal: 24, thigh: 16 },
  ];
  for (const { ago, weight, chest, abdominal, thigh } of memberBodyTests) {
    const sum = chest + abdominal + thigh;
    const age = 28;
    const density =
      1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age;
    const bfPct = Math.round((4.95 / density - 4.5) * 1000) / 10;
    const fatMass = Math.round(((weight * bfPct) / 100) * 10) / 10;
    await BodyTestModel.create({
      memberId: member._id,
      trainerId: trainer._id,
      date: daysAgo(ago),
      age,
      sex: 'male',
      weight,
      protocol: '3site',
      chest,
      abdominal,
      thigh,
      bodyFatPct: bfPct,
      leanMassKg: Math.round((weight - fatMass) * 10) / 10,
      fatMassKg: fatMass,
      targetWeight: 78,
      targetBodyFatPct: 18.5,
    });
  }
  console.log('  ✓ Member body tests: 12 created');

  await BodyTestModel.create([
    {
      memberId: member2._id,
      trainerId: owner._id,
      date: daysAgo(45),
      age: 28,
      sex: 'female',
      weight: 65,
      protocol: '3site',
      tricep: 18,
      suprailiac: 16,
      thigh: 22,
      bodyFatPct: 22.5,
      leanMassKg: 50.4,
      fatMassKg: 14.6,
      targetWeight: 60,
      targetBodyFatPct: 18,
    },
    {
      memberId: member2._id,
      trainerId: owner._id,
      date: daysAgo(28),
      age: 28,
      sex: 'female',
      weight: 64,
      protocol: '3site',
      tricep: 16,
      suprailiac: 14,
      thigh: 20,
      bodyFatPct: 20.8,
      leanMassKg: 50.7,
      fatMassKg: 13.3,
      targetWeight: 60,
      targetBodyFatPct: 18,
    },
    {
      memberId: member2._id,
      trainerId: owner._id,
      date: daysAgo(7),
      age: 28,
      sex: 'female',
      weight: 62.5,
      protocol: '3site',
      tricep: 14,
      suprailiac: 12,
      thigh: 18,
      bodyFatPct: 18.9,
      leanMassKg: 50.7,
      fatMassKg: 11.8,
      targetWeight: 60,
      targetBodyFatPct: 18,
    },
  ]);
  console.log('  ✓ Member2 body tests: 3 created');

  const ownerBodyTests = [
    {
      ago: 84,
      weight: 85.0,
      chest: 17,
      abdominal: 25,
      thigh: 18,
      tricep: 15,
      subscapular: 19,
      suprailiac: 18,
      midaxillary: 8,
    },
    {
      ago: 42,
      weight: 84.0,
      chest: 15,
      abdominal: 23,
      thigh: 17,
      tricep: 14,
      subscapular: 18,
      suprailiac: 17,
      midaxillary: 8,
    },
    {
      ago: 0,
      weight: 83.0,
      chest: 14,
      abdominal: 21,
      thigh: 16,
      tricep: 13,
      subscapular: 17,
      suprailiac: 16,
      midaxillary: 8,
    },
  ];
  for (const t of ownerBodyTests) {
    const sum =
      t.chest +
      t.abdominal +
      t.thigh +
      t.tricep +
      t.subscapular +
      t.suprailiac +
      t.midaxillary;
    const age = 46;
    const density =
      1.112 - 0.00043499 * sum + 0.00000055 * sum * sum - 0.00028826 * age;
    const bfPct = Math.round((4.95 / density - 4.5) * 1000) / 10;
    const fatMass = Math.round(((t.weight * bfPct) / 100) * 10) / 10;
    await BodyTestModel.create({
      memberId: owner._id,
      trainerId: owner._id,
      date: daysAgo(t.ago),
      age,
      sex: 'male',
      weight: t.weight,
      protocol: '7site',
      chest: t.chest,
      abdominal: t.abdominal,
      thigh: t.thigh,
      tricep: t.tricep,
      subscapular: t.subscapular,
      suprailiac: t.suprailiac,
      midaxillary: t.midaxillary,
      bodyFatPct: bfPct,
      leanMassKg: Math.round((t.weight - fatMass) * 10) / 10,
      fatMassKg: fatMass,
      targetWeight: 80,
      targetBodyFatPct: 13,
    });
  }
  console.log('  ✓ Owner body tests: 3 created');

  // ── Member Injuries ────────────────────────────────────────────────────────
  await Promise.all([
    MemberInjuryModel.create({
      memberId: member._id,
      title: 'Right shoulder tightness',
      status: 'active',
      recordedAt: daysAgo(14),
      trainerNotes: 'Avoid overhead pressing for 2 weeks.',
      memberNotes: 'Feels stiff after sleeping on it.',
      affectedMovements: 'Overhead press, upright row',
    }),
    MemberInjuryModel.create({
      memberId: member._id,
      title: 'Lower back strain',
      status: 'resolved',
      recordedAt: daysAgo(56),
      trainerNotes: 'Rounded lower back on deadlift. Fully resolved.',
      memberNotes: 'Pulled it on the third deadlift set.',
      affectedMovements: 'Deadlift, Romanian deadlift',
    }),
    MemberInjuryModel.create({
      memberId: member._id,
      title: 'Left ankle sprain',
      status: 'resolved',
      recordedAt: daysAgo(90),
      trainerNotes: 'Grade 1 sprain. Cleared after 3 weeks.',
      memberNotes: 'Rolled it playing basketball.',
      affectedMovements: 'Squat, lunge, running',
    }),
    MemberInjuryModel.create({
      memberId: member2._id,
      title: 'Left knee discomfort during squats',
      status: 'active',
      recordedAt: daysAgo(7),
      trainerNotes: 'Knee caving on descent.',
      memberNotes: 'Noticeable ache during and after squats.',
      affectedMovements: 'Squat, leg press, lunges',
    }),
    MemberInjuryModel.create({
      memberId: member2._id,
      title: 'Right wrist soreness',
      status: 'resolved',
      recordedAt: daysAgo(30),
      trainerNotes: 'Wrist flexion strain. Resolved.',
      memberNotes: 'Sore when putting weight through it.',
      affectedMovements: 'Bench press, barbell row',
    }),
  ]);
  console.log('  ✓ Injuries: 3 for member + 2 for member2');

  // ── Check-In Configs ───────────────────────────────────────────────────────
  await Promise.all([
    CheckInConfigModel.create({
      memberId: member._id,
      trainerId: trainer._id,
      dayOfWeek: 4,
      hour: 7,
      minute: 0,
      active: true,
      lastReminderSentAt: null,
    }),
    CheckInConfigModel.create({
      memberId: member2._id,
      trainerId: owner._id,
      dayOfWeek: 0,
      hour: 8,
      minute: 30,
      active: true,
      lastReminderSentAt: null,
    }),
  ]);
  console.log('  ✓ Check-in configs: created');

  // ── Check-Ins (historical + recent) ───────────────────────────────────────
  const historicalCheckIns = [
    { weekAgo: 26, w: 87.0 },
    { weekAgo: 25, w: 86.5 },
    { weekAgo: 24, w: 86.0 },
    { weekAgo: 23, w: 85.5 },
    { weekAgo: 22, w: 85.0 },
    { weekAgo: 21, w: 84.5 },
    { weekAgo: 20, w: 84.0 },
    { weekAgo: 19, w: 83.5 },
    { weekAgo: 18, w: 83.0 },
    { weekAgo: 17, w: 82.5 },
    { weekAgo: 16, w: 82.0 },
    { weekAgo: 15, w: 81.5 },
    { weekAgo: 14, w: 81.0 },
    { weekAgo: 13, w: 80.5 },
    { weekAgo: 12, w: 80.0 },
    { weekAgo: 11, w: 79.5 },
    { weekAgo: 10, w: 79.0 },
    { weekAgo: 9, w: 78.5 },
    { weekAgo: 8, w: 78.3 },
    { weekAgo: 7, w: 78.1 },
  ];
  for (const c of historicalCheckIns) {
    await CheckInModel.create({
      memberId: member._id,
      trainerId: trainer._id,
      submittedAt: daysAgo(c.weekAgo * 7 + 2),
      sleepQuality: 6,
      stress: 5,
      fatigue: 5,
      hunger: 6,
      recovery: 7,
      energy: 7,
      digestion: 7,
      weight: c.w,
      waist: null,
      steps: 8000,
      exerciseMinutes: 45,
      walkRunDistance: null,
      sleepHours: 7.0,
      dietDetails: 'Followed the plan',
      stuckToDiet: 'yes',
      wellbeing: 'Feeling good',
      notes: '',
      photos: [],
    });
  }

  const memberCheckIns = [
    {
      ago: 42,
      sleep: 6,
      stress: 6,
      fatigue: 6,
      hunger: 5,
      recovery: 5,
      energy: 6,
      digestion: 7,
      weight: 82.0,
      waist: 87,
      steps: null,
      exMin: null,
      sleepHrs: 6.5,
      diet: 'partial' as const,
      dietDetails: 'Hit protein but went over on carbs',
      wellbeing: 'A bit tired',
      notes: '',
      photos: [],
    },
    {
      ago: 35,
      sleep: 7,
      stress: 5,
      fatigue: 5,
      hunger: 6,
      recovery: 7,
      energy: 7,
      digestion: 7,
      weight: 81.5,
      waist: 86,
      steps: 7200,
      exMin: 45,
      sleepHrs: 7.0,
      diet: 'yes' as const,
      dietDetails: 'Followed plan closely',
      wellbeing: 'Feeling better',
      notes: '',
      photos: [],
    },
    {
      ago: 28,
      sleep: 8,
      stress: 4,
      fatigue: 4,
      hunger: 6,
      recovery: 8,
      energy: 8,
      digestion: 8,
      weight: 80.5,
      waist: 85,
      steps: 9500,
      exMin: 60,
      sleepHrs: 7.5,
      diet: 'yes' as const,
      dietDetails: 'Nailed every meal',
      wellbeing: 'Great energy',
      notes: '',
      photos: [],
    },
    {
      ago: 21,
      sleep: 7,
      stress: 5,
      fatigue: 5,
      hunger: 7,
      recovery: 7,
      energy: 7,
      digestion: 8,
      weight: 80.0,
      waist: 84,
      steps: 8800,
      exMin: 55,
      sleepHrs: 7.0,
      diet: 'yes' as const,
      dietDetails: 'Stuck to plan, one cheat Saturday',
      wellbeing: 'Consistent week',
      notes: '',
      photos: [],
    },
    {
      ago: 14,
      sleep: 6,
      stress: 7,
      fatigue: 7,
      hunger: 5,
      recovery: 6,
      energy: 6,
      digestion: 6,
      weight: 79.5,
      waist: null,
      steps: null,
      exMin: null,
      sleepHrs: 6.0,
      diet: 'no' as const,
      dietDetails: 'Ate out most days',
      wellbeing: 'Tough week',
      notes: '',
      photos: [],
    },
    {
      ago: 7,
      sleep: 8,
      stress: 3,
      fatigue: 3,
      hunger: 7,
      recovery: 9,
      energy: 9,
      digestion: 8,
      weight: 78.0,
      waist: 83,
      steps: 11000,
      exMin: 65,
      sleepHrs: 8.0,
      diet: 'yes' as const,
      dietDetails: 'Perfect adherence',
      wellbeing: 'Best week in months',
      notes: '',
      photos: [],
    },
  ];
  for (const c of memberCheckIns) {
    await CheckInModel.create({
      memberId: member._id,
      trainerId: trainer._id,
      submittedAt: daysAgo(c.ago),
      sleepQuality: c.sleep,
      stress: c.stress,
      fatigue: c.fatigue,
      hunger: c.hunger,
      recovery: c.recovery,
      energy: c.energy,
      digestion: c.digestion,
      weight: c.weight,
      waist: c.waist,
      steps: c.steps,
      exerciseMinutes: c.exMin,
      walkRunDistance: null,
      sleepHours: c.sleepHrs,
      dietDetails: c.dietDetails,
      stuckToDiet: c.diet,
      wellbeing: c.wellbeing,
      notes: c.notes,
      photos: c.photos,
    });
  }
  console.log('  ✓ Member check-ins: 26 total (20 historical + 6 recent)');

  const member2CheckIns = [
    {
      ago: 21,
      sleep: 5,
      stress: 7,
      fatigue: 7,
      hunger: 4,
      recovery: 5,
      energy: 5,
      digestion: 6,
      weight: 65.0,
      waist: 74,
      steps: 5500,
      sleepHrs: 6.0,
      diet: 'partial' as const,
      dietDetails: 'Struggled to stick to the plan',
      wellbeing: 'Feeling motivated',
      notes: '',
    },
    {
      ago: 14,
      sleep: 6,
      stress: 6,
      fatigue: 5,
      hunger: 6,
      recovery: 6,
      energy: 6,
      digestion: 7,
      weight: 64.0,
      waist: 73,
      steps: 7000,
      sleepHrs: 7.0,
      diet: 'yes' as const,
      dietDetails: 'Followed the cutting plan',
      wellbeing: 'Feeling lighter',
      notes: '',
    },
    {
      ago: 7,
      sleep: 7,
      stress: 5,
      fatigue: 4,
      hunger: 6,
      recovery: 7,
      energy: 7,
      digestion: 8,
      weight: 63.2,
      waist: 72,
      steps: 8200,
      sleepHrs: 7.5,
      diet: 'yes' as const,
      dietDetails: 'Great week, no cheats.',
      wellbeing: 'Feeling strong',
      notes: '',
    },
    {
      ago: 0,
      sleep: 8,
      stress: 4,
      fatigue: 3,
      hunger: 7,
      recovery: 8,
      energy: 8,
      digestion: 8,
      weight: 62.5,
      waist: 71,
      steps: 9100,
      sleepHrs: 7.5,
      diet: 'yes' as const,
      dietDetails: 'Perfect compliance.',
      wellbeing: 'Best check-in yet',
      notes: '',
    },
  ];
  for (const c of member2CheckIns) {
    await CheckInModel.create({
      memberId: member2._id,
      trainerId: owner._id,
      submittedAt: daysAgo(c.ago),
      sleepQuality: c.sleep,
      stress: c.stress,
      fatigue: c.fatigue,
      hunger: c.hunger,
      recovery: c.recovery,
      energy: c.energy,
      digestion: c.digestion,
      weight: c.weight,
      waist: c.waist,
      steps: c.steps,
      exerciseMinutes: null,
      walkRunDistance: null,
      sleepHours: c.sleepHrs,
      dietDetails: c.dietDetails,
      stuckToDiet: c.diet,
      wellbeing: c.wellbeing,
      notes: c.notes,
      photos: [],
    });
  }
  console.log('  ✓ Member2 check-ins: 4 created');

  // ── Service Types ─────────────────────────────────────────────────────────
  const ptService = await ServiceTypeModel.create({
    name: '1hr Personal Training',
    durationMin: 60,
    pricePerSession: 300,
    currency: 'AUD',
    note: 'Includes program design, warm-up, session coaching and recap notes.',
    isActive: true,
    createdBy: owner._id,
  });
  const checkinService = await ServiceTypeModel.create({
    name: '30min Check-in',
    durationMin: 30,
    pricePerSession: 150,
    currency: 'AUD',
    note: 'Progress review, form check and goal adjustment session.',
    isActive: true,
    createdBy: owner._id,
  });
  await ServiceTypeModel.create({
    name: 'Online Coaching',
    durationMin: 45,
    pricePerSession: 200,
    currency: 'AUD',
    note: 'Remote session via video call.',
    isActive: false,
    createdBy: owner._id,
  });
  console.log('  ✓ Service types: 2 active + 1 inactive');

  // ── Scheduled Sessions ─────────────────────────────────────────────────────
  const seriesId = new mongoose.Types.ObjectId();
  await Promise.all([
    ScheduledSessionModel.create({
      seriesId,
      trainerId: trainer._id,
      memberIds: [member._id],
      date: mondayAt(-2),
      startTime: '09:00',
      endTime: '10:00',
      status: 'scheduled',
      serviceTypeId: ptService._id,
      reminderSentAt: daysAgo(16),
    }),
    ScheduledSessionModel.create({
      seriesId,
      trainerId: trainer._id,
      memberIds: [member._id],
      date: mondayAt(-1),
      startTime: '09:00',
      endTime: '10:00',
      status: 'scheduled',
      serviceTypeId: ptService._id,
      reminderSentAt: daysAgo(9),
    }),
    ScheduledSessionModel.create({
      seriesId,
      trainerId: trainer._id,
      memberIds: [member._id],
      date: mondayAt(0),
      startTime: '09:00',
      endTime: '10:00',
      status: 'scheduled',
      serviceTypeId: ptService._id,
      reminderSentAt: null,
    }),
    ScheduledSessionModel.create({
      seriesId,
      trainerId: trainer._id,
      memberIds: [member._id],
      date: mondayAt(1),
      startTime: '09:00',
      endTime: '10:00',
      status: 'scheduled',
      serviceTypeId: ptService._id,
      reminderSentAt: null,
    }),
    ScheduledSessionModel.create({
      seriesId: null,
      trainerId: trainer._id,
      memberIds: [member._id, member2._id],
      date: nextDow(3, 0, 10),
      startTime: '10:00',
      endTime: '10:30',
      status: 'scheduled',
      serviceTypeId: checkinService._id,
      reminderSentAt: null,
    }),
    ScheduledSessionModel.create({
      seriesId: null,
      trainerId: trainer._id,
      memberIds: [member._id],
      date: nextDow(3, -1, 10),
      startTime: '10:00',
      endTime: '11:00',
      status: 'cancelled',
      serviceTypeId: ptService._id,
      reminderSentAt: null,
    }),
    ScheduledSessionModel.create({
      seriesId: null,
      trainerId: owner._id,
      memberIds: [member2._id],
      date: nextDow(4, 0, 14),
      startTime: '14:00',
      endTime: '15:00',
      status: 'scheduled',
      serviceTypeId: checkinService._id,
      reminderSentAt: null,
    }),
  ]);

  for (const weeksBack of [1, 2, 3, 4, 5, 6]) {
    const d = new Date();
    d.setDate(d.getDate() - weeksBack * 7);
    d.setHours(0, 0, 0, 0);
    await ScheduledSessionModel.create({
      seriesId: null,
      trainerId: trainer._id,
      memberIds: [member._id],
      date: d,
      startTime: '10:00',
      endTime: '11:00',
      status: 'scheduled',
      serviceTypeId: ptService._id,
      reminderSentAt: null,
    });
  }
  for (const weeksBack of [1, 2, 3]) {
    const d = new Date();
    d.setDate(d.getDate() - weeksBack * 7 - 2);
    d.setHours(0, 0, 0, 0);
    await ScheduledSessionModel.create({
      seriesId: null,
      trainerId: owner._id,
      memberIds: [member2._id],
      date: d,
      startTime: '09:00',
      endTime: '09:30',
      status: 'scheduled',
      serviceTypeId: checkinService._id,
      reminderSentAt: null,
    });
  }
  console.log('  ✓ Scheduled sessions: 16 created');

  // ── Invite Tokens ──────────────────────────────────────────────────────────
  await Promise.all([
    InviteTokenModel.create({
      token: 'dev-token-trainer-90d',
      role: 'trainer',
      invitedBy: owner._id,
      recipientEmail: 'trainer@dev.com',
      expiresAt: daysFromNow(30),
      usedAt: daysAgo(90),
      trainerId: null,
    }),
    InviteTokenModel.create({
      token: 'dev-token-member-pending',
      role: 'member',
      invitedBy: trainer._id,
      recipientEmail: 'potential.member@example.com',
      expiresAt: daysFromNow(6),
      usedAt: null,
      trainerId: trainer._id,
    }),
    InviteTokenModel.create({
      token: 'dev-token-trainer2-pending',
      role: 'trainer',
      invitedBy: owner._id,
      recipientEmail: 'newtrainer@example.com',
      expiresAt: daysFromNow(5),
      usedAt: null,
      trainerId: null,
    }),
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
  console.log('  ✓ Invite tokens: 1 used + 2 active pending + 1 expired');
}
