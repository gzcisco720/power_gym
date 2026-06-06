import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { TrainersService } from './trainers.service';
import { User } from '../../common/models/user.model';
import { WorkoutSession } from '../../common/models/workout-session.model';
import { ScheduledSession } from '../../common/models/scheduled-session.model';
import { MemberPlan } from '../../common/models/member-plan.model';
import { PlanTemplate } from '../../common/models/plan-template.model';
import {
  NutritionTemplate,
} from '../../modules/nutrition-templates/nutrition-template.model';

const OWNER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();
const TRAINER2_ID = new Types.ObjectId().toString();
const MEMBER1_ID = new Types.ObjectId().toString();
const MEMBER2_ID = new Types.ObjectId().toString();

function makeTrainer(
  id: string,
  firstName = 'Jane',
  lastName = 'Smith',
  email = 'jane@example.com',
  createdAt = new Date('2025-01-01T00:00:00Z'),
) {
  return {
    _id: new Types.ObjectId(id),
    firstName,
    lastName,
    email,
    role: 'trainer',
    trainerId: null,
    createdAt,
  };
}

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

describe('TrainersService', () => {
  let service: TrainersService;
  let userModel: {
    find: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    findOne: jest.Mock;
  };
  let workoutSessionModel: {
    find: jest.Mock;
    countDocuments: jest.Mock;
  };
  let scheduledSessionModel: {
    find: jest.Mock;
  };
  let memberPlanModel: {
    findOne: jest.Mock;
  };
  let planTemplateModel: {
    find: jest.Mock;
  };
  let nutritionTemplateModel: {
    find: jest.Mock;
  };

  beforeEach(async () => {
    userModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findOne: jest.fn(),
    };
    workoutSessionModel = {
      find: jest.fn(),
      countDocuments: jest.fn(),
    };
    scheduledSessionModel = {
      find: jest.fn(),
    };
    memberPlanModel = {
      findOne: jest.fn(),
    };
    planTemplateModel = {
      find: jest.fn(),
    };
    nutritionTemplateModel = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainersService,
        { provide: getModelToken(User.name), useValue: userModel },
        {
          provide: getModelToken(WorkoutSession.name),
          useValue: workoutSessionModel,
        },
        {
          provide: getModelToken(ScheduledSession.name),
          useValue: scheduledSessionModel,
        },
        {
          provide: getModelToken(MemberPlan.name),
          useValue: memberPlanModel,
        },
        {
          provide: getModelToken(PlanTemplate.name),
          useValue: planTemplateModel,
        },
        {
          provide: getModelToken(NutritionTemplate.name),
          useValue: nutritionTemplateModel,
        },
      ],
    }).compile();

    service = module.get<TrainersService>(TrainersService);
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns all role=trainer users mapped to {id, name, email, memberCount}', async () => {
      const trainer1 = makeTrainer(
        TRAINER_ID,
        'Jane',
        'Smith',
        'jane@example.com',
      );
      const trainer2 = makeTrainer(
        TRAINER2_ID,
        'Bob',
        'Jones',
        'bob@example.com',
      );
      const member1 = makeMember(MEMBER1_ID, TRAINER_ID);
      const member2 = makeMember(MEMBER2_ID, TRAINER_ID);

      userModel.find.mockImplementation(
        (query: { role?: string; trainerId?: Types.ObjectId }) => {
          if (query.role === 'trainer')
            return Promise.resolve([trainer1, trainer2]);
          if (
            query.role === 'member' &&
            query.trainerId?.toString() === TRAINER_ID
          ) {
            return Promise.resolve([member1, member2]);
          }
          if (
            query.role === 'member' &&
            query.trainerId?.toString() === TRAINER2_ID
          ) {
            return Promise.resolve([]);
          }
          return Promise.resolve([]);
        },
      );

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: TRAINER_ID,
        name: 'Jane Smith',
        email: 'jane@example.com',
        memberCount: 2,
      });
      expect(result[1]).toMatchObject({
        id: TRAINER2_ID,
        name: 'Bob Jones',
        email: 'bob@example.com',
        memberCount: 0,
      });
    });

    it('returns memberCount of 0 for a trainer with no assigned members', async () => {
      const trainer = makeTrainer(TRAINER_ID);

      userModel.find.mockImplementation(
        (query: { role?: string; trainerId?: Types.ObjectId }) => {
          if (query.role === 'trainer') return Promise.resolve([trainer]);
          if (query.role === 'member') return Promise.resolve([]);
          return Promise.resolve([]);
        },
      );

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].memberCount).toBe(0);
    });
  });

  // ─── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('returns trainer detail with members list, joinDate, and memberCount', async () => {
      const joinDate = new Date('2025-03-15T10:00:00Z');
      const trainer = makeTrainer(
        TRAINER_ID,
        'Jane',
        'Smith',
        'jane@example.com',
        joinDate,
      );
      const member1 = makeMember(
        MEMBER1_ID,
        TRAINER_ID,
        'Alice',
        'Lee',
        'alice@example.com',
      );
      const member2 = makeMember(
        MEMBER2_ID,
        TRAINER_ID,
        'Tom',
        'Brown',
        'tom@example.com',
      );

      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(trainer),
      });
      userModel.find.mockResolvedValue([member1, member2]);

      const result = await service.findOne(TRAINER_ID);

      expect(result).toMatchObject({
        id: TRAINER_ID,
        name: 'Jane Smith',
        email: 'jane@example.com',
        memberCount: 2,
        joinDate: joinDate.toISOString(),
      });
      expect(result.members).toHaveLength(2);
      expect(result.members[0]).toMatchObject({
        id: MEMBER1_ID,
        name: 'Alice Lee',
        email: 'alice@example.com',
      });
      expect(result.members[1]).toMatchObject({
        id: MEMBER2_ID,
        name: 'Tom Brown',
        email: 'tom@example.com',
      });
    });

    it('throws NotFoundException when id is not a trainer', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.findOne(OWNER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when found user has a non-trainer role', async () => {
      const member = makeMember(MEMBER1_ID, null);
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(member),
      });

      await expect(service.findOne(MEMBER1_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── getTrainerMembers ────────────────────────────────────────────────────────

  describe('getTrainerMembers', () => {
    it('returns members of the trainer each with streak, sessionsThisMonth, and a valid status', async () => {
      const trainer = makeTrainer(TRAINER_ID);
      const member1 = makeMember(MEMBER1_ID, TRAINER_ID, 'Alice', 'Lee', 'alice@example.com');
      const member2 = makeMember(MEMBER2_ID, TRAINER_ID, 'Bob', 'Brown', 'bob@example.com');

      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(trainer),
      });
      userModel.find.mockResolvedValue([member1, member2]);

      // member1 has an active plan and streak > 0 → active
      // member2 has an active plan but streak = 0 → needs-attn
      memberPlanModel.findOne
        .mockResolvedValueOnce({ _id: new Types.ObjectId(), isActive: true }) // member1
        .mockResolvedValueOnce({ _id: new Types.ObjectId(), isActive: true }); // member2

      // streak: member1 has sessions today → streak 1; member2 has none
      const now = new Date();
      const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      workoutSessionModel.find
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([{ completedAt: now }]) }) // member1 streak query
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) }); // member2 streak query

      // sessionsThisMonth
      workoutSessionModel.countDocuments
        .mockResolvedValueOnce(3) // member1
        .mockResolvedValueOnce(0); // member2

      const result = await service.getTrainerMembers(TRAINER_ID);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: MEMBER1_ID,
        name: 'Alice Lee',
        email: 'alice@example.com',
        streak: 1,
        sessionsThisMonth: 3,
        status: 'active',
      });
      expect(result[1]).toMatchObject({
        id: MEMBER2_ID,
        streak: 0,
        sessionsThisMonth: 0,
        status: 'needs-attn',
      });

      // Suppress unused variable warning
      void todayKey;
    });

    it('derives status no-plan when the member has no active plan, active when streak>0, needs-attn otherwise', async () => {
      const trainer = makeTrainer(TRAINER_ID);
      const member1 = makeMember(MEMBER1_ID, TRAINER_ID); // no plan
      const member2 = makeMember(MEMBER2_ID, TRAINER_ID); // plan + streak > 0 → active

      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(trainer),
      });
      userModel.find.mockResolvedValue([member1, member2]);

      memberPlanModel.findOne
        .mockResolvedValueOnce(null) // member1: no plan
        .mockResolvedValueOnce({ _id: new Types.ObjectId(), isActive: true }); // member2

      const now = new Date();
      workoutSessionModel.find
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) }) // member1 streak (irrelevant)
        .mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([{ completedAt: now }]) }); // member2 streak

      workoutSessionModel.countDocuments
        .mockResolvedValueOnce(0)  // member1
        .mockResolvedValueOnce(5); // member2

      const result = await service.getTrainerMembers(TRAINER_ID);

      expect(result[0].status).toBe('no-plan');
      expect(result[1].status).toBe('active');
    });

    it('throws NotFoundException when the id is not a trainer', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getTrainerMembers(OWNER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── getTrainerSessions ────────────────────────────────────────────────────────

  describe('getTrainerSessions', () => {
    it('returns only sessions whose trainerId matches the target trainer', async () => {
      const trainer = makeTrainer(TRAINER_ID);
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(trainer),
      });

      const trainerObjId = new Types.ObjectId(TRAINER_ID);
      const sessionDate = new Date('2025-03-10T09:00:00Z');
      const rawSession = {
        _id: new Types.ObjectId(),
        trainerId: trainerObjId,
        memberIds: [new Types.ObjectId(MEMBER1_ID)],
        date: sessionDate,
        startTime: '09:00',
        endTime: '10:00',
        status: 'scheduled',
        serviceTypeId: null,
        customServiceName: 'Personal Training',
      };

      scheduledSessionModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([rawSession]),
        }),
      });

      userModel.find.mockResolvedValue([
        makeMember(MEMBER1_ID, TRAINER_ID, 'Alice', 'Lee', 'alice@example.com'),
      ]);

      const result = await service.getTrainerSessions(TRAINER_ID);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: rawSession._id.toString(),
        startTime: '09:00',
        endTime: '10:00',
        status: 'scheduled',
      });
    });
  });

  // ─── getTrainerTrainingPlans ───────────────────────────────────────────────────

  describe('getTrainerTrainingPlans', () => {
    it('returns only plan templates created by the target trainer', async () => {
      const trainer = makeTrainer(TRAINER_ID);
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(trainer),
      });

      const planId = new Types.ObjectId();
      planTemplateModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: planId,
            name: 'Strength Plan',
            days: [{ dayNumber: 1 }, { dayNumber: 2 }],
            createdAt: new Date('2025-01-15T00:00:00Z'),
            createdBy: new Types.ObjectId(TRAINER_ID),
          },
        ]),
      });

      const result = await service.getTrainerTrainingPlans(TRAINER_ID);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: planId.toString(),
        name: 'Strength Plan',
        dayCount: 2,
      });
      expect(typeof result[0].createdAt).toBe('string');
    });
  });

  // ─── getTrainerNutritionPlans ─────────────────────────────────────────────────

  describe('getTrainerNutritionPlans', () => {
    it('returns only nutrition templates created by the target trainer', async () => {
      const trainer = makeTrainer(TRAINER_ID);
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(trainer),
      });

      const templateId = new Types.ObjectId();
      nutritionTemplateModel.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: templateId,
            name: 'High Protein Diet',
            dayTypes: [{ name: 'Training Day' }, { name: 'Rest Day' }],
            createdAt: new Date('2025-02-01T00:00:00Z'),
            createdBy: new Types.ObjectId(TRAINER_ID),
          },
        ]),
      });

      const result = await service.getTrainerNutritionPlans(TRAINER_ID);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: templateId.toString(),
        name: 'High Protein Diet',
        dayCount: 2,
      });
    });
  });

  // ─── reassignMember ───────────────────────────────────────────────────────────

  describe('reassignMember', () => {
    it('updates the member\'s trainerId to the new trainer and returns the updated member', async () => {
      const member = makeMember(MEMBER1_ID, TRAINER_ID, 'Alice', 'Lee', 'alice@example.com');
      const newTrainer = makeTrainer(TRAINER2_ID, 'Bob', 'Coach', 'bob@example.com');

      // Lookup current trainer to validate it exists
      userModel.findById
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(makeTrainer(TRAINER_ID)),
        }) // current trainer check
        .mockReturnValueOnce({
          lean: jest.fn().mockResolvedValue(newTrainer),
        }); // new trainer check

      // Member currently assigned to TRAINER_ID
      userModel.findOne.mockResolvedValue(member);

      const updatedMember = {
        ...member,
        trainerId: new Types.ObjectId(TRAINER2_ID),
      };
      userModel.findByIdAndUpdate.mockResolvedValue(updatedMember);

      const result = await service.reassignMember(
        TRAINER_ID,
        MEMBER1_ID,
        TRAINER2_ID,
      );

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        new Types.ObjectId(MEMBER1_ID),
        { trainerId: new Types.ObjectId(TRAINER2_ID) },
        { new: true },
      );
      expect(result).toMatchObject({
        id: MEMBER1_ID,
        name: 'Alice Lee',
        email: 'alice@example.com',
      });
    });

    it('throws NotFoundException when the member is not currently assigned to the path trainer', async () => {
      userModel.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(makeTrainer(TRAINER_ID)),
      });

      // Member not found under this trainer
      userModel.findOne.mockResolvedValue(null);

      await expect(
        service.reassignMember(TRAINER_ID, MEMBER1_ID, TRAINER2_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
