import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';
import type { UserRepository } from '../repositories/user.repository';
import type { UserProfileRepository } from '../repositories/user-profile.repository';
import type { MemberPlanRepository } from '../repositories/member-plan.repository';
import type { MemberNutritionPlanRepository } from '../repositories/member-nutrition-plan.repository';
import type { PersonalBestRepository } from '../repositories/personal-best.repository';
import type { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import type { PlanTemplateRepository } from '../repositories/plan-template.repository';
import { Types } from 'mongoose';
import type { IUser } from '../database/models/user.model';
import type { IUserProfile } from '../database/models/user-profile.model';
import type { IMemberPlan } from '../database/models/member-plan.model';
import type { IPersonalBest } from '../database/models/personal-best.model';

const ownerId = new Types.ObjectId();
const trainerId = new Types.ObjectId();
const otherTrainerId = new Types.ObjectId();
const memberId = new Types.ObjectId();

function makeUser(overrides: Partial<IUser> = {}): IUser {
  return {
    _id: memberId,
    firstName: 'Test',
    lastName: 'Member',
    email: 'member@test.com',
    role: 'member',
    trainerId,
    ...overrides,
  } as unknown as IUser;
}

function makeProfile(overrides: Partial<IUserProfile> = {}): IUserProfile {
  return {
    _id: new Types.ObjectId(),
    userId: memberId,
    mobile: '',
    ...overrides,
  } as unknown as IUserProfile;
}

function makePlan(overrides: Partial<IMemberPlan> = {}): IMemberPlan {
  return {
    _id: new Types.ObjectId(),
    memberId,
    name: 'Strength Block',
    isActive: true,
    days: [],
    ...overrides,
  } as unknown as IMemberPlan;
}

function makePb(overrides: Partial<IPersonalBest> = {}): IPersonalBest {
  return {
    _id: new Types.ObjectId(),
    memberId,
    exerciseName: 'Bench Press',
    bestWeight: 100,
    bestReps: 5,
    estimatedOneRM: 116.7,
    achievedAt: new Date(),
    ...overrides,
  } as unknown as IPersonalBest;
}

function makeUserRepo(
  overrides: Record<string, jest.Mock> = {},
): UserRepository {
  return {
    findById: jest.fn().mockResolvedValue(makeUser()),
    ...overrides,
  } as unknown as UserRepository;
}

function makeProfileRepo(
  overrides: Record<string, jest.Mock> = {},
): UserProfileRepository {
  return {
    findByUserId: jest.fn().mockResolvedValue(makeProfile()),
    ...overrides,
  } as unknown as UserProfileRepository;
}

function makeMemberPlanRepo(
  overrides: Record<string, jest.Mock> = {},
): MemberPlanRepository {
  return {
    findActive: jest.fn().mockResolvedValue(makePlan()),
    create: jest.fn(),
    deactivateAll: jest.fn(),
    ...overrides,
  } as unknown as MemberPlanRepository;
}

function makeNutritionPlanRepo(
  overrides: Record<string, jest.Mock> = {},
): MemberNutritionPlanRepository {
  return {
    findActive: jest.fn().mockResolvedValue(null),
    findAllByMember: jest.fn().mockResolvedValue([]),
    create: jest.fn(),
    deactivateAll: jest.fn(),
    updateSchedule: jest.fn(),
    ...overrides,
  } as unknown as MemberNutritionPlanRepository;
}

function makePbRepo(
  overrides: Record<string, jest.Mock> = {},
): PersonalBestRepository {
  return {
    findByMember: jest.fn().mockResolvedValue([makePb()]),
    ...overrides,
  } as unknown as PersonalBestRepository;
}

function makeSessionRepo(
  overrides: Record<string, jest.Mock> = {},
): WorkoutSessionRepository {
  return {
    findExerciseHistory: jest.fn().mockResolvedValue([
      {
        date: new Date('2024-01-15'),
        estimatedOneRM: 116.7,
        bestWeight: 100,
        bestReps: 5,
      },
    ]),
    findLastWeightsForExercises: jest.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as WorkoutSessionRepository;
}

function makePlanTemplateRepo(
  overrides: Record<string, jest.Mock> = {},
): PlanTemplateRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as PlanTemplateRepository;
}

describe('MembersService', () => {
  let service: MembersService;
  let userRepo: UserRepository;
  let profileRepo: UserProfileRepository;
  let memberPlanRepo: MemberPlanRepository;
  let nutritionPlanRepo: MemberNutritionPlanRepository;
  let pbRepo: PersonalBestRepository;
  let sessionRepo: WorkoutSessionRepository;
  let planTemplateRepo: PlanTemplateRepository;

  function buildService() {
    service = new MembersService(
      userRepo,
      profileRepo,
      memberPlanRepo,
      nutritionPlanRepo,
      pbRepo,
      sessionRepo,
      planTemplateRepo,
    );
  }

  beforeEach(() => {
    planTemplateRepo = makePlanTemplateRepo();
  });

  describe('getProfile', () => {
    it('returns member profile when requester is the member trainer', async () => {
      userRepo = makeUserRepo();
      profileRepo = makeProfileRepo();
      memberPlanRepo = makeMemberPlanRepo();
      nutritionPlanRepo = makeNutritionPlanRepo();
      pbRepo = makePbRepo();
      sessionRepo = makeSessionRepo();
      buildService();

      const result = await service.getProfile(
        memberId.toString(),
        trainerId.toString(),
        'trainer',
      );
      expect(result).toBeDefined();
    });

    it('returns member profile when requester is owner', async () => {
      userRepo = makeUserRepo();
      profileRepo = makeProfileRepo();
      memberPlanRepo = makeMemberPlanRepo();
      nutritionPlanRepo = makeNutritionPlanRepo();
      pbRepo = makePbRepo();
      sessionRepo = makeSessionRepo();
      buildService();

      const result = await service.getProfile(
        memberId.toString(),
        ownerId.toString(),
        'owner',
      );
      expect(result).toBeDefined();
    });

    it('throws 403 when requester is a different trainer', async () => {
      userRepo = makeUserRepo();
      profileRepo = makeProfileRepo();
      memberPlanRepo = makeMemberPlanRepo();
      nutritionPlanRepo = makeNutritionPlanRepo();
      pbRepo = makePbRepo();
      sessionRepo = makeSessionRepo();
      buildService();

      await expect(
        service.getProfile(
          memberId.toString(),
          otherTrainerId.toString(),
          'trainer',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws 404 when member not found', async () => {
      userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(null) });
      profileRepo = makeProfileRepo();
      memberPlanRepo = makeMemberPlanRepo();
      nutritionPlanRepo = makeNutritionPlanRepo();
      pbRepo = makePbRepo();
      sessionRepo = makeSessionRepo();
      buildService();

      await expect(
        service.getProfile(
          memberId.toString(),
          trainerId.toString(),
          'trainer',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActivePlan', () => {
    it('returns the active member plan with days', async () => {
      userRepo = makeUserRepo();
      profileRepo = makeProfileRepo();
      memberPlanRepo = makeMemberPlanRepo();
      nutritionPlanRepo = makeNutritionPlanRepo();
      pbRepo = makePbRepo();
      sessionRepo = makeSessionRepo();
      buildService();

      const plan = await service.getActivePlan(
        memberId.toString(),
        trainerId.toString(),
        'trainer',
      );
      expect(plan).not.toBeNull();
      expect((plan as IMemberPlan).name).toBe('Strength Block');
    });

    it('throws 403 when requester is a different trainer', async () => {
      userRepo = makeUserRepo();
      profileRepo = makeProfileRepo();
      memberPlanRepo = makeMemberPlanRepo();
      nutritionPlanRepo = makeNutritionPlanRepo();
      pbRepo = makePbRepo();
      sessionRepo = makeSessionRepo();
      buildService();

      await expect(
        service.getActivePlan(
          memberId.toString(),
          otherTrainerId.toString(),
          'trainer',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getProgress', () => {
    it('returns 1RM trend series per exercise', async () => {
      const exerciseId = new Types.ObjectId().toString();
      userRepo = makeUserRepo();
      profileRepo = makeProfileRepo();
      memberPlanRepo = makeMemberPlanRepo();
      nutritionPlanRepo = makeNutritionPlanRepo();
      pbRepo = makePbRepo();
      sessionRepo = makeSessionRepo({
        findExerciseHistory: jest.fn().mockResolvedValue([
          {
            date: new Date('2024-01-15'),
            estimatedOneRM: 116.7,
            bestWeight: 100,
            bestReps: 5,
          },
        ]),
      });
      buildService();

      const result = await service.getProgress(
        memberId.toString(),
        exerciseId,
        trainerId.toString(),
        'trainer',
      );
      expect(result.history).toHaveLength(1);
      expect(result.history[0].estimatedOneRM).toBe(116.7);
    });

    it('throws 403 when requester is a different trainer', async () => {
      const exerciseId = new Types.ObjectId().toString();
      userRepo = makeUserRepo();
      profileRepo = makeProfileRepo();
      memberPlanRepo = makeMemberPlanRepo();
      nutritionPlanRepo = makeNutritionPlanRepo();
      pbRepo = makePbRepo();
      sessionRepo = makeSessionRepo();
      buildService();

      await expect(
        service.getProgress(
          memberId.toString(),
          exerciseId,
          otherTrainerId.toString(),
          'trainer',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getPbs', () => {
    it('returns personal bests for the member', async () => {
      userRepo = makeUserRepo();
      profileRepo = makeProfileRepo();
      memberPlanRepo = makeMemberPlanRepo();
      nutritionPlanRepo = makeNutritionPlanRepo();
      pbRepo = makePbRepo();
      sessionRepo = makeSessionRepo();
      buildService();

      const pbs = await service.getPbs(
        memberId.toString(),
        trainerId.toString(),
        'trainer',
      );
      expect(pbs).toHaveLength(1);
      expect(pbs[0].exerciseName).toBe('Bench Press');
    });

    it('throws 403 when requester is a different trainer', async () => {
      userRepo = makeUserRepo();
      profileRepo = makeProfileRepo();
      memberPlanRepo = makeMemberPlanRepo();
      nutritionPlanRepo = makeNutritionPlanRepo();
      pbRepo = makePbRepo();
      sessionRepo = makeSessionRepo();
      buildService();

      await expect(
        service.getPbs(
          memberId.toString(),
          otherTrainerId.toString(),
          'trainer',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
