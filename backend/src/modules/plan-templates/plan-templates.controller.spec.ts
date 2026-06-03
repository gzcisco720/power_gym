import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { PlanTemplatesController } from './plan-templates.controller';
import { PlanTemplatesService } from './plan-templates.service';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const USER_ID = new Types.ObjectId().toString();
const TEMPLATE_ID = new Types.ObjectId().toString();

const validDto = {
  name: 'Push Day',
  description: null,
  days: [],
};

describe('PlanTemplatesController', () => {
  let controller: PlanTemplatesController;
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
      controllers: [PlanTemplatesController],
      providers: [{ provide: PlanTemplatesService, useValue: service }],
    }).compile();

    controller = module.get<PlanTemplatesController>(PlanTemplatesController);
  });

  describe('create', () => {
    it('delegates to service with req.user.sub and the dto', async () => {
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
