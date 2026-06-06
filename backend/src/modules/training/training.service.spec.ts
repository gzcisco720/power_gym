import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TrainingService } from './training.service';
import { MemberPlan } from '../../common/models/member-plan.model';
import { WorkoutSession } from '../../common/models/workout-session.model';
import { PlanTemplate } from '../../common/models/plan-template.model';
import { User } from '../../common/models/user.model';

const OWNER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();
const OTHER_TRAINER_ID = new Types.ObjectId().toString();
const MEMBER_ID = new Types.ObjectId().toString();
const TEMPLATE_ID = new Types.ObjectId().toString();
const PLAN_ID = new Types.ObjectId().toString();
const SESSION_ID = new Types.ObjectId().toString();
const EXERCISE_ID = new Types.ObjectId().toString();

const sampleExercise = {
  groupId: 'g1',
  isSuperset: false,
  exerciseId: new Types.ObjectId(EXERCISE_ID),
  exerciseName: 'Bench Press',
  imageUrl: null,
  isBodyweight: false,
  sets: 3,
  repsMin: 8,
  repsMax: 12,
  restSeconds: 60,
};

const sampleTemplate = {
  _id: new Types.ObjectId(TEMPLATE_ID),
  name: 'Push Day',
  createdBy: new Types.ObjectId(OWNER_ID),
  days: [
    {
      dayNumber: 1,
      name: 'Day 1',
      exercises: [sampleExercise],
    },
  ],
};

const sampleActivePlan = {
  _id: new Types.ObjectId(PLAN_ID),
  memberId: new Types.ObjectId(MEMBER_ID),
  templateId: new Types.ObjectId(TEMPLATE_ID),
  name: 'Push Day',
  isActive: true,
  assignedAt: new Date(),
  days: sampleTemplate.days,
  save: jest.fn().mockResolvedValue(undefined),
};

const sampleMember = {
  _id: new Types.ObjectId(MEMBER_ID),
  role: 'member' as const,
  trainerId: new Types.ObjectId(TRAINER_ID),
};

const now = new Date();

const sampleSession = {
  _id: new Types.ObjectId(SESSION_ID),
  memberId: new Types.ObjectId(MEMBER_ID),
  memberPlanId: new Types.ObjectId(PLAN_ID),
  dayNumber: 1,
  dayName: 'Day 1',
  startedAt: now,
  completedAt: null,
  lastActivityAt: now,
  sets: [
    {
      exerciseId: new Types.ObjectId(EXERCISE_ID),
      exerciseName: 'Bench Press',
      groupId: 'g1',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 1,
      prescribedRepsMin: 8,
      prescribedRepsMax: 12,
      isExtraSet: false,
      actualReps: null,
      actualWeight: null,
      completedAt: null,
    },
    {
      exerciseId: new Types.ObjectId(EXERCISE_ID),
      exerciseName: 'Bench Press',
      groupId: 'g1',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 2,
      prescribedRepsMin: 8,
      prescribedRepsMax: 12,
      isExtraSet: false,
      actualReps: null,
      actualWeight: null,
      completedAt: null,
    },
    {
      exerciseId: new Types.ObjectId(EXERCISE_ID),
      exerciseName: 'Bench Press',
      groupId: 'g1',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 3,
      prescribedRepsMin: 8,
      prescribedRepsMax: 12,
      isExtraSet: false,
      actualReps: null,
      actualWeight: null,
      completedAt: null,
    },
  ],
  save: jest.fn().mockResolvedValue(undefined),
};

