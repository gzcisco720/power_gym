import { Test, TestingModule } from '@nestjs/testing';
import { BodyTestsController } from './body-tests.controller';
import { BodyTestsService } from './body-tests.service';
import { Types } from 'mongoose';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const OWNER_ID = new Types.ObjectId().toString();

const validDto = {
  date: '2026-06-03',
  age: 30,
  sex: 'male' as const,
  weight: 80,
  protocol: '3site' as const,
  chest: 10,
  abdominal: 20,
  thigh: 15,
};

describe('BodyTestsController', () => {
  let controller: BodyTestsController;
  let service: {
    findByMember: jest.Mock;
    create: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findByMember: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ _id: 'new-id' }),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BodyTestsController],
      providers: [{ provide: BodyTestsService, useValue: service }],
    }).compile();

    controller = module.get<BodyTestsController>(BodyTestsController);
  });

  describe('findMine', () => {
    it('calls service.findByMember with req.user.sub', async () => {
      const req: RequestWithUser & Request = {
        user: {
          sub: OWNER_ID,
          role: 'owner',
          firstName: 'Test',
          lastName: 'Owner',
          trainerId: null,
        },
      } as RequestWithUser & Request;

      await controller.findMine(req);

      expect(service.findByMember).toHaveBeenCalledWith(OWNER_ID);
    });
  });

  describe('create', () => {
    it('calls service.create with dto and req.user.sub', async () => {
      const req: RequestWithUser & Request = {
        user: {
          sub: OWNER_ID,
          role: 'owner',
          firstName: 'Test',
          lastName: 'Owner',
          trainerId: null,
        },
      } as RequestWithUser & Request;

      await controller.create(req, validDto);

      expect(service.create).toHaveBeenCalledWith(validDto, OWNER_ID);
    });
  });
});
