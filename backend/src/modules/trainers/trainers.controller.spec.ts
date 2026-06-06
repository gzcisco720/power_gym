import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';
import {
  TrainerListItem,
  TrainerDetailResponse,
  TrainerMemberMetrics,
  TrainerSessionItem,
  TrainerTemplateItem,
} from './dto/trainer-response.types';
import { ReassignMemberDto } from './dto/reassign-member.dto';

const TRAINER_ID = new Types.ObjectId().toString();
const TRAINER2_ID = new Types.ObjectId().toString();
const MEMBER_ID = new Types.ObjectId().toString();

const TRAINER_LIST: TrainerListItem[] = [
  {
    id: TRAINER_ID,
    name: 'Jane Smith',
    email: 'jane@example.com',
    memberCount: 2,
  },
];

const TRAINER_DETAIL: TrainerDetailResponse = {
  id: TRAINER_ID,
  name: 'Jane Smith',
  email: 'jane@example.com',
  memberCount: 2,
  joinDate: new Date('2025-01-01').toISOString(),
  members: [
    {
      id: new Types.ObjectId().toString(),
      name: 'Alice Lee',
      email: 'alice@example.com',
    },
  ],
};

const TRAINER_MEMBERS: TrainerMemberMetrics[] = [
  {
    id: MEMBER_ID,
    name: 'Alice Lee',
    email: 'alice@example.com',
    streak: 3,
    sessionsThisMonth: 5,
    status: 'active',
  },
];

const TRAINER_SESSIONS: TrainerSessionItem[] = [
  {
    id: new Types.ObjectId().toString(),
    date: '2025-03-10',
    startTime: '09:00',
    endTime: '10:00',
    memberNames: ['Alice Lee'],
    serviceTypeName: 'Personal Training',
    status: 'scheduled',
  },
];

const TRAINER_TEMPLATES: TrainerTemplateItem[] = [
  {
    id: new Types.ObjectId().toString(),
    name: 'Strength Plan',
    dayCount: 3,
    createdAt: new Date('2025-01-15').toISOString(),
  },
];

describe('TrainersController', () => {
  let controller: TrainersController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    getTrainerMembers: jest.Mock;
    getTrainerSessions: jest.Mock;
    getTrainerTrainingPlans: jest.Mock;
    getTrainerNutritionPlans: jest.Mock;
    reassignMember: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue(TRAINER_LIST),
      findOne: jest.fn().mockResolvedValue(TRAINER_DETAIL),
      getTrainerMembers: jest.fn().mockResolvedValue(TRAINER_MEMBERS),
      getTrainerSessions: jest.fn().mockResolvedValue(TRAINER_SESSIONS),
      getTrainerTrainingPlans: jest.fn().mockResolvedValue(TRAINER_TEMPLATES),
      getTrainerNutritionPlans: jest.fn().mockResolvedValue(TRAINER_TEMPLATES),
      reassignMember: jest.fn().mockResolvedValue({
        id: MEMBER_ID,
        name: 'Alice Lee',
        email: 'alice@example.com',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainersController],
      providers: [{ provide: TrainersService, useValue: service }],
    }).compile();

    controller = module.get<TrainersController>(TrainersController);
  });

  describe('findAll', () => {
    it('delegates to service.findAll and returns its result', async () => {
      const result = await controller.findAll();

      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(TRAINER_LIST);
    });
  });

  describe('findOne', () => {
    it('delegates to service.findOne with the route id', async () => {
      const result = await controller.findOne(TRAINER_ID);

      expect(service.findOne).toHaveBeenCalledWith(TRAINER_ID);
      expect(result).toEqual(TRAINER_DETAIL);
    });
  });

  describe('getTrainerMembers', () => {
    it('delegates to service with the trainer id', async () => {
      const result = await controller.getTrainerMembers(TRAINER_ID);

      expect(service.getTrainerMembers).toHaveBeenCalledWith(TRAINER_ID);
      expect(result).toEqual(TRAINER_MEMBERS);
    });
  });

  describe('getTrainerSessions', () => {
    it('delegates to service with the trainer id', async () => {
      const result = await controller.getTrainerSessions(TRAINER_ID);

      expect(service.getTrainerSessions).toHaveBeenCalledWith(TRAINER_ID);
      expect(result).toEqual(TRAINER_SESSIONS);
    });
  });

  describe('getTrainerTrainingPlans', () => {
    it('delegates to service with the trainer id', async () => {
      const result = await controller.getTrainerTrainingPlans(TRAINER_ID);

      expect(service.getTrainerTrainingPlans).toHaveBeenCalledWith(TRAINER_ID);
      expect(result).toEqual(TRAINER_TEMPLATES);
    });
  });

  describe('getTrainerNutritionPlans', () => {
    it('delegates to service with the trainer id', async () => {
      const result = await controller.getTrainerNutritionPlans(TRAINER_ID);

      expect(service.getTrainerNutritionPlans).toHaveBeenCalledWith(TRAINER_ID);
      expect(result).toEqual(TRAINER_TEMPLATES);
    });
  });

  describe('reassignMember', () => {
    it('delegates to service with current trainerId, memberId, and target trainerId', async () => {
      const dto: ReassignMemberDto = { trainerId: TRAINER2_ID };
      const result = await controller.reassignMember(TRAINER_ID, MEMBER_ID, dto);

      expect(service.reassignMember).toHaveBeenCalledWith(
        TRAINER_ID,
        MEMBER_ID,
        TRAINER2_ID,
      );
      expect(result).toMatchObject({ id: MEMBER_ID });
    });
  });
});
