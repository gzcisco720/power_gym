import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const USER_ID = new Types.ObjectId().toString();

describe('ExercisesController', () => {
  let controller: ExercisesController;
  let service: {
    search: jest.Mock;
    create: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      search: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ _id: new Types.ObjectId() }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExercisesController],
      providers: [{ provide: ExercisesService, useValue: service }],
    }).compile();

    controller = module.get<ExercisesController>(ExercisesController);
  });

  describe('search', () => {
    it('passes the q query param and req.user.sub to the service', async () => {
      const req: RequestWithUser & Request = {
        user: {
          sub: USER_ID,
          role: 'owner',
          firstName: 'Test',
          lastName: 'Owner',
          trainerId: null,
        },
      } as RequestWithUser & Request;

      await controller.search(req, 'bench');

      expect(service.search).toHaveBeenCalledWith('bench', USER_ID);
    });

    it('passes empty string when q is undefined', async () => {
      const req: RequestWithUser & Request = {
        user: {
          sub: USER_ID,
          role: 'owner',
          firstName: 'Test',
          lastName: 'Owner',
          trainerId: null,
        },
      } as RequestWithUser & Request;

      await controller.search(req, undefined);

      expect(service.search).toHaveBeenCalledWith('', USER_ID);
    });
  });
});
