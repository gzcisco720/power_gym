import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MembersService } from './members.service';
import { User } from '../../common/models/user.model';
import { BodyTest } from '../../common/models/body-test.model';
import { CheckIn } from '../../common/models/check-in.model';
import { MemberInjury } from '../../common/models/member-injury.model';
import { MemberMedication } from '../../common/models/member-medication.model';
import { WorkoutSession } from '../../common/models/workout-session.model';
import { PersonalBest } from '../../common/models/personal-best.model';
import { MemberPlan } from '../../common/models/member-plan.model';

const OWNER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();
const OTHER_TRAINER_ID = new Types.ObjectId().toString();
const MEMBER_ID = new Types.ObjectId().toString();
const MEMBER2_ID = new Types.ObjectId().toString();

function makeMember(
  id: string,
  trainerId: string | null,
  firstName = 'John',
  lastName = 'Doe',
  email = 'john@example.com',
) {
  return {
    _id: new Types.ObjectId(id),
    firstName,
    lastName,
    email,
    role: 'member',
    trainerId: trainerId ? new Types.ObjectId(trainerId) : null,
  };
}

function makeTrainer(id: string, firstName = 'Trainer', lastName = 'One') {
  return {
    _id: new Types.ObjectId(id),
    firstName,
    lastName,
    email: 'trainer@example.com',
    role: 'trainer',
    trainerId: null,
  };
}

