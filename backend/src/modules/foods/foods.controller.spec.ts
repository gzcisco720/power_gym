import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { FoodsController } from './foods.controller';
import { FoodsService } from './foods.service';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const USER_ID = new Types.ObjectId().toString();

const validDto = {
  name: 'Brown Rice',
  brand: null,
  macrosPer100g: { kcal: 360, protein: 7, carbs: 77, fat: 3 },
  servings: [],
};

describe('FoodsController', () => {
  let controller: FoodsController;
  let service: {
    search: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      search: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockResolvedValue({ _id: new Types.ObjectId(), ...validDto }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoodsController],
      providers: [{ provide: FoodsService, useValue: service }],
    }).compile();

    controller = module.get<FoodsController>(FoodsController);
  });

  describe('create', () => {
    it('delegates to service with dto and req.user.sub', async () => {
      const req: RequestWithUser & Request = {
        user: {
          sub: USER_ID,
          role: 'owner',
          firstName: 'Test',
          lastName: 'Owner',
          trainerId: null,
        },
      } as RequestWithUser & Request;

      await controller.create(req, validDto);

      expect(service.create).toHaveBeenCalledWith(validDto, USER_ID);
    });
  });
});
