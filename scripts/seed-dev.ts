/**
 * Dev database seed script.
 *
 * Usage:
 *   pnpm seed:dev           — seed (skip if data already exists)
 *   pnpm seed:dev:reset     — wipe all collections then reseed
 *
 * Credentials seeded:
 *   owner@dev.com   / Dev123!
 *   trainer@dev.com / Dev123!
 *   member@dev.com  / Dev123!
 *   member2@dev.com / Dev123!
 */

import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

import { UserModel } from '../src/lib/db/models/user.model';
import { ExerciseModel } from '../src/lib/db/models/exercise.model';
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

const RESET = process.argv.includes('--reset');
const PASS = 'Dev123!';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}


async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set in .env.local');

  await mongoose.connect(uri);
  console.log('Connected to', uri.replace(/\/\/[^@]+@/, '//***@'));

  if (RESET) {
    const db = mongoose.connection.db!;
    const collections = await db.listCollections().toArray();
    await Promise.all(collections.map((col) => db.dropCollection(col.name)));
    console.log(`Dropped ${collections.length} collection(s).`);
  }

  const existing = await UserModel.countDocuments();
  if (existing > 0 && !RESET) {
    console.log(`Database already has ${existing} users — skipping seed.`);
    console.log('Run with --reset to wipe and reseed.');
    await mongoose.disconnect();
    return;
  }

  const hash = await bcrypt.hash(PASS, 10);

  // ── Users ────────────────────────────────────────────────────────────────
  const owner = await UserModel.create({
    name: 'Dev Owner',
    email: 'owner@dev.com',
    passwordHash: hash,
    role: 'owner',
    trainerId: null,
  });

  const trainer = await UserModel.create({
    name: 'Dev Trainer',
    email: 'trainer@dev.com',
    passwordHash: hash,
    role: 'trainer',
    trainerId: owner._id,
  });

  const member = await UserModel.create({
    name: 'Dev Member',
    email: 'member@dev.com',
    passwordHash: hash,
    role: 'member',
    trainerId: trainer._id,
  });

  const member2 = await UserModel.create({
    name: 'Dev Member 2',
    email: 'member2@dev.com',
    passwordHash: hash,
    role: 'member',
    trainerId: owner._id,
  });

  // ── Exercises ─────────────────────────────────────────────────────────────
  const [benchPress, squat, deadlift, pullUp] = await Promise.all([
    ExerciseModel.create({ name: 'Bench Press', muscleGroup: 'chest', isGlobal: true, createdBy: null, imageUrl: null, isBodyweight: false }),
    ExerciseModel.create({ name: 'Squat', muscleGroup: 'legs', isGlobal: true, createdBy: null, imageUrl: null, isBodyweight: false }),
    ExerciseModel.create({ name: 'Deadlift', muscleGroup: 'back', isGlobal: true, createdBy: null, imageUrl: null, isBodyweight: false }),
    ExerciseModel.create({ name: 'Pull-Up', muscleGroup: 'back', isGlobal: true, createdBy: null, imageUrl: null, isBodyweight: true }),
  ]);

  // ── Plan Template ─────────────────────────────────────────────────────────
  const g1 = new mongoose.Types.ObjectId().toString();
  const g2 = new mongoose.Types.ObjectId().toString();
  const g3 = new mongoose.Types.ObjectId().toString();

  const planTemplate = await PlanTemplateModel.create({
    name: 'PPL — 3-Day Split',
    description: 'Push / Pull / Legs rotating split',
    createdBy: trainer._id,
    days: [
      {
        dayNumber: 1,
        name: 'Push',
        exercises: [
          { groupId: g1, isSuperset: false, exerciseId: benchPress._id, exerciseName: 'Bench Press', imageUrl: null, isBodyweight: false, sets: 4, repsMin: 6, repsMax: 10, restSeconds: 120 },
        ],
      },
      {
        dayNumber: 2,
        name: 'Pull',
        exercises: [
          { groupId: g2, isSuperset: false, exerciseId: deadlift._id, exerciseName: 'Deadlift', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 5, repsMax: 8, restSeconds: 180 },
          { groupId: g3, isSuperset: false, exerciseId: pullUp._id, exerciseName: 'Pull-Up', imageUrl: null, isBodyweight: true, sets: 3, repsMin: 6, repsMax: 10, restSeconds: 90 },
        ],
      },
      {
        dayNumber: 3,
        name: 'Legs',
        exercises: [
          { groupId: new mongoose.Types.ObjectId().toString(), isSuperset: false, exerciseId: squat._id, exerciseName: 'Squat', imageUrl: null, isBodyweight: false, sets: 4, repsMin: 6, repsMax: 10, restSeconds: 150 },
        ],
      },
    ],
  });

  // ── Member Plan ───────────────────────────────────────────────────────────
  const memberPlan = await MemberPlanModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    templateId: planTemplate._id,
    name: planTemplate.name,
    days: planTemplate.days,
    isActive: true,
    assignedAt: daysAgo(30),
  });

  // ── Workout Sessions (6 weeks of history) ────────────────────────────────
  const sessionDays = [42, 39, 35, 32, 28, 25, 21, 18, 14, 11, 7, 4];
  for (const [i, ago] of sessionDays.entries()) {
    const d = daysAgo(ago);
    const weight = 60 + i * 1.25;
    const session = await WorkoutSessionModel.create({
      memberId: member._id,
      memberPlanId: memberPlan._id,
      dayNumber: (i % 3) + 1,
      dayName: ['Push', 'Pull', 'Legs'][i % 3],
      startedAt: d,
      completedAt: d,
      sets: [
        {
          exerciseId: benchPress._id,
          exerciseName: 'Bench Press',
          groupId: g1,
          isSuperset: false,
          isBodyweight: false,
          setNumber: 1,
          prescribedRepsMin: 6,
          prescribedRepsMax: 10,
          isExtraSet: false,
          actualWeight: weight,
          actualReps: 8,
          completedAt: d,
        },
      ],
    });

    // Only record a PB when the weight is the highest so far
    if (i === sessionDays.length - 1) {
      await PersonalBestModel.create({
        memberId: member._id,
        exerciseId: benchPress._id,
        exerciseName: 'Bench Press',
        bestWeight: weight,
        bestReps: 8,
        estimatedOneRM: Math.round(weight / (1.0278 - 0.0278 * 8) * 10) / 10,
        achievedAt: d,
        sessionId: session._id,
      });
    }
  }

  // ── Nutrition Template ────────────────────────────────────────────────────
  const nutritionTemplate = await NutritionTemplateModel.create({
    name: 'Lean Bulk — 2800 kcal',
    description: null,
    createdBy: trainer._id,
    dayTypes: [
      {
        name: 'Training Day',
        meals: [
          {
            name: 'Breakfast',
            order: 1,
            items: [
              { foodName: 'Rolled Oats', quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6 },
              { foodName: 'Whole Egg', quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7, fat: 16.5 },
            ],
          },
          {
            name: 'Lunch',
            order: 2,
            items: [
              { foodName: 'White Rice', quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0, fat: 1.4 },
              { foodName: 'Chicken Breast', quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0, fat: 7.2 },
            ],
          },
          {
            name: 'Dinner',
            order: 3,
            items: [
              { foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 },
              { foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 },
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
              { foodName: 'Rolled Oats', quantityG: 60, kcal: 233, protein: 10.2, carbs: 39.6, fat: 4.2 },
              { foodName: 'Whole Egg', quantityG: 120, kcal: 186, protein: 15.6, carbs: 1.3, fat: 13.2 },
            ],
          },
          {
            name: 'Lunch',
            order: 2,
            items: [
              { foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 },
              { foodName: 'Chicken Breast', quantityG: 180, kcal: 297, protein: 55.8, carbs: 0.0, fat: 6.5 },
            ],
          },
        ],
      },
    ],
  });

  // Next Monday ISO date (for calendar override deload week example)
  const nextMonIso = (() => {
    const d = new Date();
    const dow = d.getDay();
    d.setDate(d.getDate() + (dow === 0 ? 1 : 8 - dow));
    return d.toISOString().slice(0, 10);
  })();

  const memberNutritionPlan = await MemberNutritionPlanModel.create({
    memberId: member._id,
    assignedById: trainer._id,
    templateId: nutritionTemplate._id,
    name: nutritionTemplate.name,
    isActive: true,
    assignedAt: daysAgo(25),
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
        // Next Monday overridden to Rest Day (simulating a deload week)
        { date: nextMonIso, dayTypeName: 'Rest Day' },
      ],
      iterate: true,
    },
  });

  // ── Custom Foods (trainer + owner libraries) ───────────────────────────────
  await FoodModel.create([
    {
      createdBy: trainer._id,
      name: 'Coles Chicken Breast 100g Pack',
      brand: 'Coles',
      macrosPer100g: { kcal: 165, protein: 31, carbs: 0, fat: 3.6, sodium: 60 },
      servings: [{ label: '100 g', grams: 100 }, { label: 'Whole pack 500 g', grams: 500 }],
    },
    {
      createdBy: trainer._id,
      name: 'Woolworths Rolled Oats',
      brand: 'Woolworths',
      macrosPer100g: { kcal: 389, protein: 17, carbs: 58, fat: 7, fiber: 10, sodium: 2 },
      servings: [{ label: '40 g serving', grams: 40 }, { label: '80 g serving', grams: 80 }],
    },
    {
      createdBy: trainer._id,
      name: 'Tip Top Wholemeal Bread',
      brand: 'Tip Top',
      macrosPer100g: { kcal: 244, protein: 10, carbs: 40, fat: 3.8, fiber: 5.7, sodium: 390 },
      servings: [{ label: '1 slice (40 g)', grams: 40 }, { label: '2 slices (80 g)', grams: 80 }],
    },
    {
      createdBy: trainer._id,
      name: 'Bega Cheese',
      brand: 'Bega',
      macrosPer100g: { kcal: 395, protein: 24, carbs: 0.2, fat: 33, sodium: 650 },
      servings: [{ label: '20 g slice', grams: 20 }, { label: '40 g serve', grams: 40 }],
    },
    {
      createdBy: trainer._id,
      name: 'Vegemite',
      brand: 'Bega',
      macrosPer100g: { kcal: 185, protein: 27, carbs: 15, fat: 0.6, sodium: 3450 },
      servings: [{ label: '5 g serve', grams: 5 }],
    },
    {
      createdBy: owner._id,
      name: 'Reset Whey Protein',
      brand: 'Reset Nutrition',
      macrosPer100g: { kcal: 390, protein: 75, carbs: 8, fat: 6, sodium: 200 },
      servings: [{ label: '30 g scoop', grams: 30 }],
    },
    {
      createdBy: owner._id,
      name: 'Premium Almonds',
      brand: null,
      macrosPer100g: { kcal: 579, protein: 21, carbs: 22, fat: 50, fiber: 12.5, sodium: 1 },
      servings: [{ label: '30 g handful', grams: 30 }],
    },
    {
      createdBy: owner._id,
      name: 'MCT Oil',
      brand: null,
      macrosPer100g: { kcal: 870, protein: 0, carbs: 0, fat: 97, sodium: 0 },
      servings: [{ label: '1 tbsp (15 g)', grams: 15 }],
    },
  ]);

  // ── Daily Nutrition Logs (7 days of member history) ───────────────────────
  const dateISO = (offset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  };

  // Day-of-week → dayTypeName based on schedule (Mon/Wed/Fri = Training, rest = Rest)
  const dayTypeForDate = (offset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const dow = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    return [1, 3, 5].includes(dow) ? 'Training Day' : 'Rest Day';
  };

  await NutritionDailyLogModel.create([
    // Day 0 — today: partially complete (breakfast done, rest untouched)
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(0),
      dayTypeName: dayTypeForDate(0),
      meals: [
        {
          name: 'Breakfast', order: 1, completed: true,
          items: [
            { foodName: 'Rolled Oats', quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6 },
            { foodName: 'Whole Egg', quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7, fat: 16.5 },
          ],
        },
        {
          name: 'Lunch', order: 2, completed: false,
          items: [
            { foodName: 'White Rice', quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0, fat: 1.4 },
            { foodName: 'Chicken Breast', quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0, fat: 7.2 },
          ],
        },
        {
          name: 'Dinner', order: 3, completed: false,
          items: [
            { foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 },
            { foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 },
          ],
        },
      ],
      dayCompleted: false,
    },
    // Day 1 — yesterday: fully complete (member nailed it)
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(1),
      dayTypeName: dayTypeForDate(1),
      meals: [
        {
          name: 'Breakfast', order: 1, completed: true,
          items: [
            { foodName: 'Rolled Oats', quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6 },
            { foodName: 'Whole Egg', quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7, fat: 16.5 },
          ],
        },
        {
          name: 'Lunch', order: 2, completed: true,
          items: [
            { foodName: 'White Rice', quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0, fat: 1.4 },
            { foodName: 'Chicken Breast', quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0, fat: 7.2 },
          ],
        },
        {
          name: 'Dinner', order: 3, completed: true,
          items: [
            { foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 },
            { foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 },
          ],
        },
      ],
      dayCompleted: true,
    },
    // Day 2 — 2 days ago: member substituted lunch (Tip Top bread instead of rice — demos Recent tab variety)
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(2),
      dayTypeName: dayTypeForDate(2),
      meals: [
        {
          name: 'Breakfast', order: 1, completed: true,
          items: [
            { foodName: 'Rolled Oats', quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6 },
            { foodName: 'Whole Egg', quantityG: 120, kcal: 186, protein: 15.6, carbs: 1.3, fat: 13.2 },
          ],
        },
        {
          name: 'Lunch', order: 2, completed: true,
          items: [
            // Member substituted: Tip Top Wholemeal Bread instead of rice
            { foodName: 'Tip Top Wholemeal Bread', quantityG: 80, kcal: 195, protein: 8.0, carbs: 32.0, fat: 3.0, fiber: 4.6 },
            { foodName: 'Bega Cheese', quantityG: 40, kcal: 158, protein: 9.6, carbs: 0.1, fat: 13.2 },
            { foodName: 'Coles Chicken Breast 100g Pack', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 },
          ],
        },
        {
          name: 'Dinner', order: 3, completed: false,
          items: [
            { foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 },
            { foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 },
          ],
        },
      ],
      dayCompleted: false,
    },
    // Day 3 — 3 days ago: rest day, both meals complete
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(3),
      dayTypeName: dayTypeForDate(3),
      meals: [
        {
          name: 'Breakfast', order: 1, completed: true,
          items: [
            { foodName: 'Rolled Oats', quantityG: 60, kcal: 233, protein: 10.2, carbs: 39.6, fat: 4.2 },
            { foodName: 'Whole Egg', quantityG: 120, kcal: 186, protein: 15.6, carbs: 1.3, fat: 13.2 },
          ],
        },
        {
          name: 'Lunch', order: 2, completed: true,
          items: [
            { foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 },
            { foodName: 'Chicken Breast', quantityG: 180, kcal: 297, protein: 55.8, carbs: 0.0, fat: 6.5 },
          ],
        },
      ],
      dayCompleted: true,
    },
    // Day 4 — 4 days ago: partially complete, added a protein shake (member added item)
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(4),
      dayTypeName: dayTypeForDate(4),
      meals: [
        {
          name: 'Breakfast', order: 1, completed: true,
          items: [
            { foodName: 'Rolled Oats', quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6 },
            { foodName: 'Whole Egg', quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7, fat: 16.5 },
            // Member added a scoop of protein
            { foodName: 'Reset Whey Protein', quantityG: 30, kcal: 117, protein: 22.5, carbs: 2.4, fat: 1.8 },
          ],
        },
        {
          name: 'Lunch', order: 2, completed: false,
          items: [
            { foodName: 'White Rice', quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0, fat: 1.4 },
            { foodName: 'Chicken Breast', quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0, fat: 7.2 },
          ],
        },
        {
          name: 'Dinner', order: 3, completed: false,
          items: [
            { foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 },
            { foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 },
          ],
        },
      ],
      dayCompleted: false,
    },
    // Day 5 — 5 days ago: fully complete (great day)
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(5),
      dayTypeName: dayTypeForDate(5),
      meals: [
        {
          name: 'Breakfast', order: 1, completed: true,
          items: [
            { foodName: 'Rolled Oats', quantityG: 60, kcal: 233, protein: 10.2, carbs: 39.6, fat: 4.2 },
            { foodName: 'Whole Egg', quantityG: 120, kcal: 186, protein: 15.6, carbs: 1.3, fat: 13.2 },
          ],
        },
        {
          name: 'Lunch', order: 2, completed: true,
          items: [
            { foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 },
            { foodName: 'Chicken Breast', quantityG: 180, kcal: 297, protein: 55.8, carbs: 0.0, fat: 6.5 },
          ],
        },
      ],
      dayCompleted: true,
    },
    // Day 6 — 6 days ago: no meals touched (member had a busy day)
    {
      memberId: member._id,
      planId: memberNutritionPlan._id,
      date: dateISO(6),
      dayTypeName: dayTypeForDate(6),
      meals: [
        {
          name: 'Breakfast', order: 1, completed: false,
          items: [
            { foodName: 'Rolled Oats', quantityG: 80, kcal: 311, protein: 13.6, carbs: 52.8, fat: 5.6 },
            { foodName: 'Whole Egg', quantityG: 150, kcal: 233, protein: 19.5, carbs: 1.7, fat: 16.5 },
          ],
        },
        {
          name: 'Lunch', order: 2, completed: false,
          items: [
            { foodName: 'White Rice', quantityG: 200, kcal: 730, protein: 14.2, carbs: 158.0, fat: 1.4 },
            { foodName: 'Chicken Breast', quantityG: 200, kcal: 330, protein: 62.0, carbs: 0.0, fat: 7.2 },
          ],
        },
        {
          name: 'Dinner', order: 3, completed: false,
          items: [
            { foodName: 'White Rice', quantityG: 150, kcal: 548, protein: 10.7, carbs: 118.5, fat: 1.1 },
            { foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0.0, fat: 5.4 },
          ],
        },
      ],
      dayCompleted: false,
    },
  ]);

  // ── Owner Plan Template ───────────────────────────────────────────────────
  const ownerPlanTemplate = await PlanTemplateModel.create({
    name: 'Full Body 3-Day',
    description: 'Beginner-friendly full-body rotation',
    createdBy: owner._id,
    days: [
      {
        dayNumber: 1,
        name: 'Day A',
        exercises: [
          { groupId: new mongoose.Types.ObjectId().toString(), isSuperset: false, exerciseId: squat._id, exerciseName: 'Squat', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120 },
          { groupId: new mongoose.Types.ObjectId().toString(), isSuperset: false, exerciseId: benchPress._id, exerciseName: 'Bench Press', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 120 },
        ],
      },
      {
        dayNumber: 2,
        name: 'Day B',
        exercises: [
          { groupId: new mongoose.Types.ObjectId().toString(), isSuperset: false, exerciseId: deadlift._id, exerciseName: 'Deadlift', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 5, repsMax: 8, restSeconds: 180 },
          { groupId: new mongoose.Types.ObjectId().toString(), isSuperset: false, exerciseId: pullUp._id, exerciseName: 'Pull-Up', imageUrl: null, isBodyweight: true, sets: 3, repsMin: 6, repsMax: 10, restSeconds: 90 },
        ],
      },
      {
        dayNumber: 3,
        name: 'Day C',
        exercises: [
          { groupId: new mongoose.Types.ObjectId().toString(), isSuperset: false, exerciseId: squat._id, exerciseName: 'Squat', imageUrl: null, isBodyweight: false, sets: 3, repsMin: 10, repsMax: 15, restSeconds: 90 },
        ],
      },
    ],
  });

  const member2Plan = await MemberPlanModel.create({
    memberId: member2._id,
    trainerId: owner._id,
    templateId: ownerPlanTemplate._id,
    name: ownerPlanTemplate.name,
    days: ownerPlanTemplate.days,
    isActive: true,
    assignedAt: daysAgo(20),
  });

  // ── Owner Nutrition Template ──────────────────────────────────────────────
  const ownerNutritionTemplate = await NutritionTemplateModel.create({
    name: 'Cutting Plan — 1800 kcal',
    description: 'Moderate deficit, high protein',
    createdBy: owner._id,
    dayTypes: [
      {
        name: 'Training Day',
        meals: [
          {
            name: 'Breakfast',
            order: 1,
            items: [
              { foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18, carbs: 8, fat: 0.8 },
              { foodName: 'Blueberries', quantityG: 100, kcal: 57, protein: 0.7, carbs: 14, fat: 0.3 },
              { foodName: 'Whey Protein', quantityG: 30, kcal: 117, protein: 24, carbs: 2.5, fat: 1.2 },
            ],
          },
          {
            name: 'Lunch',
            order: 2,
            items: [
              { foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0, fat: 5.4 },
              { foodName: 'Sweet Potato', quantityG: 200, kcal: 172, protein: 3.2, carbs: 41, fat: 0.2 },
              { foodName: 'Mixed Greens', quantityG: 100, kcal: 23, protein: 2.2, carbs: 3.6, fat: 0.4 },
            ],
          },
          {
            name: 'Dinner',
            order: 3,
            items: [
              { foodName: 'Salmon Fillet', quantityG: 150, kcal: 312, protein: 31.5, carbs: 0, fat: 19.5 },
              { foodName: 'Brown Rice', quantityG: 120, kcal: 135, protein: 2.8, carbs: 28.5, fat: 1.1 },
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
              { foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18, carbs: 8, fat: 0.8 },
              { foodName: 'Almonds', quantityG: 30, kcal: 174, protein: 6.4, carbs: 6.5, fat: 15 },
            ],
          },
          {
            name: 'Lunch',
            order: 2,
            items: [
              { foodName: 'Tuna', quantityG: 120, kcal: 132, protein: 30, carbs: 0, fat: 1.1 },
              { foodName: 'Mixed Greens', quantityG: 150, kcal: 35, protein: 3.3, carbs: 5.4, fat: 0.6 },
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
    assignedAt: daysAgo(15),
    dayTypes: ownerNutritionTemplate.dayTypes,
    schedule: {
      weeklyPattern: [
        { dayOfWeek: 1, dayTypeName: 'Training Day' }, // Mon
        { dayOfWeek: 2, dayTypeName: 'Rest Day' },     // Tue
        { dayOfWeek: 3, dayTypeName: 'Training Day' }, // Wed
        { dayOfWeek: 4, dayTypeName: 'Rest Day' },     // Thu
        { dayOfWeek: 5, dayTypeName: 'Training Day' }, // Fri
        { dayOfWeek: 6, dayTypeName: 'Rest Day' },     // Sat
        { dayOfWeek: 0, dayTypeName: 'Rest Day' },     // Sun
      ],
      calendarOverrides: [],
      iterate: true,
    },
  });

  // ── Member 2 Body Tests (3 entries, from owner) ───────────────────────────
  await BodyTestModel.create([
    { memberId: member2._id, trainerId: owner._id, date: daysAgo(45), age: 28, sex: 'female', weight: 65, protocol: '3site', tricep: 18, suprailiac: 16, thigh: 22, bodyFatPct: 22.5, leanMassKg: 50.4, fatMassKg: 14.6, targetWeight: 60, targetBodyFatPct: 18 },
    { memberId: member2._id, trainerId: owner._id, date: daysAgo(28), age: 28, sex: 'female', weight: 64, protocol: '3site', tricep: 16, suprailiac: 14, thigh: 20, bodyFatPct: 20.8, leanMassKg: 50.7, fatMassKg: 13.3, targetWeight: 60, targetBodyFatPct: 18 },
    { memberId: member2._id, trainerId: owner._id, date: daysAgo(7), age: 28, sex: 'female', weight: 62.5, protocol: '3site', tricep: 14, suprailiac: 12, thigh: 18, bodyFatPct: 18.9, leanMassKg: 50.7, fatMassKg: 11.8, targetWeight: 60, targetBodyFatPct: 18 },
  ]);

  // ── Member 2 Workout Sessions (4 sessions) ────────────────────────────────
  const m2DayNames = ['Day A', 'Day B', 'Day C'];
  const m2SessionDays = [daysAgo(15), daysAgo(11), daysAgo(7), daysAgo(3)];
  for (let i = 0; i < m2SessionDays.length; i++) {
    const d = m2SessionDays[i];
    await WorkoutSessionModel.create({
      memberId: member2._id,
      memberPlanId: member2Plan._id,
      dayNumber: (i % 3) + 1,
      dayName: m2DayNames[i % 3],
      startedAt: d,
      completedAt: d,
      sets: [],
    });
  }

  // ── Member 2 Daily Nutrition Logs (4 days) ────────────────────────────────
  await NutritionDailyLogModel.create([
    {
      memberId: member2._id,
      planId: member2NutritionPlan._id,
      date: dateISO(0),
      dayTypeName: 'Training Day',
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          { foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18, carbs: 8, fat: 0.8 },
          { foodName: 'Blueberries', quantityG: 100, kcal: 57, protein: 0.7, carbs: 14, fat: 0.3 },
        ]},
        { name: 'Lunch', order: 2, completed: false, items: [] },
        { name: 'Dinner', order: 3, completed: false, items: [] },
      ],
      dayCompleted: false,
    },
    {
      memberId: member2._id,
      planId: member2NutritionPlan._id,
      date: dateISO(1),
      dayTypeName: 'Rest Day',
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          { foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18, carbs: 8, fat: 0.8 },
        ]},
        { name: 'Lunch', order: 2, completed: true, items: [
          { foodName: 'Tuna', quantityG: 120, kcal: 132, protein: 30, carbs: 0, fat: 1.1 },
        ]},
      ],
      dayCompleted: true,
    },
    {
      memberId: member2._id,
      planId: member2NutritionPlan._id,
      date: dateISO(2),
      dayTypeName: 'Training Day',
      meals: [
        { name: 'Breakfast', order: 1, completed: true, items: [
          { foodName: 'Greek Yoghurt', quantityG: 200, kcal: 118, protein: 18, carbs: 8, fat: 0.8 },
          { foodName: 'Whey Protein', quantityG: 30, kcal: 117, protein: 24, carbs: 2.5, fat: 1.2 },
        ]},
        { name: 'Lunch', order: 2, completed: true, items: [
          { foodName: 'Chicken Breast', quantityG: 150, kcal: 248, protein: 46.5, carbs: 0, fat: 5.4 },
          { foodName: 'Sweet Potato', quantityG: 200, kcal: 172, protein: 3.2, carbs: 41, fat: 0.2 },
        ]},
        { name: 'Dinner', order: 3, completed: true, items: [
          { foodName: 'Salmon Fillet', quantityG: 150, kcal: 312, protein: 31.5, carbs: 0, fat: 19.5 },
        ]},
      ],
      dayCompleted: true,
    },
    {
      memberId: member2._id,
      planId: member2NutritionPlan._id,
      date: dateISO(4),
      dayTypeName: 'Rest Day',
      meals: [
        { name: 'Breakfast', order: 1, completed: false, items: [] },
        { name: 'Lunch', order: 2, completed: true, items: [
          { foodName: 'Tuna', quantityG: 120, kcal: 132, protein: 30, carbs: 0, fat: 1.1 },
          { foodName: 'Mixed Greens', quantityG: 150, kcal: 35, protein: 3.3, carbs: 5.4, fat: 0.6 },
        ]},
      ],
      dayCompleted: false,
    },
  ]);

  console.log('  ✓ Owner plans + member2 data created');

  // ── Body Tests (8 weeks of history) ──────────────────────────────────────
  const bodyTestData = [
    { ago: 56, weight: 82, chest: 26, abdominal: 32, thigh: 20 },
    { ago: 42, weight: 81, chest: 25, abdominal: 30, thigh: 19 },
    { ago: 28, weight: 80, chest: 23, abdominal: 28, thigh: 18 },
    { ago: 14, weight: 79, chest: 22, abdominal: 26, thigh: 17 },
    { ago: 0,  weight: 78, chest: 21, abdominal: 24, thigh: 16 },
  ];

  for (const { ago, weight, chest, abdominal, thigh } of bodyTestData) {
    // Jackson-Pollock 3-site (male) sum of skinfolds
    const sum = chest + abdominal + thigh;
    const age = 28;
    const density = 1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * age;
    const bfPct = Math.round(((4.95 / density) - 4.50) * 1000) / 10;
    const fatMass = Math.round(weight * bfPct / 100 * 10) / 10;
    const leanMass = Math.round((weight - fatMass) * 10) / 10;

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
      leanMassKg: leanMass,
      fatMassKg: fatMass,
      targetWeight: 75,
      targetBodyFatPct: 12,
    });
  }

  // ── Scheduled Sessions ────────────────────────────────────────────────────
  const nextMon = new Date();
  const dow = nextMon.getDay();
  nextMon.setDate(nextMon.getDate() + (dow === 0 ? 1 : 8 - dow));
  nextMon.setHours(9, 0, 0, 0);

  await ScheduledSessionModel.create({
    seriesId: null, trainerId: trainer._id, memberIds: [member._id],
    date: nextMon, startTime: '09:00', endTime: '10:00',
    status: 'scheduled', reminderSentAt: null,
  });

  await ScheduledSessionModel.create({
    seriesId: null, trainerId: trainer._id, memberIds: [member._id],
    date: daysAgo(7), startTime: '09:00', endTime: '10:00',
    status: 'scheduled', reminderSentAt: null,
  });

  // ── Member Injury ─────────────────────────────────────────────────────────
  await MemberInjuryModel.create({
    memberId: member._id,
    title: 'Right shoulder tightness',
    status: 'active',
    recordedAt: daysAgo(14),
    trainerNotes: 'Avoid overhead pressing for 2 weeks',
    memberNotes: null,
    affectedMovements: 'Overhead press, upright row',
  });

  // ── Check-In Config ───────────────────────────────────────────────────────
  await CheckInConfigModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    dayOfWeek: 4,   // Thursday
    hour: 7,
    minute: 0,
    active: true,
    reminderSentAt: null,
  });

  // ── Check-In History (6 weeks) ────────────────────────────────────────────
  const checkInHistory = [
    { ago: 42, sleep: 6, stress: 6, fatigue: 6, hunger: 5, recovery: 5, energy: 6, digestion: 7, weight: 82.0, sleepHrs: 6.5, diet: 'partial' as const, dietDetails: 'Hit protein but went over on carbs most days', wellbeing: 'A bit tired from work stress', notes: 'Work has been hectic, trying to keep up with training' },
    { ago: 35, sleep: 7, stress: 5, fatigue: 5, hunger: 6, recovery: 7, energy: 7, digestion: 7, weight: 81.5, sleepHrs: 7.0, diet: 'yes' as const, dietDetails: 'Followed plan closely, meals prepped Sunday', wellbeing: 'Feeling better this week', notes: 'Upped calories slightly' },
    { ago: 28, sleep: 8, stress: 4, fatigue: 4, hunger: 6, recovery: 8, energy: 8, digestion: 8, weight: 80.5, sleepHrs: 7.5, diet: 'yes' as const, dietDetails: 'Nailed every meal, very consistent', wellbeing: 'Great energy, training is going well', notes: 'No issues this week, everything clicking' },
    { ago: 21, sleep: 7, stress: 5, fatigue: 5, hunger: 7, recovery: 7, energy: 7, digestion: 8, weight: 80.0, sleepHrs: 7.0, diet: 'yes' as const, dietDetails: 'Stuck to plan, had one cheat meal Saturday', wellbeing: 'Consistent week', notes: 'Squat PR this week' },
    { ago: 14, sleep: 6, stress: 7, fatigue: 7, hunger: 5, recovery: 6, energy: 6, digestion: 6, weight: 79.5, sleepHrs: 6.0, diet: 'no' as const, dietDetails: 'Ate out most days, could not track macros', wellbeing: 'Tough week, travel for work', notes: 'Missed 2 sessions' },
    { ago: 7,  sleep: 8, stress: 3, fatigue: 3, hunger: 7, recovery: 9, energy: 9, digestion: 8, weight: 78.0, sleepHrs: 8.0, diet: 'yes' as const, dietDetails: 'Perfect adherence, hit all targets', wellbeing: 'Best week in months, feeling strong', notes: 'Everything dialed in, ready to push harder' },
  ];

  for (const c of checkInHistory) {
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
      waist: null,
      steps: null,
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

  await mongoose.disconnect();

  console.log('\n✓ Dev database seeded successfully!\n');
  console.log('Accounts:');
  console.log('  owner@dev.com   / Dev123!  (owner)');
  console.log('  trainer@dev.com / Dev123!  (trainer)');
  console.log('  member@dev.com  / Dev123!  (member — full data)');
  console.log('  member2@dev.com / Dev123!  (member — managed by owner directly, has plans and nutrition)');
  console.log('\nOwner data:');
  console.log('  • Full Body 3-Day plan template + Cutting Plan — 1800 kcal nutrition template');
  console.log('  • Member 2: owner-managed, 4 workout sessions, 3 body tests, 4 daily nutrition logs');
  console.log('\nData seeded for member@dev.com:');
  console.log('  • PPL training plan + 12 sessions + bench press PB');
  console.log('  • Lean Bulk nutrition plan — Mon/Wed/Fri Training, Tue/Thu/Sat/Sun Rest');
  console.log('  • 1 schedule calendar override (next Monday → Rest Day, deload week)');
  console.log('  • 5 trainer custom foods (AU-themed) + 3 owner custom foods');
  console.log('  • 7 days of nutrition daily logs (varied completion states)');
  console.log('  • 5 body tests (56 days history)');
  console.log('  • 1 upcoming session (next Monday 09:00)');
  console.log('  • 1 past session (last week)');
  console.log('  • 1 active injury (right shoulder)');
  console.log('  • Check-in schedule: Thursday 07:00');
  console.log('  • 6 past check-ins (6 weeks history)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