describe('TrainingService', () => {
  let service: TrainingService;
  let memberPlanModel: {
    findOne: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
    updateMany: jest.Mock;
  };
  let workoutSessionModel: {
    findById: jest.Mock;
    find: jest.Mock;
    create: jest.Mock;
  };
  let planTemplateModel: {
    findById: jest.Mock;
  };
  let userModel: {
    findById: jest.Mock;
  };

  beforeEach(async () => {
    memberPlanModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    };

    workoutSessionModel = {
      findById: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
    };

    planTemplateModel = {
      findById: jest.fn(),
    };

    userModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: getModelToken(MemberPlan.name), useValue: memberPlanModel },
        {
          provide: getModelToken(WorkoutSession.name),
          useValue: workoutSessionModel,
        },
        {
          provide: getModelToken(PlanTemplate.name),
          useValue: planTemplateModel,
        },
        { provide: getModelToken(User.name), useValue: userModel },
      ],
    }).compile();

    service = module.get<TrainingService>(TrainingService);
  });

  // ─── getMyPlan ────────────────────────────────────────────────────────────────

  describe('getMyPlan', () => {
    it('returns null when member has no active MemberPlan', async () => {
      memberPlanModel.findOne.mockResolvedValue(null);

      const result = await service.getMyPlan(MEMBER_ID);

      expect(result).toBeNull();
    });

    it('returns the active plan with days when one exists', async () => {
      memberPlanModel.findOne.mockResolvedValue(sampleActivePlan);

      const result = await service.getMyPlan(MEMBER_ID);

      expect(result).toEqual(sampleActivePlan);
      expect(memberPlanModel.findOne).toHaveBeenCalledWith({
        memberId: new Types.ObjectId(MEMBER_ID),
        isActive: true,
      });
    });
  });

  // ─── assignPlan ───────────────────────────────────────────────────────────────

  describe('assignPlan', () => {
    it('creates an active MemberPlan copying template name and days', async () => {
      planTemplateModel.findById.mockResolvedValue(sampleTemplate);
      userModel.findById.mockResolvedValue(sampleMember);
      memberPlanModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
      memberPlanModel.create.mockResolvedValue(sampleActivePlan);

      const result = await service.assignPlan(
        MEMBER_ID,
        TEMPLATE_ID,
        OWNER_ID,
        'owner',
      );

      expect(memberPlanModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: sampleTemplate.name,
          days: sampleTemplate.days,
          isActive: true,
        }),
      );
      expect(result).toEqual(sampleActivePlan);
    });

    it("deactivates the member's previous active plan (isActive=false) before creating the new one", async () => {
      planTemplateModel.findById.mockResolvedValue(sampleTemplate);
      userModel.findById.mockResolvedValue(sampleMember);
      memberPlanModel.updateMany.mockResolvedValue({ modifiedCount: 1 });
      memberPlanModel.create.mockResolvedValue(sampleActivePlan);

      await service.assignPlan(MEMBER_ID, TEMPLATE_ID, OWNER_ID, 'owner');

      expect(memberPlanModel.updateMany).toHaveBeenCalledWith(
        {
          memberId: new Types.ObjectId(MEMBER_ID),
          isActive: true,
        },
        { $set: { isActive: false } },
      );
    });

    it('throws NotFoundException when template not owned by caller', async () => {
      planTemplateModel.findById.mockResolvedValue(sampleTemplate);
      // Template's createdBy is OWNER_ID but caller is TRAINER_ID (different)
      userModel.findById.mockResolvedValue(sampleMember);

      await expect(
        service.assignPlan(MEMBER_ID, TEMPLATE_ID, TRAINER_ID, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when templateId does not exist', async () => {
      planTemplateModel.findById.mockResolvedValue(null);

      await expect(
        service.assignPlan(MEMBER_ID, TEMPLATE_ID, OWNER_ID, 'owner'),
      ).rejects.toThrow(NotFoundException);
    });

    it('trainer assigning to a member of another trainer throws NotFoundException', async () => {
      // Template IS owned by TRAINER_ID in this scenario
      const trainerOwnedTemplate = {
        ...sampleTemplate,
        createdBy: new Types.ObjectId(TRAINER_ID),
      };
      planTemplateModel.findById.mockResolvedValue(trainerOwnedTemplate);
      // But member belongs to OTHER_TRAINER_ID
      userModel.findById.mockResolvedValue({
        ...sampleMember,
        trainerId: new Types.ObjectId(OTHER_TRAINER_ID),
      });

      await expect(
        service.assignPlan(MEMBER_ID, TEMPLATE_ID, TRAINER_ID, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── startSession ─────────────────────────────────────────────────────────────

  describe('startSession', () => {
    it('expands a day into setNumber 1..N rows with null actuals and copied prescribed reps', async () => {
      memberPlanModel.findOne.mockResolvedValue(sampleActivePlan);
      workoutSessionModel.create.mockResolvedValue(sampleSession);

      const result = await service.startSession(MEMBER_ID, 1);

      expect(workoutSessionModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: new Types.ObjectId(MEMBER_ID),
          dayNumber: 1,
          dayName: 'Day 1',
        }),
      );

      type CreateCallArg = {
        sets: Array<{
          setNumber: number;
          prescribedRepsMin: number;
          prescribedRepsMax: number;
          actualReps: null;
          actualWeight: null;
          completedAt: null;
        }>;
      };
      const rawCall = workoutSessionModel.create.mock.calls[0] as [
        CreateCallArg,
      ];
      const createArg = rawCall[0];
      // 3 sets for the one exercise
      expect(createArg.sets).toHaveLength(3);
      expect(createArg.sets[0].setNumber).toBe(1);
      expect(createArg.sets[1].setNumber).toBe(2);
      expect(createArg.sets[2].setNumber).toBe(3);
      expect(createArg.sets[0].prescribedRepsMin).toBe(8);
      expect(createArg.sets[0].prescribedRepsMax).toBe(12);
      expect(createArg.sets[0].actualReps).toBeNull();
      expect(createArg.sets[0].actualWeight).toBeNull();
      expect(createArg.sets[0].completedAt).toBeNull();
      expect(result).toEqual(sampleSession);
    });

    it('throws NotFoundException when dayNumber is not in the active plan', async () => {
      memberPlanModel.findOne.mockResolvedValue(sampleActivePlan);

      await expect(service.startSession(MEMBER_ID, 99)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when member has no active plan', async () => {
      memberPlanModel.findOne.mockResolvedValue(null);

      await expect(service.startSession(MEMBER_ID, 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── patchSet ─────────────────────────────────────────────────────────────────

  describe('patchSet', () => {
    it('sets actualReps, actualWeight and completedAt on the matched set', async () => {
      const sessionDoc = {
        ...sampleSession,
        sets: sampleSession.sets.map((s) => ({ ...s })),
        save: jest.fn().mockResolvedValue(undefined),
      };
      workoutSessionModel.findById.mockResolvedValue(sessionDoc);

      const result = await service.patchSet(SESSION_ID, MEMBER_ID, {
        setNumber: 1,
        exerciseId: EXERCISE_ID,
        actualReps: 10,
        actualWeight: 80,
      });

      const patchedSet = sessionDoc.sets.find(
        (s: { setNumber: number; exerciseId: { toString: () => string } }) =>
          s.setNumber === 1 && s.exerciseId.toString() === EXERCISE_ID,
      );
      expect(patchedSet?.actualReps).toBe(10);
      expect(patchedSet?.actualWeight).toBe(80);
      expect(patchedSet?.completedAt).toBeTruthy();
      expect(sessionDoc.save).toHaveBeenCalled();
      expect(result).toEqual(sessionDoc);
    });

    it('throws BadRequestException when the session is already completed', async () => {
      workoutSessionModel.findById.mockResolvedValue({
        ...sampleSession,
        memberId: new Types.ObjectId(MEMBER_ID),
        completedAt: new Date(),
      });

      await expect(
        service.patchSet(SESSION_ID, MEMBER_ID, {
          setNumber: 1,
          exerciseId: EXERCISE_ID,
          actualReps: 10,
          actualWeight: null,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when session belongs to a different member', async () => {
      workoutSessionModel.findById.mockResolvedValue({
        ...sampleSession,
        memberId: new Types.ObjectId(), // different member
        completedAt: null,
      });

      await expect(
        service.patchSet(SESSION_ID, MEMBER_ID, {
          setNumber: 1,
          exerciseId: EXERCISE_ID,
          actualReps: 10,
          actualWeight: null,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── finishSession ────────────────────────────────────────────────────────────

  describe('finishSession', () => {
    it('sets completedAt and throws BadRequestException on a second call', async () => {
      const sessionDoc = {
        ...sampleSession,
        memberId: new Types.ObjectId(MEMBER_ID),
        completedAt: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      workoutSessionModel.findById.mockResolvedValue(sessionDoc);

      const result = await service.finishSession(SESSION_ID, MEMBER_ID);
      expect(sessionDoc.completedAt).toBeTruthy();
      expect(sessionDoc.save).toHaveBeenCalled();
      expect(result).toEqual(sessionDoc);

      // Second call – session is already completed
      workoutSessionModel.findById.mockResolvedValue({
        ...sessionDoc,
        completedAt: new Date(),
      });

      await expect(
        service.finishSession(SESSION_ID, MEMBER_ID),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getHistory ───────────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('returns only completed sessions sorted by startedAt desc', async () => {
      userModel.findById.mockResolvedValue(sampleMember);

      const completedSession = {
        ...sampleSession,
        completedAt: new Date(),
      };
      const mockQuery = {
        sort: jest.fn().mockResolvedValue([completedSession]),
      };
      workoutSessionModel.find.mockReturnValue(mockQuery);

      const result = await service.getHistory(MEMBER_ID, TRAINER_ID, 'trainer');

      expect(workoutSessionModel.find).toHaveBeenCalledWith({
        memberId: new Types.ObjectId(MEMBER_ID),
        completedAt: { $ne: null },
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ startedAt: -1 });
      expect(result).toEqual([completedSession]);
    });

    it('throws NotFoundException when trainer does not own the member', async () => {
      userModel.findById.mockResolvedValue({
        ...sampleMember,
        trainerId: new Types.ObjectId(OTHER_TRAINER_ID),
      });

      await expect(
        service.getHistory(MEMBER_ID, TRAINER_ID, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getProgress ──────────────────────────────────────────────────────────────

  describe('getProgress', () => {
    it('returns distinct YYYY-MM-DD heatmapDates only for sessions completed within the last 90 days', async () => {
      userModel.findById.mockResolvedValue(sampleMember);

      const now = new Date();
      const recent1 = new Date(now);
      recent1.setDate(recent1.getDate() - 5);
      const recent2 = new Date(now);
      recent2.setDate(recent2.getDate() - 10);
      const tooOld = new Date(now);
      tooOld.setDate(tooOld.getDate() - 100);

      const recentDate1Str = recent1.toISOString().slice(0, 10);
      const recentDate2Str = recent2.toISOString().slice(0, 10);

      const sessions = [
        {
          _id: new Types.ObjectId(),
          memberId: new Types.ObjectId(MEMBER_ID),
          completedAt: recent1,
          sets: [
            {
              exerciseId: new Types.ObjectId(EXERCISE_ID),
              exerciseName: 'Back Squat',
              actualWeight: 100,
              actualReps: 5,
            },
          ],
        },
        // Same day as recent1 — should produce one date entry
        {
          _id: new Types.ObjectId(),
          memberId: new Types.ObjectId(MEMBER_ID),
          completedAt: recent1,
          sets: [
            {
              exerciseId: new Types.ObjectId(EXERCISE_ID),
              exerciseName: 'Back Squat',
              actualWeight: 90,
              actualReps: 8,
            },
          ],
        },
        {
          _id: new Types.ObjectId(),
          memberId: new Types.ObjectId(MEMBER_ID),
          completedAt: recent2,
          sets: [],
        },
        // Too old — should be excluded
        {
          _id: new Types.ObjectId(),
          memberId: new Types.ObjectId(MEMBER_ID),
          completedAt: tooOld,
          sets: [],
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockResolvedValue(sessions),
      };
      workoutSessionModel.find.mockReturnValue(mockQuery);

      const result = await service.getProgress(
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
      );

      expect(result.heatmapDates).toContain(recentDate1Str);
      expect(result.heatmapDates).toContain(recentDate2Str);
      // The too-old date must not appear
      expect(result.heatmapDates).not.toContain(
        tooOld.toISOString().slice(0, 10),
      );
      // Two sessions on same day → one date entry
      expect(
        result.heatmapDates.filter((d) => d === recentDate1Str).length,
      ).toBe(1);
    });

    it('returns distinct exercises sorted by exerciseName ascending', async () => {
      userModel.findById.mockResolvedValue(sampleMember);

      const squat = new Types.ObjectId();
      const bench = new Types.ObjectId();

      const sessions = [
        {
          _id: new Types.ObjectId(),
          completedAt: new Date(),
          sets: [
            {
              exerciseId: squat,
              exerciseName: 'Squat',
              actualWeight: 100,
              actualReps: 5,
            },
            {
              exerciseId: bench,
              exerciseName: 'Bench Press',
              actualWeight: 80,
              actualReps: 8,
            },
            // Duplicate exerciseId — should collapse to one entry
            {
              exerciseId: squat,
              exerciseName: 'Squat',
              actualWeight: 95,
              actualReps: 6,
            },
          ],
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockResolvedValue(sessions),
      };
      workoutSessionModel.find.mockReturnValue(mockQuery);

      const result = await service.getProgress(
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
      );

      expect(result.exercises).toHaveLength(2);
      expect(result.exercises[0].exerciseName).toBe('Bench Press');
      expect(result.exercises[1].exerciseName).toBe('Squat');
      expect(result.exercises[0].exerciseId).toBe(bench.toString());
      expect(result.exercises[1].exerciseId).toBe(squat.toString());
    });

    it('throws NotFoundException when caller is a trainer not assigned to the member', async () => {
      userModel.findById.mockResolvedValue({
        ...sampleMember,
        trainerId: new Types.ObjectId(OTHER_TRAINER_ID),
      });

      await expect(
        service.getProgress(MEMBER_ID, TRAINER_ID, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getMemberPlan ────────────────────────────────────────────────────────────

  describe('getMemberPlan', () => {
    it("returns the member's active MemberPlan when caller is the assigned trainer", async () => {
      userModel.findById.mockResolvedValue(sampleMember);
      memberPlanModel.findOne.mockResolvedValue(sampleActivePlan);

      const result = await service.getMemberPlan(
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
      );

      expect(result).toEqual(sampleActivePlan);
      expect(memberPlanModel.findOne).toHaveBeenCalledWith({
        memberId: new Types.ObjectId(MEMBER_ID),
        isActive: true,
      });
    });

    it('returns null when the member has no active plan', async () => {
      userModel.findById.mockResolvedValue(sampleMember);
      memberPlanModel.findOne.mockResolvedValue(null);

      const result = await service.getMemberPlan(
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
      );

      expect(result).toBeNull();
    });

    it("throws NotFoundException when trainer is not the member's assigned trainer", async () => {
      userModel.findById.mockResolvedValue({
        ...sampleMember,
        trainerId: new Types.ObjectId(OTHER_TRAINER_ID),
      });

      await expect(
        service.getMemberPlan(MEMBER_ID, TRAINER_ID, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── startMemberSession ───────────────────────────────────────────────────────

  describe('startMemberSession', () => {
    it('creates a WorkoutSession with one set per prescribed set and sets loggedBy to the caller id', async () => {
      userModel.findById.mockResolvedValue(sampleMember);
      memberPlanModel.findOne.mockResolvedValue(sampleActivePlan);
      const sessionWithLoggedBy = {
        ...sampleSession,
        loggedBy: new Types.ObjectId(TRAINER_ID),
      };
      workoutSessionModel.create.mockResolvedValue(sessionWithLoggedBy);

      const result = await service.startMemberSession(
        MEMBER_ID,
        1,
        TRAINER_ID,
        'trainer',
      );

      type CreateCallArg = {
        sets: Array<{
          setNumber: number;
          actualReps: null;
          actualWeight: null;
          completedAt: null;
        }>;
        loggedBy: Types.ObjectId;
      };
      const rawCall = workoutSessionModel.create.mock.calls[0] as [
        CreateCallArg,
      ];
      const createArg = rawCall[0];
      expect(createArg.sets).toHaveLength(3);
      expect(createArg.loggedBy).toEqual(new Types.ObjectId(TRAINER_ID));
      expect(result).toEqual(sessionWithLoggedBy);
    });

    it('throws NotFoundException when the member has no active plan', async () => {
      userModel.findById.mockResolvedValue(sampleMember);
      memberPlanModel.findOne.mockResolvedValue(null);

      await expect(
        service.startMemberSession(MEMBER_ID, 1, TRAINER_ID, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── patchMemberSet ───────────────────────────────────────────────────────────

  describe('patchMemberSet', () => {
    it('updates actualReps/actualWeight/completedAt on the matching set and returns the session', async () => {
      userModel.findById.mockResolvedValue(sampleMember);
      const sessionDoc = {
        ...sampleSession,
        sets: sampleSession.sets.map((s) => ({ ...s })),
        save: jest.fn().mockResolvedValue(undefined),
      };
      workoutSessionModel.findById.mockResolvedValue(sessionDoc);

      const result = await service.patchMemberSet(
        SESSION_ID,
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
        {
          setNumber: 1,
          exerciseId: EXERCISE_ID,
          actualReps: 10,
          actualWeight: 80,
        },
      );

      const patchedSet = sessionDoc.sets.find(
        (s: { setNumber: number; exerciseId: { toString: () => string } }) =>
          s.setNumber === 1 && s.exerciseId.toString() === EXERCISE_ID,
      );
      expect(patchedSet?.actualReps).toBe(10);
      expect(patchedSet?.actualWeight).toBe(80);
      expect(patchedSet?.completedAt).toBeTruthy();
      expect(sessionDoc.save).toHaveBeenCalled();
      expect(result).toEqual(sessionDoc);
    });

    it('throws BadRequestException when the session is already completed', async () => {
      userModel.findById.mockResolvedValue(sampleMember);
      workoutSessionModel.findById.mockResolvedValue({
        ...sampleSession,
        memberId: new Types.ObjectId(MEMBER_ID),
        completedAt: new Date(),
      });

      await expect(
        service.patchMemberSet(SESSION_ID, MEMBER_ID, TRAINER_ID, 'trainer', {
          setNumber: 1,
          exerciseId: EXERCISE_ID,
          actualReps: 10,
          actualWeight: null,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── finishMemberSession ──────────────────────────────────────────────────────

  describe('finishMemberSession', () => {
    it('sets completedAt and returns the session', async () => {
      userModel.findById.mockResolvedValue(sampleMember);
      const sessionDoc = {
        ...sampleSession,
        memberId: new Types.ObjectId(MEMBER_ID),
        completedAt: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      workoutSessionModel.findById.mockResolvedValue(sessionDoc);

      const result = await service.finishMemberSession(
        SESSION_ID,
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
      );

      expect(sessionDoc.completedAt).toBeTruthy();
      expect(sessionDoc.save).toHaveBeenCalled();
      expect(result).toEqual(sessionDoc);
    });

    it('throws NotFoundException when the session does not belong to the member', async () => {
      userModel.findById.mockResolvedValue(sampleMember);
      workoutSessionModel.findById.mockResolvedValue({
        ...sampleSession,
        memberId: new Types.ObjectId(), // different member
        completedAt: null,
      });

      await expect(
        service.finishMemberSession(
          SESSION_ID,
          MEMBER_ID,
          TRAINER_ID,
          'trainer',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getSelfSessions ──────────────────────────────────────────────────────────

  describe('getSelfSessions', () => {
    it('returns only sessions where memberId equals the caller id and completedAt is not null', async () => {
      const callerId = TRAINER_ID;
      const completedSession = {
        _id: new Types.ObjectId(SESSION_ID),
        memberId: new Types.ObjectId(callerId),
        dayName: 'Day 1',
        startedAt: now,
        completedAt: new Date(),
        sets: [],
        rpe: null,
      };
      const mockQuery = {
        sort: jest.fn().mockResolvedValue([completedSession]),
      };
      workoutSessionModel.find.mockReturnValue(mockQuery);

      const result = await service.getSelfSessions(callerId);

      expect(workoutSessionModel.find).toHaveBeenCalledWith({
        memberId: new Types.ObjectId(callerId),
        completedAt: { $ne: null },
      });
      expect(result).toEqual([completedSession]);
    });

    it('orders results newest-first by completedAt', async () => {
      const callerId = TRAINER_ID;
      const older = {
        _id: new Types.ObjectId(),
        completedAt: new Date('2024-01-01'),
      };
      const newer = {
        _id: new Types.ObjectId(),
        completedAt: new Date('2024-06-01'),
      };
      const mockQuery = {
        sort: jest.fn().mockResolvedValue([newer, older]),
      };
      workoutSessionModel.find.mockReturnValue(mockQuery);

      await service.getSelfSessions(callerId);

      expect(mockQuery.sort).toHaveBeenCalledWith({ completedAt: -1 });
    });

    it('returns [] when the caller has no completed sessions', async () => {
      const mockQuery = {
        sort: jest.fn().mockResolvedValue([]),
      };
      workoutSessionModel.find.mockReturnValue(mockQuery);

      const result = await service.getSelfSessions(TRAINER_ID);

      expect(result).toEqual([]);
    });
  });

  // ─── getSelfSession ───────────────────────────────────────────────────────────

  describe('getSelfSession', () => {
    it('returns the full session including its sets array for a session owned by the caller', async () => {
      const completedSession = {
        ...sampleSession,
        memberId: new Types.ObjectId(TRAINER_ID),
        completedAt: new Date(),
      };
      workoutSessionModel.findById.mockResolvedValue(completedSession);

      const result = await service.getSelfSession(SESSION_ID, TRAINER_ID);

      expect(workoutSessionModel.findById).toHaveBeenCalledWith(SESSION_ID);
      expect(result).toEqual(completedSession);
      expect(result.sets).toHaveLength(3);
    });

    it('throws NotFoundException when the session belongs to a different user', async () => {
      workoutSessionModel.findById.mockResolvedValue({
        ...sampleSession,
        memberId: new Types.ObjectId(MEMBER_ID), // different user
        completedAt: new Date(),
      });

      await expect(
        service.getSelfSession(SESSION_ID, TRAINER_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when the session is not found', async () => {
      workoutSessionModel.findById.mockResolvedValue(null);

      await expect(
        service.getSelfSession(SESSION_ID, TRAINER_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getExerciseHistory ───────────────────────────────────────────────────────

  describe('getExerciseHistory', () => {
    it('computes estimatedOneRepMax as round(weight × (1 + reps/30)) taking the session max', async () => {
      userModel.findById.mockResolvedValue(sampleMember);

      const targetExerciseId = new Types.ObjectId(EXERCISE_ID);
      const sessionDate = new Date();

      const sessions = [
        {
          _id: new Types.ObjectId(SESSION_ID),
          completedAt: sessionDate,
          sets: [
            // set 1: 100kg × 5 reps → 1RM = round(100 * (1 + 5/30)) = round(116.67) = 117
            {
              exerciseId: targetExerciseId,
              exerciseName: 'Back Squat',
              setNumber: 1,
              actualWeight: 100,
              actualReps: 5,
            },
            // set 2: 90kg × 3 reps → 1RM = round(90 * (1 + 3/30)) = round(99) = 99
            // max for this session = 117
            {
              exerciseId: targetExerciseId,
              exerciseName: 'Back Squat',
              setNumber: 2,
              actualWeight: 90,
              actualReps: 3,
            },
          ],
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockResolvedValue(sessions),
      };
      workoutSessionModel.find.mockReturnValue(mockQuery);

      const result = await service.getExerciseHistory(
        MEMBER_ID,
        EXERCISE_ID,
        TRAINER_ID,
        'trainer',
      );

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions[0].estimatedOneRepMax).toBe(117);
      expect(result.sessions[0].sets).toHaveLength(2);
      expect(result.sessions[0].sets[0].setNumber).toBe(1);
      expect(result.sessions[0].sets[0].weight).toBe(100);
      expect(result.sessions[0].sets[0].reps).toBe(5);
    });

    it('returns at most 5 sessions ordered by completedAt descending and omits sessions with no qualifying sets for the exercise', async () => {
      userModel.findById.mockResolvedValue(sampleMember);

      const targetExerciseId = new Types.ObjectId(EXERCISE_ID);
      const otherExerciseId = new Types.ObjectId();

      // Create 7 sessions: 6 with the target exercise (sorted newest first),
      // plus 1 with only null-weight sets (should be omitted),
      // plus 1 with only sets for a different exercise (should be omitted)
      const now = new Date();
      const sessions = Array.from({ length: 6 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - i); // newest first
        return {
          _id: new Types.ObjectId(),
          completedAt: date,
          sets: [
            {
              exerciseId: targetExerciseId,
              exerciseName: 'Back Squat',
              setNumber: 1,
              actualWeight: 100 - i * 5,
              actualReps: 5,
            },
          ],
        };
      });

      // Session with null actualWeight — should be omitted
      const nullWeightSession = {
        _id: new Types.ObjectId(),
        completedAt: new Date(now.getTime() - 7 * 86400000),
        sets: [
          {
            exerciseId: targetExerciseId,
            exerciseName: 'Back Squat',
            setNumber: 1,
            actualWeight: null,
            actualReps: 5,
          },
        ],
      };

      // Session with only a different exercise — should be omitted
      const wrongExerciseSession = {
        _id: new Types.ObjectId(),
        completedAt: new Date(now.getTime() - 8 * 86400000),
        sets: [
          {
            exerciseId: otherExerciseId,
            exerciseName: 'Bench Press',
            setNumber: 1,
            actualWeight: 80,
            actualReps: 8,
          },
        ],
      };

      const allSessions = [
        ...sessions,
        nullWeightSession,
        wrongExerciseSession,
      ];

      const mockQuery = {
        sort: jest.fn().mockResolvedValue(allSessions),
      };
      workoutSessionModel.find.mockReturnValue(mockQuery);

      const result = await service.getExerciseHistory(
        MEMBER_ID,
        EXERCISE_ID,
        TRAINER_ID,
        'trainer',
      );

      // Only 5 most recent sessions with qualifying sets
      expect(result.sessions).toHaveLength(5);
      // Sessions are ordered newest first (index 0 = most recent)
      expect(result.sessions[0].date).toBe(
        sessions[0].completedAt.toISOString().slice(0, 10),
      );
    });
  });

  // ─── finishSession (with rpe) ─────────────────────────────────────────────────

  describe('finishSession > rpe', () => {
    it('persists rpe when provided', async () => {
      const sessionDoc = {
        ...sampleSession,
        memberId: new Types.ObjectId(MEMBER_ID),
        completedAt: null,
        rpe: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      workoutSessionModel.findById.mockResolvedValue(sessionDoc);

      await service.finishSession(SESSION_ID, MEMBER_ID, 8);

      expect(sessionDoc.rpe).toBe(8);
      expect(sessionDoc.completedAt).toBeTruthy();
      expect(sessionDoc.save).toHaveBeenCalled();
    });

    it('leaves rpe null when omitted', async () => {
      const sessionDoc = {
        ...sampleSession,
        memberId: new Types.ObjectId(MEMBER_ID),
        completedAt: null,
        rpe: null,
        save: jest.fn().mockResolvedValue(undefined),
      };
      workoutSessionModel.findById.mockResolvedValue(sessionDoc);

      await service.finishSession(SESSION_ID, MEMBER_ID);

      expect(sessionDoc.rpe).toBeNull();
      expect(sessionDoc.completedAt).toBeTruthy();
    });

    it('throws BadRequestException when session already completed', async () => {
      workoutSessionModel.findById.mockResolvedValue({
        ...sampleSession,
        memberId: new Types.ObjectId(MEMBER_ID),
        completedAt: new Date(),
      });

      await expect(
        service.finishSession(SESSION_ID, MEMBER_ID, 5),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── addSet ───────────────────────────────────────────────────────────────────

  describe('addSet', () => {
    it('appends an isExtraSet set with setNumber one greater than the exercise current max', async () => {
      const sessionDoc = {
        ...sampleSession,
        memberId: new Types.ObjectId(MEMBER_ID),
        completedAt: null,
        sets: sampleSession.sets.map((s) => ({ ...s })),
        save: jest.fn().mockResolvedValue(undefined),
      };
      workoutSessionModel.findById.mockResolvedValue(sessionDoc);

      await service.addSet(SESSION_ID, MEMBER_ID, EXERCISE_ID);

      // Max setNumber for EXERCISE_ID in sampleSession is 3 → new set should be 4
      const newSet = sessionDoc.sets.find(
        (s: {
          setNumber: number;
          isExtraSet: boolean;
          exerciseId: { toString: () => string };
        }) => s.setNumber === 4 && s.isExtraSet === true,
      );
      expect(newSet).toBeDefined();
      expect(newSet?.exerciseId.toString()).toBe(EXERCISE_ID);
      expect(sessionDoc.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when the exerciseId is not part of the session', async () => {
      const sessionDoc = {
        ...sampleSession,
        memberId: new Types.ObjectId(MEMBER_ID),
        completedAt: null,
        sets: sampleSession.sets.map((s) => ({ ...s })),
        save: jest.fn().mockResolvedValue(undefined),
      };
      workoutSessionModel.findById.mockResolvedValue(sessionDoc);

      const UNKNOWN_EXERCISE = new Types.ObjectId().toString();
      await expect(
        service.addSet(SESSION_ID, MEMBER_ID, UNKNOWN_EXERCISE),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteSet ────────────────────────────────────────────────────────────────

  describe('deleteSet', () => {
    it('removes the matching extra set and returns the updated session', async () => {
      const extraSet = {
        exerciseId: new Types.ObjectId(EXERCISE_ID),
        exerciseName: 'Bench Press',
        groupId: 'g1',
        isSuperset: false,
        isBodyweight: false,
        setNumber: 4,
        prescribedRepsMin: 8,
        prescribedRepsMax: 12,
        isExtraSet: true,
        actualReps: null,
        actualWeight: null,
        completedAt: null,
      };
      const sessionDoc = {
        ...sampleSession,
        memberId: new Types.ObjectId(MEMBER_ID),
        completedAt: null,
        sets: [...sampleSession.sets.map((s) => ({ ...s })), extraSet],
        save: jest.fn().mockResolvedValue(undefined),
      };
      workoutSessionModel.findById.mockResolvedValue(sessionDoc);

      await service.deleteSet(SESSION_ID, MEMBER_ID, EXERCISE_ID, 4);

      expect(
        sessionDoc.sets.find(
          (s: {
            setNumber: number;
            exerciseId: { toString: () => string };
            isExtraSet: boolean;
          }) => s.setNumber === 4 && s.exerciseId.toString() === EXERCISE_ID,
        ),
      ).toBeUndefined();
      expect(sessionDoc.save).toHaveBeenCalled();
    });

    it('throws BadRequestException when targeting a prescribed (non-extra) set', async () => {
      const sessionDoc = {
        ...sampleSession,
        memberId: new Types.ObjectId(MEMBER_ID),
        completedAt: null,
        sets: sampleSession.sets.map((s) => ({ ...s })),
        save: jest.fn().mockResolvedValue(undefined),
      };
      workoutSessionModel.findById.mockResolvedValue(sessionDoc);

      // setNumber 1 for EXERCISE_ID is prescribed (isExtraSet: false)
      await expect(
        service.deleteSet(SESSION_ID, MEMBER_ID, EXERCISE_ID, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
