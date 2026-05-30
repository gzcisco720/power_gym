/**
 * Unit tests for the dev seed script.
 *
 * Strategy: mock all Mongoose model operations and assert the seed
 * functions call them with the correct arguments.
 */

import type { Types } from 'mongoose';

// ── Minimal stubs ─────────────────────────────────────────────────────────────

function makeFakeId(): Types.ObjectId {
  return { toString: () => 'fake-id' } as unknown as Types.ObjectId;
}

function makeModel(name: string) {
  const docs: Record<string, unknown>[] = [];
  return {
    _name: name,
    _docs: docs,
    findOneAndUpdate: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((data: unknown) => {
      const doc = {
        ...(Array.isArray(data) ? {} : (data as object)),
        _id: makeFakeId(),
      };
      if (Array.isArray(data)) {
        const arr = (data as Record<string, unknown>[]).map((d) => ({
          ...d,
          _id: makeFakeId(),
        }));
        docs.push(...arr);
        return Promise.resolve(arr);
      }
      docs.push(doc);
      return Promise.resolve(doc);
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
  };
}

// ── Mock modules ──────────────────────────────────────────────────────────────

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  Types: {
    ObjectId: jest.fn().mockImplementation(() => makeFakeId()),
  },
  connection: {
    db: {
      listCollections: jest
        .fn()
        .mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      dropCollection: jest.fn().mockResolvedValue(undefined),
    },
  },
  models: {},
  model: jest.fn().mockReturnValue({ findOneAndUpdate: jest.fn() }),
  Schema: jest.fn().mockImplementation(() => ({
    index: jest.fn(),
    virtual: jest.fn().mockReturnValue({ get: jest.fn() }),
  })),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$fakehash'),
}));

jest.mock('dotenv', () => ({ config: jest.fn() }));
jest.mock('path', () => ({
  join: jest.fn((...parts: string[]) => parts.join('/')),
}));
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockImplementation((p: string) => {
    if (p.includes('exercises_catalog.json')) {
      return JSON.stringify([
        {
          id: 'ex1',
          name: 'Bench Press',
          body_parts: ['chest'],
          image: 'http://img/bp/0.jpg',
        },
        {
          id: 'ex2',
          name: 'Squat',
          body_parts: ['legs'],
          image: 'http://img/sq/0.jpg',
        },
        {
          id: 'ex3',
          name: 'Deadlift',
          body_parts: ['back'],
          image: 'http://img/dl/0.jpg',
        },
      ]);
    }
    if (p.includes('gym_equipment.json')) {
      return JSON.stringify({ equipment: [{ id: 'eq1', name: 'Barbell' }] });
    }
    return '[]';
  }),
}));

// ── Model mocks ───────────────────────────────────────────────────────────────

const UserModelMock = makeModel('User');
const UserProfileModelMock = makeModel('UserProfile');
const ExerciseModelMock = makeModel('Exercise');
const EquipmentModelMock = makeModel('Equipment');
const ConditionReportModelMock = makeModel('ConditionReport');
const PlanTemplateModelMock = makeModel('PlanTemplate');
const MemberPlanModelMock = makeModel('MemberPlan');
const WorkoutSessionModelMock = makeModel('WorkoutSession');
const PersonalBestModelMock = makeModel('PersonalBest');
const NutritionTemplateModelMock = makeModel('NutritionTemplate');
const MemberNutritionPlanModelMock = makeModel('MemberNutritionPlan');
const BodyTestModelMock = makeModel('BodyTest');
const ScheduledSessionModelMock = makeModel('ScheduledSession');
const MemberInjuryModelMock = makeModel('MemberInjury');
const CheckInConfigModelMock = makeModel('CheckInConfig');
const CheckInModelMock = makeModel('CheckIn');
const FoodModelMock = makeModel('Food');
const NutritionDailyLogModelMock = makeModel('NutritionDailyLog');
const InviteTokenModelMock = makeModel('InviteToken');
const SelfWorkoutLogModelMock = makeModel('SelfWorkoutLog');
const ServiceTypeModelMock = makeModel('ServiceType');
const ExerciseNoteModelMock = makeModel('ExerciseNote');

