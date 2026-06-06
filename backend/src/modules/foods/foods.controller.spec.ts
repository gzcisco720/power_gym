import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { FoodsController } from './foods.controller';
import { FoodsService } from './foods.service';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const USER_ID = new Types.ObjectId().toString();
const FOOD_ID = new Types.ObjectId().toString();

const validDto = {
  name: 'Brown Rice',
  brand: null,
  macrosPer100g: { kcal: 360, protein: 7, carbs: 77, fat: 3 },
  servings: [],
};

const makeReq = (): RequestWithUser & Request =>
  ({
    user: {
      sub: USER_ID,
      role: 'owner',
      firstName: 'Test',
      lastName: 'Owner',
      trainerId: null,
    },
  }) as RequestWithUser & Request;

describe('FoodsController', () => {
  let controller: FoodsController;
  let service: {
    search: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      search: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId(), ...validDto }),
      update: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId(FOOD_ID), ...validDto }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodsController],
      providers: [{ provide: FoodsService, useValue: service }],
    }).compile();

    controller = module.get<FoodsController>(FoodsController);
  });

  describe('create', () => {
    it('delegates to service with dto and req.user.sub', async () => {
      await controller.create(makeReq(), validDto);

      expect(service.create).toHaveBeenCalledWith(validDto, USER_ID);
    });
  });

  describe('update', () => {
    it('delegates to service with id, dto and req.user.sub', async () => {
      const updateDto = { name: 'Updated Name' };

      await controller.update(makeReq(), FOOD_ID, updateDto);

      expect(service.update).toHaveBeenCalledWith(FOOD_ID, updateDto, USER_ID);
    });
  });

  describe('remove', () => {
    it('delegates to service with id and req.user.sub', async () => {
      await controller.remove(makeReq(), FOOD_ID);

      expect(service.remove).toHaveBeenCalledWith(FOOD_ID, USER_ID);
    });
  });
});
