import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { TrainersController } from './trainers.controller';
import { TrainersService } from './trainers.service';
import {
  TrainerListItem,
  TrainerDetailResponse,
} from './dto/trainer-response.types';

const TRAINER_ID = new Types.ObjectId().toString();

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

describe('TrainersController', () => {
  let controller: TrainersController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn().mockResolvedValue(TRAINER_LIST),
      findOne: jest.fn().mockResolvedValue(TRAINER_DETAIL),
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
});
