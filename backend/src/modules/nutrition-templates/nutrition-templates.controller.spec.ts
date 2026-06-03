import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { NutritionTemplatesController } from './nutrition-templates.controller';
import { NutritionTemplatesService } from './nutrition-templates.service';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const USER_ID = new Types.ObjectId().toString();
const TEMPLATE_ID = new Types.ObjectId().toString();

const validDto = {
  name: 'High Protein Plan',
  dayTypes: [],
};

describe('NutritionTemplatesController', () => {
  let controller: NutritionTemplatesController;
  let service: {
    findOwn: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findOwn: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ _id: TEMPLATE_ID, ...validDto }),
      update: jest.fn().mockResolvedValue({ _id: TEMPLATE_ID, ...validDto }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NutritionTemplatesController],
      providers: [{ provide: NutritionTemplatesService, useValue: service }],
    }).compile();

    controller = module.get<NutritionTemplatesController>(
      NutritionTemplatesController,
    );
  });

  describe('findOwn', () => {
    it('delegates to service with req.user.sub', async () => {
      const req: RequestWithUser & Request = {
        user: {
          sub: USER_ID,
          role: 'owner',
          firstName: 'Test',
          lastName: 'Owner',
          trainerId: null,
        },
      } as RequestWithUser & Request;

      await controller.findOwn(req);

      expect(service.findOwn).toHaveBeenCalledWith(USER_ID);
    });
  });
});
