import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
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
import { InviteTokenModel } from '../src/lib/db/models/invite-token.model';
import { ScheduledSessionModel } from '../src/lib/db/models/scheduled-session.model';
import { MemberInjuryModel } from '../src/lib/db/models/member-injury.model';
import { EquipmentModel } from '../src/lib/db/models/equipment.model';

export async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  // ── Users ────────────────────────────────────────────────────────────────
  const owner = await UserModel.create({
    name: 'Test Owner',
    email: 'owner@test.com',
    passwordHash,
    role: 'owner',
    trainerId: null,
  });

  const trainer = await UserModel.create({
    name: 'Test Trainer',
    email: 'trainer@test.com',
    passwordHash,
    role: 'trainer',
    trainerId: owner._id,
  });

  await UserModel.create({
    name: 'Test Trainer 2',
    email: 'trainer2@test.com',
    passwordHash,
    role: 'trainer',
    trainerId: owner._id,
  });

  const member = await UserModel.create({
    name: 'Test Member',
    email: 'member@test.com',
    passwordHash,
    role: 'member',
    trainerId: trainer._id,
  });

  // Dedicated member for reassign test — keeps member@test.com's assignment stable
  await UserModel.create({
    name: 'Reassign Member',
    email: 'reassign-member@test.com',
    passwordHash,
    role: 'member',
    trainerId: trainer._id,
  });

  // Dedicated member for trainer hub reassign test
  await UserModel.create({
    name: 'Hub Reassign Member',
    email: 'hub-reassign@test.com',
    passwordHash,
    role: 'member',
    trainerId: trainer._id,
  });

  // ── Exercise ─────────────────────────────────────────────────────────────
  const benchPress = await ExerciseModel.create({
    name: 'Bench Press',
    muscleGroup: 'chest',
    isGlobal: true,
    createdBy: null,
    imageUrl: null,
    isBodyweight: false,
  });

  // ── Foods ─────────────────────────────────────────────────────────────────
  const rice = await FoodModel.create({
    name: 'Rice',
    brand: null,
    source: 'manual',
    isGlobal: true,
    per100g: { kcal: 365, protein: 7.1, carbs: 79.0, fat: 0.7 },
  });

  const chickenBreast = await FoodModel.create({
    name: 'Chicken Breast',
    brand: null,
    source: 'manual',
    isGlobal: true,
    per100g: { kcal: 165, protein: 31.0, carbs: 0.0, fat: 3.6 },
  });

  // ── Plan Template ─────────────────────────────────────────────────────────
  const groupId = new mongoose.Types.ObjectId().toString();
  const planTemplate = await PlanTemplateModel.create({
    name: 'E2E Test Plan',
    description: null,
    createdBy: trainer._id,
    days: [
      {
        dayNumber: 1,
        name: 'Push',
        exercises: [
          {
            groupId,
            isSuperset: false,
            exerciseId: benchPress._id,
            exerciseName: 'Bench Press',
            imageUrl: null,
            isBodyweight: false,
            sets: 3,
            repsMin: 8,
            repsMax: 12,
            restSeconds: 90,
          },
        ],
      },
    ],
  });

  // ── Member Plan (deep copy) ───────────────────────────────────────────────
  const memberPlan = await MemberPlanModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    templateId: planTemplate._id,
    name: planTemplate.name,
    days: planTemplate.days,
    isActive: true,
    assignedAt: new Date(),
  });

  // ── Workout Session ───────────────────────────────────────────────────────
  const now = new Date();
  const session = await WorkoutSessionModel.create({
    memberId: member._id,
    memberPlanId: memberPlan._id,
    dayNumber: 1,
    dayName: 'Push',
    startedAt: now,
    completedAt: now,
    sets: [
      {
        exerciseId: benchPress._id,
        exerciseName: 'Bench Press',
        groupId,
        isSuperset: false,
        isBodyweight: false,
        setNumber: 1,
        prescribedRepsMin: 8,
        prescribedRepsMax: 12,
        isExtraSet: false,
        actualWeight: 60,
        actualReps: 8,
        completedAt: now,
      },
    ],
  });

  // ── Personal Best (Brzycki formula: 60 / (1.0278 - 0.0278 × 8) ≈ 74.5) ──
  await PersonalBestModel.create({
    memberId: member._id,
    exerciseId: benchPress._id,
    exerciseName: 'Bench Press',
    bestWeight: 60,
    bestReps: 8,
    estimatedOneRM: 74.5,
    achievedAt: now,
    sessionId: session._id,
  });

  // ── Edit-only Plan Template (used by trainer/plans edit test) ────────────
  await PlanTemplateModel.create({
    name: 'E2E Edit Plan',
    description: null,
    createdBy: trainer._id,
    days: [
      {
        dayNumber: 1,
        name: 'Pull',
        exercises: [],
      },
    ],
  });

  // ── Nutrition Template ────────────────────────────────────────────────────
  const nutritionTemplate = await NutritionTemplateModel.create({
    name: 'E2E Nutrition Template',
    description: null,
    createdBy: trainer._id,
    dayTypes: [
      {
        name: 'Training Day',
        targetKcal: 2500,
        targetProtein: 180,
        targetCarbs: 280,
        targetFat: 70,
        meals: [
          {
            name: 'Lunch',
            order: 1,
            items: [
              {
                foodId: rice._id,
                foodName: 'Rice',
                quantityG: 100,
                kcal: 365,
                protein: 7.1,
                carbs: 79.0,
                fat: 0.7,
              },
              {
                foodId: chickenBreast._id,
                foodName: 'Chicken Breast',
                quantityG: 150,
                kcal: 247.5,
                protein: 46.5,
                carbs: 0.0,
                fat: 5.4,
              },
            ],
          },
        ],
      },
    ],
  });

  // ── Edit-only Nutrition Template (used by trainer/nutrition edit test) ───
  await NutritionTemplateModel.create({
    name: 'E2E Edit Nutrition',
    description: null,
    createdBy: trainer._id,
    dayTypes: [],
  });

  // ── Member Nutrition Plan (deep copy) ────────────────────────────────────
  await MemberNutritionPlanModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    templateId: nutritionTemplate._id,
    name: nutritionTemplate.name,
    isActive: true,
    assignedAt: new Date(),
    dayTypes: nutritionTemplate.dayTypes,
  });

  // ── Body Tests ────────────────────────────────────────────────────────────
  // Older test — 30 days ago (used by member body-tests history test)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  await BodyTestModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    date: thirtyDaysAgo,
    age: 30,
    sex: 'male',
    weight: 73,
    protocol: '3site',
    chest: 22,
    abdominal: 27,
    thigh: 17,
    bodyFatPct: 20.0,
    leanMassKg: 58.4,
    fatMassKg: 14.6,
    targetWeight: null,
    targetBodyFatPct: null,
  });

  // Latest test — today
  await BodyTestModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    date: new Date(),
    age: 30,
    sex: 'male',
    weight: 75,
    protocol: '3site',
    chest: 20,
    abdominal: 25,
    thigh: 15,
    bodyFatPct: 18.0,
    leanMassKg: 61.5,
    fatMassKg: 13.5,
    targetWeight: null,
    targetBodyFatPct: null,
  });

  // ── Scheduled Sessions ────────────────────────────────────────────────────
  // Always seed on "next Monday" so navigating forward one week always reveals them
  const nextMon = new Date();
  const dow = nextMon.getDay(); // 0=Sun … 6=Sat
  nextMon.setDate(nextMon.getDate() + (dow === 0 ? 1 : 8 - dow));
  nextMon.setHours(0, 0, 0, 0);

  // Session A — used by view/edit tests (never cancelled by any spec)
  await ScheduledSessionModel.create({
    seriesId: null,
    trainerId: trainer._id,
    memberIds: [member._id],
    date: nextMon,
    startTime: '09:00',
    endTime: '10:00',
    status: 'scheduled',
    reminderSentAt: null,
  });

  // Session B — used by owner cancel test (same member, different time)
  await ScheduledSessionModel.create({
    seriesId: null,
    trainerId: trainer._id,
    memberIds: [member._id],
    date: nextMon,
    startTime: '14:00',
    endTime: '15:00',
    status: 'scheduled',
    reminderSentAt: null,
  });

  // Session C — used by trainer cancel test
  await ScheduledSessionModel.create({
    seriesId: null,
    trainerId: trainer._id,
    memberIds: [member._id],
    date: nextMon,
    startTime: '11:00',
    endTime: '12:00',
    status: 'scheduled',
    reminderSentAt: null,
  });

  // Past session — appears in member history
  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  await ScheduledSessionModel.create({
    seriesId: null,
    trainerId: trainer._id,
    memberIds: [member._id],
    date: lastWeek,
    startTime: '10:00',
    endTime: '11:00',
    status: 'scheduled',
    reminderSentAt: null,
  });

  // ── Invite Tokens ─────────────────────────────────────────────────────────
  // Used by auth.spec.ts register test
  await InviteTokenModel.create({
    token: 'e2e-test-invite-token',
    role: 'trainer',
    invitedBy: owner._id,
    recipientEmail: 'newtrainer@test.com',
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    usedAt: null,
    trainerId: null,
  });

  // Stable pending invite checked by owner/invites.spec.ts
  await InviteTokenModel.create({
    token: 'e2e-pending-invite-token',
    role: 'trainer',
    invitedBy: owner._id,
    recipientEmail: 'pending@test.com',
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    usedAt: null,
    trainerId: null,
  });

  // ── Member Injuries ───────────────────────────────────────────────────────
  await MemberInjuryModel.create({
    memberId: member._id,
    title: 'Left knee strain',
    status: 'active',
    recordedAt: new Date(),
    trainerNotes: null,
    memberNotes: null,
    affectedMovements: 'Avoid squats, lunges',
  });

  // dedicated to resolve test — resolved by that spec only
  await MemberInjuryModel.create({
    memberId: member._id,
    title: 'E2E Resolve Injury',
    status: 'active',
    recordedAt: new Date(),
    trainerNotes: null,
    memberNotes: null,
    affectedMovements: null,
  });

  // ── Equipment ─────────────────────────────────────────────────────────────
  // stable list item — never modified by any spec
  await EquipmentModel.create({
    name: 'E2E Barbell',
    category: 'strength',
    quantity: 1,
    status: 'active',
    purchasedAt: null,
    notes: null,
  });

  // dedicated to delete test — deleted by that spec only
  await EquipmentModel.create({
    name: 'E2E Delete Equipment',
    category: 'cardio',
    quantity: 1,
    status: 'active',
    purchasedAt: null,
    notes: null,
  });
}