describe('MembersService', () => {
  let service: MembersService;
  let userModel: {
    find: jest.Mock;
    findById: jest.Mock;
    findOne: jest.Mock;
  };
  let bodyTestModel: {
    findOne: jest.Mock;
    find: jest.Mock;
  };
  let checkInModel: { findOne: jest.Mock };
  let injuryModel: {
    find: jest.Mock;
    countDocuments: jest.Mock;
  };
  let medicationModel: {
    find: jest.Mock;
    countDocuments: jest.Mock;
  };
  let workoutSessionModel: {
    countDocuments: jest.Mock;
    find: jest.Mock;
  };
  let personalBestModel: {
    findOne: jest.Mock;
  };
  let memberPlanModel: {
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    userModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
    };
    bodyTestModel = {
      findOne: jest.fn(),
      find: jest.fn(),
    };
    checkInModel = {
      findOne: jest.fn(),
    };
    injuryModel = {
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    medicationModel = {
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    workoutSessionModel = {
      countDocuments: jest.fn(),
      find: jest.fn(),
    };
    personalBestModel = {
      findOne: jest.fn(),
    };
    memberPlanModel = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(BodyTest.name), useValue: bodyTestModel },
        { provide: getModelToken(CheckIn.name), useValue: checkInModel },
        {
          provide: getModelToken(MemberInjury.name),
          useValue: injuryModel,
        },
        {
          provide: getModelToken(MemberMedication.name),
          useValue: medicationModel,
        },
        {
          provide: getModelToken(WorkoutSession.name),
          useValue: workoutSessionModel,
        },
        {
          provide: getModelToken(PersonalBest.name),
          useValue: personalBestModel,
        },
        {
          provide: getModelToken(MemberPlan.name),
          useValue: memberPlanModel,
        },
      ],
    }).compile();

    service = module.get<MembersService>(MembersService);
  });

  // ─── listMembers ─────────────────────────────────────────────────────────────

  describe('listMembers', () => {
    it('owner role returns all members with name and resolved trainerName (null when unassigned)', async () => {
      const member1 = makeMember(
        MEMBER_ID,
        TRAINER_ID,
        'Alice',
        'Smith',
        'alice@example.com',
      );
      const member2 = makeMember(
        MEMBER2_ID,
        null,
        'Bob',
        'Jones',
        'bob@example.com',
      );
      const trainer = makeTrainer(TRAINER_ID, 'Jane', 'Trainer');

      userModel.find.mockImplementation(
        (query: { role?: string; trainerId?: Types.ObjectId }) => {
          if (query.role === 'member') {
            return Promise.resolve([member1, member2]);
          }
          return Promise.resolve([]);
        },
      );
      userModel.findById.mockResolvedValue(trainer);

      const result = await service.listMembers(OWNER_ID, 'owner');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: MEMBER_ID,
        name: 'Alice Smith',
        email: 'alice@example.com',
        trainerId: TRAINER_ID,
        trainerName: 'Jane Trainer',
      });
      expect(result[1]).toMatchObject({
        id: MEMBER2_ID,
        name: 'Bob Jones',
        email: 'bob@example.com',
        trainerId: null,
        trainerName: null,
      });
    });

    it('trainer role returns only members whose trainerId equals the trainer id', async () => {
      const myMember = makeMember(
        MEMBER_ID,
        TRAINER_ID,
        'Alice',
        'Smith',
        'alice@example.com',
      );
      const trainer = makeTrainer(TRAINER_ID, 'Jane', 'Trainer');

      userModel.find.mockImplementation(
        (query: { role?: string; trainerId?: Types.ObjectId }) => {
          if (query.role === 'member') {
            // Only called with trainerId filter for trainer role
            return Promise.resolve([myMember]);
          }
          return Promise.resolve([]);
        },
      );
      userModel.findById.mockResolvedValue(trainer);

      const result = await service.listMembers(TRAINER_ID, 'trainer');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(MEMBER_ID);
      // Verify the query was scoped to the trainer
      const findCall = userModel.find.mock.calls[0] as [
        { trainerId?: Types.ObjectId },
      ];
      expect(findCall[0].trainerId?.toString()).toBe(TRAINER_ID);
    });
  });

  // ─── getOverview ─────────────────────────────────────────────────────────────

  describe('getOverview', () => {
    it('returns joinedAt from member.createdAt, latest body-test date, and latest check-in submittedAt (each null when none exist)', async () => {
      const now = new Date('2026-01-01T00:00:00Z');
      const member = {
        ...makeMember(MEMBER_ID, OWNER_ID),
        createdAt: now,
      };
      userModel.findById.mockResolvedValue(member);
      bodyTestModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });
      checkInModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getOverview(MEMBER_ID, OWNER_ID, 'owner');

      expect(result.joinedAt).toEqual(now);
      expect(result.lastBodyTestDate).toBeNull();
      expect(result.lastCheckinDate).toBeNull();
    });

    it('returns the latest body test date and check-in submittedAt when they exist', async () => {
      const now = new Date('2026-01-01T00:00:00Z');
      const bodyTestDate = new Date('2026-02-01T00:00:00Z');
      const checkinDate = new Date('2026-03-01T00:00:00Z');
      const member = {
        ...makeMember(MEMBER_ID, OWNER_ID),
        createdAt: now,
      };
      userModel.findById.mockResolvedValue(member);
      bodyTestModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue({ date: bodyTestDate }),
      });
      checkInModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue({ submittedAt: checkinDate }),
      });

      const result = await service.getOverview(MEMBER_ID, OWNER_ID, 'owner');

      expect(result.lastBodyTestDate).toEqual(bodyTestDate);
      expect(result.lastCheckinDate).toEqual(checkinDate);
    });

    it('throws NotFoundException when the id is not a member-role user', async () => {
      userModel.findById.mockResolvedValue(null);

      await expect(
        service.getOverview(MEMBER_ID, OWNER_ID, 'owner'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the found user does not have role member', async () => {
      userModel.findById.mockResolvedValue({
        ...makeMember(MEMBER_ID, OWNER_ID),
        role: 'trainer',
      });

      await expect(
        service.getOverview(MEMBER_ID, OWNER_ID, 'owner'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when a trainer requests a member not assigned to them', async () => {
      const member = makeMember(MEMBER_ID, OTHER_TRAINER_ID);
      userModel.findById.mockResolvedValue(member);

      await expect(
        service.getOverview(MEMBER_ID, TRAINER_ID, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getBodyTests ─────────────────────────────────────────────────────────────

  describe('getBodyTests', () => {
    it('returns the member body tests sorted by date desc, scoped to the requesting trainer', async () => {
      const member = makeMember(MEMBER_ID, TRAINER_ID);
      const tests = [
        { _id: 'a', date: new Date('2026-03-01') },
        { _id: 'b', date: new Date('2026-01-01') },
      ];
      userModel.findById.mockResolvedValue(member);
      const sortMock = jest.fn().mockResolvedValue(tests);
      bodyTestModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.getBodyTests(
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
      );

      expect(result).toEqual(tests);
      expect(sortMock).toHaveBeenCalledWith({ date: -1 });
    });

    it('throws NotFoundException when trainer requests a member not theirs', async () => {
      const member = makeMember(MEMBER_ID, OTHER_TRAINER_ID);
      userModel.findById.mockResolvedValue(member);

      await expect(
        service.getBodyTests(MEMBER_ID, TRAINER_ID, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getInjuries ─────────────────────────────────────────────────────────────

  describe('getInjuries', () => {
    it('returns only active injuries for the member', async () => {
      const member = makeMember(MEMBER_ID, OWNER_ID);
      const injuries = [{ _id: 'inj1', status: 'active', title: 'Knee pain' }];
      userModel.findById.mockResolvedValue(member);
      const sortMock = jest.fn().mockResolvedValue(injuries);
      injuryModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.getInjuries(MEMBER_ID, OWNER_ID, 'owner');

      expect(result).toEqual(injuries);
      const findCall = injuryModel.find.mock.calls[0] as [{ status?: string }];
      expect(findCall[0].status).toBe('active');
    });
  });

  // ─── getMedications ───────────────────────────────────────────────────────────

  describe('getMedications', () => {
    it('returns only active medications for the member', async () => {
      const member = makeMember(MEMBER_ID, OWNER_ID);
      const meds = [{ _id: 'med1', status: 'active', name: 'Aspirin' }];
      userModel.findById.mockResolvedValue(member);
      const sortMock = jest.fn().mockResolvedValue(meds);
      medicationModel.find.mockReturnValue({ sort: sortMock });

      const result = await service.getMedications(MEMBER_ID, OWNER_ID, 'owner');

      expect(result).toEqual(meds);
      const findCall = medicationModel.find.mock.calls[0] as [
        { status?: string },
      ];
      expect(findCall[0].status).toBe('active');
    });
  });

  // ─── getOverviewStats ─────────────────────────────────────────────────────────

  describe('getOverviewStats', () => {
    function setupMember() {
      const member = makeMember(MEMBER_ID, TRAINER_ID);
      userModel.findById.mockResolvedValue(member);
    }

    it('returns sessionsThisMonth counting only this-month completed sessions for the member', async () => {
      setupMember();
      workoutSessionModel.countDocuments.mockResolvedValue(5);
      bodyTestModel.find.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
      });
      personalBestModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });
      memberPlanModel.findOne.mockResolvedValue(null);
      injuryModel.countDocuments.mockResolvedValue(0);
      medicationModel.countDocuments.mockResolvedValue(0);
      workoutSessionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const result = await service.getOverviewStats(
        MEMBER_ID,
        OWNER_ID,
        'owner',
      );

      expect(result.sessionsThisMonth).toBe(5);
    });

    it('returns weight delta as latest minus previous body test, null when fewer than 1 test', async () => {
      setupMember();
      workoutSessionModel.countDocuments.mockResolvedValue(0);

      // Fewer than 1 test → weight null
      bodyTestModel.find.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
      });
      personalBestModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });
      memberPlanModel.findOne.mockResolvedValue(null);
      injuryModel.countDocuments.mockResolvedValue(0);
      medicationModel.countDocuments.mockResolvedValue(0);
      workoutSessionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const noTestResult = await service.getOverviewStats(
        MEMBER_ID,
        OWNER_ID,
        'owner',
      );
      expect(noTestResult.weight).toBeNull();

      // One test → value present, deltaKg null (no previous)
      userModel.findById.mockResolvedValue(makeMember(MEMBER_ID, TRAINER_ID));
      workoutSessionModel.countDocuments.mockResolvedValue(0);
      bodyTestModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest
            .fn()
            .mockResolvedValue([
              { weight: 80, bodyFatPct: 20, date: new Date() },
            ]),
        }),
      });
      workoutSessionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const oneTestResult = await service.getOverviewStats(
        MEMBER_ID,
        OWNER_ID,
        'owner',
      );
      expect(oneTestResult.weight).not.toBeNull();
      expect(oneTestResult.weight!.value).toBe(80);
      expect(oneTestResult.weight!.deltaKg).toBeNull();

      // Two tests → deltaKg = latest - previous
      userModel.findById.mockResolvedValue(makeMember(MEMBER_ID, TRAINER_ID));
      workoutSessionModel.countDocuments.mockResolvedValue(0);
      bodyTestModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            { weight: 80, bodyFatPct: 20, date: new Date('2026-03-01') },
            { weight: 78, bodyFatPct: 19, date: new Date('2026-02-01') },
          ]),
        }),
      });
      workoutSessionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      const twoTestResult = await service.getOverviewStats(
        MEMBER_ID,
        OWNER_ID,
        'owner',
      );
      expect(twoTestResult.weight!.value).toBe(80);
      expect(twoTestResult.weight!.deltaKg).toBeCloseTo(2, 5);
    });

    it('returns topPR with highest estimatedOneRM, null when member has no PRs', async () => {
      setupMember();
      workoutSessionModel.countDocuments.mockResolvedValue(0);
      bodyTestModel.find.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
      });
      memberPlanModel.findOne.mockResolvedValue(null);
      injuryModel.countDocuments.mockResolvedValue(0);
      medicationModel.countDocuments.mockResolvedValue(0);
      workoutSessionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });

      // No PR case
      personalBestModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });

      const noprResult = await service.getOverviewStats(
        MEMBER_ID,
        OWNER_ID,
        'owner',
      );
      expect(noprResult.topPR).toBeNull();

      // With PR case
      userModel.findById.mockResolvedValue(makeMember(MEMBER_ID, TRAINER_ID));
      workoutSessionModel.countDocuments.mockResolvedValue(0);
      bodyTestModel.find.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
      });
      workoutSessionModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      });
      personalBestModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue({
          exerciseName: 'Bench Press',
          estimatedOneRM: 120,
        }),
      });

      const prResult = await service.getOverviewStats(
        MEMBER_ID,
        OWNER_ID,
        'owner',
      );
      expect(prResult.topPR).toEqual({
        exerciseName: 'Bench Press',
        estimatedOneRM: 120,
      });
    });

    it('returns heatmap entries only for days with at least one completed session in the last 90 days', async () => {
      setupMember();
      workoutSessionModel.countDocuments.mockResolvedValue(0);
      bodyTestModel.find.mockReturnValue({
        sort: jest
          .fn()
          .mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
      });
      personalBestModel.findOne.mockReturnValue({
        sort: jest.fn().mockResolvedValue(null),
      });
      memberPlanModel.findOne.mockResolvedValue(null);
      injuryModel.countDocuments.mockResolvedValue(0);
      medicationModel.countDocuments.mockResolvedValue(0);

      const date1 = new Date('2026-05-01T10:00:00Z');
      const date2 = new Date('2026-05-01T18:00:00Z');
      const date3 = new Date('2026-05-03T10:00:00Z');
      workoutSessionModel.find.mockReturnValue({
        lean: jest
          .fn()
          .mockResolvedValue([
            { completedAt: date1 },
            { completedAt: date2 },
            { completedAt: date3 },
          ]),
      });

      const result = await service.getOverviewStats(
        MEMBER_ID,
        OWNER_ID,
        'owner',
      );

      expect(result.heatmap.length).toBeGreaterThanOrEqual(2);
      const may1Entry = result.heatmap.find((h) => h.date === '2026-05-01');
      const may3Entry = result.heatmap.find((h) => h.date === '2026-05-03');
      expect(may1Entry).toBeDefined();
      expect(may1Entry!.count).toBe(2);
      expect(may3Entry).toBeDefined();
      expect(may3Entry!.count).toBe(1);
    });

    it('throws NotFoundException when trainer requests a member not assigned to them', async () => {
      const member = makeMember(MEMBER_ID, OTHER_TRAINER_ID);
      userModel.findById.mockResolvedValue(member);

      await expect(
        service.getOverviewStats(MEMBER_ID, TRAINER_ID, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
