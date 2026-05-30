/**
 * E2E test fixture seed.
 * Creates the 3 core test users (owner, trainer, member) plus enough data
 * for the Sprint 1 smoke tests. Extended per sprint as specs are added.
 *
 * Usage (from backend/ directory):
 *   ts-node -r tsconfig-paths/register scripts/seed-e2e.ts [--reset]
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

import {
  UserModel,
  UserProfileModel,
  ExerciseModel,
  PlanTemplateModel,
  MemberPlanModel,
  WorkoutSessionModel,
  PersonalBestModel,
  NutritionTemplateModel,
  MemberNutritionPlanModel,
  BodyTestModel,
  ScheduledSessionModel,
  MemberInjuryModel,
  MemberMedicationModel,
  CheckInConfigModel,
  CheckInModel,
  FoodModel,
  NutritionDailyLogModel,
  InviteTokenModel,
  EquipmentModel,
  ServiceTypeModel,
} from '../src/database/models/index';

// Only set env vars that are not already provided (don't override explicit env from callers)
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: false });

// Use the URI provided at invocation time (MONGODB_URI from the global-setup
// env, which matches whatever DB the backend server is connected to).
// Fall back to MONGODB_E2E_URI or a hardcoded default only when running
// this script standalone.
const E2E_URI =
  process.env.MONGODB_URI ??
  process.env.MONGODB_E2E_URI ??
  'mongodb://power_gym_user:power_gym_pass@localhost:27017/power_gym_e2e?authSource=admin';

export async function seedE2E(): Promise<void> {
  const passwordHash = await bcrypt.hash('TestPass123!', 10);

  // ── Users ────────────────────────────────────────────────────────────────
  const owner = await UserModel.create({
    firstName: 'Test',
    lastName: 'Owner',
    email: 'owner@test.com',
    passwordHash,
    role: 'owner',
    trainerId: null,
  });

  const trainer = await UserModel.create({
    firstName: 'Test',
    lastName: 'Trainer',
    email: 'trainer@test.com',
    passwordHash,
    role: 'trainer',
    trainerId: owner._id,
  });

  await UserModel.create({
    firstName: 'Test',
    lastName: 'Trainer2',
    email: 'trainer2@test.com',
    passwordHash,
    role: 'trainer',
    trainerId: owner._id,
  });

  const member = await UserModel.create({
    firstName: 'Test',
    lastName: 'Member',
    email: 'member@test.com',
    passwordHash,
    role: 'member',
    trainerId: trainer._id,
  });

  // Dedicated member for reassign test — keeps member@test.com's assignment stable
  await UserModel.create({
    firstName: 'Reassign',
    lastName: 'Member',
    email: 'reassign-member@test.com',
    passwordHash,
    role: 'member',
    trainerId: trainer._id,
  });

  // Dedicated member for trainer hub reassign test
  await UserModel.create({
    firstName: 'Hub',
    lastName: 'Reassign',
    email: 'hub-reassign@test.com',
    passwordHash,
    role: 'member',
    trainerId: trainer._id,
  });

  // Dedicated user for password-reset e2e test
  await UserModel.create({
    firstName: 'Reset',
    lastName: 'Test',
    email: 'reset-test@test.com',
    passwordHash,
    role: 'member',
    trainerId: trainer._id,
  });

  // ── User Profiles ────────────────────────────────────────────────────────
  const memberDob = new Date();
  memberDob.setFullYear(memberDob.getFullYear() - 30);
  await UserProfileModel.create({
    userId: member._id,
    sex: 'male',
    dateOfBirth: memberDob,
    height: 178,
    mobile: null,
    address: null,
    avatarUrl: null,
    certifications: [],
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
    lastActivityAt: now,
    autoSealed: false,
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

  // ── Personal Best ─────────────────────────────────────────────────────────
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

  // ── Edit-only Plan Template ───────────────────────────────────────────────
  await PlanTemplateModel.create({
    name: 'E2E Edit Plan',
    description: null,
    createdBy: trainer._id,
    days: [
      {
        dayNumber: 1,
        name: 'Pull',
        exercises: [
          {
            groupId: new mongoose.Types.ObjectId().toString(),
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

  // ── Owner Plan Templates ──────────────────────────────────────────────────
  await PlanTemplateModel.create({
    name: 'E2E Owner Plan',
    description: null,
    createdBy: owner._id,
    days: [
      {
        dayNumber: 1,
        name: 'Push',
        exercises: [
          {
            groupId: new mongoose.Types.ObjectId().toString(),
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

  await PlanTemplateModel.create({
    name: 'E2E Owner Edit Plan',
    description: null,
    createdBy: owner._id,
    days: [
      {
        dayNumber: 1,
        name: 'Pull',
        exercises: [
          {
            groupId: new mongoose.Types.ObjectId().toString(),
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

  // ── Nutrition Template ────────────────────────────────────────────────────
  const todayDow = new Date().getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const todayISO = new Date().toISOString().slice(0, 10);

  const nutritionTemplate = await NutritionTemplateModel.create({
    name: 'E2E Nutrition Template',
    description: null,
    createdBy: trainer._id,
    dayTypes: [
      {
        name: 'Training Day',
        meals: [
          {
            name: 'Lunch',
            order: 1,
            items: [
              {
                foodName: 'Rice',
                quantityG: 100,
                kcal: 365,
                protein: 7.1,
                carbs: 79.0,
                fat: 0.7,
              },
              {
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
      {
        name: 'Rest Day',
        meals: [],
      },
    ],
  });

  // ── Edit-only Nutrition Template ──────────────────────────────────────────
  await NutritionTemplateModel.create({
    name: 'E2E Edit Nutrition',
    description: null,
    createdBy: trainer._id,
    dayTypes: [],
  });

  // ── Owner Nutrition Templates ─────────────────────────────────────────────
  await NutritionTemplateModel.create({
    name: 'E2E Owner Nutrition',
    description: null,
    createdBy: owner._id,
    dayTypes: [],
  });

  await NutritionTemplateModel.create({
    name: 'E2E Owner Edit Nutrition',
    description: null,
    createdBy: owner._id,
    dayTypes: [],
  });

  // ── Member Nutrition Plan ─────────────────────────────────────────────────
  const memberNutritionPlan = await MemberNutritionPlanModel.create({
    memberId: member._id,
    assignedById: trainer._id,
    templateId: nutritionTemplate._id,
    name: nutritionTemplate.name,
    isActive: true,
    assignedAt: new Date(),
    dayTypes: nutritionTemplate.dayTypes,
    schedule: {
      weeklyPattern: [{ dayOfWeek: todayDow, dayTypeName: 'Training Day' }],
      calendarOverrides: [],
      iterate: true,
    },
  });

  // ── Custom Foods ──────────────────────────────────────────────────────────
  await FoodModel.create([
    {
      createdBy: trainer._id,
      name: 'E2E Test Food',
      brand: 'E2E Brand',
      macrosPer100g: { kcal: 200, protein: 20, carbs: 20, fat: 5, sodium: 100 },
      servings: [{ label: '100 g', grams: 100 }],
    },
    {
      createdBy: owner._id,
      name: 'E2E Owner Food',
      brand: null,
      macrosPer100g: { kcal: 150, protein: 10, carbs: 15, fat: 4, sodium: 50 },
      servings: [{ label: '50 g serve', grams: 50 }],
    },
  ]);

  // ── Daily Nutrition Log (today) ───────────────────────────────────────────
  await NutritionDailyLogModel.create({
    memberId: member._id,
    planId: memberNutritionPlan._id,
    date: todayISO,
    dayTypeName: 'Training Day',
    meals: [
      {
        name: 'Lunch',
        order: 1,
        completed: true,
        items: [
          { foodName: 'Rice', quantityG: 100, kcal: 365, protein: 7.1, carbs: 79.0, fat: 0.7 },
          { foodName: 'Chicken Breast', quantityG: 150, kcal: 247.5, protein: 46.5, carbs: 0.0, fat: 5.4 },
        ],
      },
    ],
    dayCompleted: false,
  });

  // ── Owner Body Tests ──────────────────────────────────────────────────────
  const ownerThirtyDaysAgo = new Date();
  ownerThirtyDaysAgo.setDate(ownerThirtyDaysAgo.getDate() - 30);
  await BodyTestModel.create({
    memberId: owner._id,
    trainerId: owner._id,
    date: ownerThirtyDaysAgo,
    age: 35,
    sex: 'male',
    weight: 82,
    protocol: '3site',
    chest: 20,
    abdominal: 24,
    thigh: 16,
    bodyFatPct: 17.5,
    leanMassKg: 67.7,
    fatMassKg: 14.3,
    targetWeight: null,
    targetBodyFatPct: null,
  });
  await BodyTestModel.create({
    memberId: owner._id,
    trainerId: owner._id,
    date: new Date(),
    age: 35,
    sex: 'male',
    weight: 80,
    protocol: '3site',
    chest: 18,
    abdominal: 22,
    thigh: 14,
    bodyFatPct: 16.0,
    leanMassKg: 67.2,
    fatMassKg: 12.8,
    targetWeight: null,
    targetBodyFatPct: null,
  });

  // ── Member Body Tests ─────────────────────────────────────────────────────
  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  await BodyTestModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    date: daysAgo(182),
    age: 30,
    sex: 'male',
    weight: 82.0,
    protocol: '7site',
    chest: 24,
    midaxillary: 18,
    tricep: 18,
    subscapular: 22,
    abdominal: 30,
    suprailiac: 22,
    thigh: 20,
    bodyFatPct: 24.5,
    leanMassKg: 61.9,
    fatMassKg: 20.1,
    targetWeight: 76.0,
    targetBodyFatPct: 19.5,
  });

  await BodyTestModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    date: daysAgo(152),
    age: 30,
    sex: 'male',
    weight: 80.5,
    protocol: '7site',
    chest: 22,
    midaxillary: 17,
    tricep: 17,
    subscapular: 21,
    abdominal: 28,
    suprailiac: 20,
    thigh: 19,
    bodyFatPct: 23.0,
    leanMassKg: 62.0,
    fatMassKg: 18.5,
    targetWeight: 76.0,
    targetBodyFatPct: 19.5,
  });

  await BodyTestModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    date: daysAgo(91),
    age: 30,
    sex: 'male',
    weight: 79.0,
    protocol: '7site',
    chest: 20,
    midaxillary: 16,
    tricep: 16,
    subscapular: 20,
    abdominal: 26,
    suprailiac: 18,
    thigh: 18,
    bodyFatPct: 21.5,
    leanMassKg: 62.0,
    fatMassKg: 17.0,
    targetWeight: 76.0,
    targetBodyFatPct: 19.5,
  });

  await BodyTestModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    date: daysAgo(60),
    age: 30,
    sex: 'male',
    weight: 77.5,
    protocol: '7site',
    chest: 18,
    midaxillary: 15,
    tricep: 15,
    subscapular: 19,
    abdominal: 24,
    suprailiac: 17,
    thigh: 17,
    bodyFatPct: 19.2,
    leanMassKg: 62.7,
    fatMassKg: 14.8,
    targetWeight: 76.0,
    targetBodyFatPct: 19.5,
  });

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

  await ServiceTypeModel.create({
    name: '30min Check-in',
    durationMin: 30,
    pricePerSession: 150,
    currency: 'AUD',
    note: 'Progress review, form check and goal adjustment session.',
    isActive: true,
    createdBy: owner._id,
  });

  // ── Scheduled Sessions ────────────────────────────────────────────────────
  const nextMon = new Date();
  const dow = nextMon.getDay();
  nextMon.setDate(nextMon.getDate() + (dow === 0 ? 1 : 8 - dow));
  nextMon.setHours(0, 0, 0, 0);

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

  const pastDate = (daysBack: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysBack);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  for (const d of [7, 14, 21, 28]) {
    await ScheduledSessionModel.create({
      seriesId: null,
      trainerId: trainer._id,
      memberIds: [member._id],
      date: pastDate(d),
      startTime: '10:00',
      endTime: '11:00',
      status: 'scheduled',
      serviceTypeId: ptService._id,
      reminderSentAt: null,
    });
  }

  // ── Invite Tokens ─────────────────────────────────────────────────────────
  await InviteTokenModel.create({
    token: 'e2e-test-invite-token',
    role: 'trainer',
    invitedBy: owner._id,
    recipientEmail: 'newtrainer@test.com',
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    usedAt: null,
    trainerId: null,
  });

  await InviteTokenModel.create({
    token: 'e2e-pending-invite-token',
    role: 'trainer',
    invitedBy: owner._id,
    recipientEmail: 'pending@test.com',
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    usedAt: null,
    trainerId: null,
  });

  await InviteTokenModel.create({
    token: 'e2e-trainer-pending-invite',
    role: 'member',
    invitedBy: trainer._id,
    recipientEmail: 'trainer-invited@test.com',
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    usedAt: null,
    trainerId: trainer._id,
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
    createdByRole: 'trainer',
  });

  await MemberInjuryModel.create({
    memberId: member._id,
    title: 'E2E Resolve Injury',
    status: 'active',
    recordedAt: new Date(),
    trainerNotes: null,
    memberNotes: null,
    affectedMovements: null,
    createdByRole: 'trainer',
  });

  // ── Member Medications ────────────────────────────────────────────────────
  await MemberMedicationModel.create({
    memberId: member._id,
    name: 'Metoprolol 25mg',
    purpose: 'High blood pressure',
    duration: 'long_term',
    startDate: new Date('2026-01-01'),
    status: 'active',
  });

  await MemberMedicationModel.create({
    memberId: member._id,
    name: 'E2E End Medication',
    purpose: 'Test medication',
    duration: 'short_term',
    startDate: new Date('2026-04-01'),
    status: 'active',
  });

  // ── Equipment ─────────────────────────────────────────────────────────────
  await EquipmentModel.create({
    name: 'E2E Barbell',
    status: 'active',
    brand: null,
    quantity: 1,
    images: [],
    note: null,
  });

  await EquipmentModel.create({
    name: 'E2E Delete Equipment',
    status: 'active',
    brand: null,
    quantity: 1,
    images: [],
    note: null,
  });

  await EquipmentModel.create({
    name: 'E2E Track Machine',
    status: 'maintenance',
    brand: null,
    quantity: 1,
    images: [],
    note: null,
    trackCondition: true,
  });

  await EquipmentModel.create({
    name: 'E2E Edit Equipment',
    status: 'active',
    brand: 'E2E Brand',
    quantity: 2,
    images: [],
    note: 'E2E original note',
    trackCondition: false,
  });

  await EquipmentModel.create({
    name: 'E2E Filter Machine',
    status: 'maintenance',
    brand: null,
    quantity: 1,
    images: [],
    note: null,
    trackCondition: true,
  });

  await EquipmentModel.create({
    name: 'E2E Service Due',
    status: 'active',
    brand: null,
    quantity: 1,
    images: [],
    note: null,
    trackCondition: true,
    nextServiceDate: new Date('2099-06-15'),
  });

  await EquipmentModel.create({
    name: 'E2E Service Overdue',
    status: 'active',
    brand: null,
    quantity: 1,
    images: [],
    note: null,
    trackCondition: true,
    nextServiceDate: new Date('2020-01-01'),
  });

  await EquipmentModel.create({
    name: 'E2E Service Edit',
    status: 'active',
    brand: null,
    quantity: 1,
    images: [],
    note: null,
    trackCondition: true,
    nextServiceDate: null,
  });

  // ── Check-In Config ───────────────────────────────────────────────────────
  await CheckInConfigModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    dayOfWeek: 4,
    hour: 7,
    minute: 0,
    active: true,
    lastReminderSentAt: null,
  });

  // ── Past Check-In (last week) ─────────────────────────────────────────────
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  await CheckInModel.create({
    memberId: member._id,
    trainerId: trainer._id,
    submittedAt: oneWeekAgo,
    sleepQuality: 8,
    stress: 3,
    fatigue: 4,
    hunger: 6,
    recovery: 7,
    energy: 8,
    digestion: 7,
    weight: 76.5,
    waist: null,
    steps: null,
    exerciseMinutes: null,
    walkRunDistance: null,
    sleepHours: 7.5,
    dietDetails: 'Followed the plan well',
    stuckToDiet: 'yes',
    wellbeing: 'Feeling strong this week',
    notes: '',
    photos: [],
  });

  // ── Historical Check-ins (20 weeks) ──────────────────────────────────────
  const weekAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n * 7 - 3);
    d.setHours(20, 0, 0, 0);
    return d;
  };

  const checkInPhotos = [
    ['https://picsum.photos/seed/gym-ci-1a/400/600', 'https://picsum.photos/seed/gym-ci-1b/400/600'],
    [],
    ['https://picsum.photos/seed/gym-ci-3a/400/600'],
    [],
    ['https://picsum.photos/seed/gym-ci-5a/400/600', 'https://picsum.photos/seed/gym-ci-5b/400/600'],
    [], [], ['https://picsum.photos/seed/gym-ci-8a/400/600'],
    [], ['https://picsum.photos/seed/gym-ci-10a/400/600'],
    [], [], ['https://picsum.photos/seed/gym-ci-13a/400/600', 'https://picsum.photos/seed/gym-ci-13b/400/600'],
    [], ['https://picsum.photos/seed/gym-ci-15a/400/600'],
    [], [], ['https://picsum.photos/seed/gym-ci-18a/400/600'],
    [], ['https://picsum.photos/seed/gym-ci-20a/400/600', 'https://picsum.photos/seed/gym-ci-20b/400/600'],
  ];

  const stuckOptions: Array<'yes' | 'no' | 'partial'> = [
    'yes', 'partial', 'yes', 'yes', 'partial', 'yes', 'yes', 'no',
    'yes', 'yes', 'yes', 'partial', 'yes', 'yes', 'yes', 'yes',
    'partial', 'yes', 'yes', 'yes',
  ];

  for (let i = 0; i < 20; i++) {
    await CheckInModel.create({
      memberId: member._id,
      trainerId: trainer._id,
      submittedAt: weekAgo(20 - i),
      sleepQuality: 6 + Math.floor(i / 5),
      stress: 5 - Math.floor(i / 7),
      fatigue: 5 - Math.floor(i / 7),
      hunger: 6,
      recovery: 6 + Math.floor(i / 6),
      energy: 6 + Math.floor(i / 5),
      digestion: 7,
      weight: parseFloat((82.0 - i * 0.4).toFixed(1)),
      waist: null,
      steps: 8000 + i * 200,
      exerciseMinutes: 45,
      walkRunDistance: null,
      sleepHours: 7.0 + (i % 3) * 0.5,
      dietDetails: 'Followed the plan',
      stuckToDiet: stuckOptions[i],
      wellbeing: 'Feeling good',
      notes: '',
      photos: checkInPhotos[i],
    });
  }
}

// ── CLI entry point ──────────────────────────────────────────────────────────
async function main() {
  const shouldReset = process.argv.includes('--reset');

  await mongoose.connect(E2E_URI);
  const db = mongoose.connection.db!;

  if (shouldReset) {
    const collections = await db.listCollections().toArray();
    await Promise.all(collections.map((col) => db.dropCollection(col.name)));
    console.log('E2E DB reset complete.');
  }

  await seedE2E();
  console.log('E2E seed complete.');
  await mongoose.disconnect();
}

if (process.argv[1] === __filename) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