jest.mock('../database/models/index', () => ({
  UserModel: UserModelMock,
  UserProfileModel: UserProfileModelMock,
  ExerciseModel: ExerciseModelMock,
  ExerciseNoteModel: ExerciseNoteModelMock,
  EquipmentModel: EquipmentModelMock,
  ConditionReportModel: ConditionReportModelMock,
  PlanTemplateModel: PlanTemplateModelMock,
  MemberPlanModel: MemberPlanModelMock,
  WorkoutSessionModel: WorkoutSessionModelMock,
  PersonalBestModel: PersonalBestModelMock,
  NutritionTemplateModel: NutritionTemplateModelMock,
  MemberNutritionPlanModel: MemberNutritionPlanModelMock,
  BodyTestModel: BodyTestModelMock,
  ScheduledSessionModel: ScheduledSessionModelMock,
  MemberInjuryModel: MemberInjuryModelMock,
  CheckInConfigModel: CheckInConfigModelMock,
  CheckInModel: CheckInModelMock,
  FoodModel: FoodModelMock,
  NutritionDailyLogModel: NutritionDailyLogModelMock,
  InviteTokenModel: InviteTokenModelMock,
  SelfWorkoutLogModel: SelfWorkoutLogModelMock,
  ServiceTypeModel: ServiceTypeModelMock,
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { seedCatalogs, seedDevData } from './seed-dev';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('seed-dev', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset docs
    UserModelMock._docs.length = 0;
  });

  describe('seedCatalogs', () => {
    it('upserts all exercises from exercises_catalog.json (count matches file length)', async () => {
      await seedCatalogs();

      // The mock fs returns 3 exercises
      expect(ExerciseModelMock.findOneAndUpdate).toHaveBeenCalledTimes(3);
      // Each call should upsert with { upsert: true }
      const calls = ExerciseModelMock.findOneAndUpdate.mock.calls as [
        unknown,
        unknown,
        { upsert: boolean },
      ][];
      expect(calls[0][2]).toEqual(expect.objectContaining({ upsert: true }));
      expect(calls[1][2]).toEqual(expect.objectContaining({ upsert: true }));
      expect(calls[2][2]).toEqual(expect.objectContaining({ upsert: true }));
    });
  });

  describe('seedDevData', () => {
    it('creates exactly 4 users with emails owner@dev.com, trainer@dev.com, member@dev.com, member2@dev.com', async () => {
      // Mock create to return objects with predictable _ids
      let callCount = 0;
      UserModelMock.create.mockImplementation((data: unknown) => {
        callCount++;
        const doc = {
          ...(data as object),
          _id: {
            toString: () => `user-${callCount}`,
          } as unknown as Types.ObjectId,
        };
        return Promise.resolve(doc);
      });

      // PlanTemplate mock needs to return objects with days
      PlanTemplateModelMock.create.mockImplementation((data: unknown) => {
        return Promise.resolve({
          ...(data as object),
          _id: makeFakeId(),
          days: (data as { days: unknown[] }).days ?? [],
        });
      });

      // NutritionTemplate mock needs to return objects with dayTypes
      NutritionTemplateModelMock.create.mockImplementation((data: unknown) => {
        return Promise.resolve({
          ...(data as object),
          _id: makeFakeId(),
          dayTypes: (data as { dayTypes: unknown[] }).dayTypes ?? [],
        });
      });

      // ServiceType mock
      ServiceTypeModelMock.create.mockResolvedValue({ _id: makeFakeId() });

      await seedDevData();

      const emailArgs = (
        UserModelMock.create.mock.calls as [{ email: string }][]
      ).map((call) => call[0].email);
      expect(emailArgs).toHaveLength(4);
      expect(emailArgs).toContain('owner@dev.com');
      expect(emailArgs).toContain('trainer@dev.com');
      expect(emailArgs).toContain('member@dev.com');
      expect(emailArgs).toContain('member2@dev.com');
    });

    it('member.trainerId references trainer._id and member2.trainerId references owner._id', async () => {
      const ownerId = {
        toString: () => 'owner-id',
      } as unknown as Types.ObjectId;
      const trainerId = {
        toString: () => 'trainer-id',
      } as unknown as Types.ObjectId;
      UserModelMock.create.mockImplementation((data: unknown) => {
        const d = data as { email: string };
        let id: Types.ObjectId;
        if (d.email === 'owner@dev.com') id = ownerId;
        else if (d.email === 'trainer@dev.com') id = trainerId;
        else id = makeFakeId();
        return Promise.resolve({ ...d, _id: id });
      });

      PlanTemplateModelMock.create.mockImplementation((data: unknown) => {
        return Promise.resolve({
          ...(data as object),
          _id: makeFakeId(),
          days: (data as { days: unknown[] }).days ?? [],
        });
      });

      NutritionTemplateModelMock.create.mockImplementation((data: unknown) => {
        return Promise.resolve({
          ...(data as object),
          _id: makeFakeId(),
          dayTypes: (data as { dayTypes: unknown[] }).dayTypes ?? [],
        });
      });

      ServiceTypeModelMock.create.mockResolvedValue({ _id: makeFakeId() });

      await seedDevData();

      type UserCreateArg = { email: string; trainerId: Types.ObjectId | null };
      const userCalls = (
        UserModelMock.create.mock.calls as [UserCreateArg][]
      ).map((c) => c[0]);
      const memberCall = userCalls.find((u) => u.email === 'member@dev.com');
      const member2Call = userCalls.find((u) => u.email === 'member2@dev.com');

      expect(memberCall).toBeDefined();
      expect(member2Call).toBeDefined();
      // member.trainerId should be trainer._id
      expect(memberCall!.trainerId).toBe(trainerId);
      // member2.trainerId should be owner._id
      expect(member2Call!.trainerId).toBe(ownerId);
    });
  });
});
