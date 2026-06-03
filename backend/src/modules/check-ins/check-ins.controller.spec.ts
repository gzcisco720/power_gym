import { Test, TestingModule } from '@nestjs/testing';
import { CheckInsController } from './check-ins.controller';
import { CheckInsService } from './check-ins.service';
import { Types } from 'mongoose';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const MEMBER_ID = new Types.ObjectId().toString();

const validDto = {
  sleepQuality: 7,
  stress: 5,
  fatigue: 4,
  hunger: 6,
  recovery: 8,
  energy: 7,
  digestion: 6,
  stuckToDiet: 'yes' as const,
};

describe('CheckInsController', () => {
  let controller: CheckInsController;
  let service: {
    create: jest.Mock;
    findByMember: jest.Mock;
    getUploadSignature: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ _id: 'new-id' }),
      findByMember: jest.fn().mockResolvedValue([]),
      getUploadSignature: jest
        .fn()
        .mockReturnValue({ provider: 'local', folder: 'check-ins' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckInsController],
      providers: [{ provide: CheckInsService, useValue: service }],
    }).compile();

    controller = module.get<CheckInsController>(CheckInsController);
  });

  describe('create', () => {
    it('passes req.user.sub as memberId to the service', async () => {
      const req: RequestWithUser & Request = {
        user: {
          sub: MEMBER_ID,
          role: 'member',
          firstName: 'Test',
          lastName: 'User',
          trainerId: null,
        },
      } as RequestWithUser & Request;

      await controller.create(req, validDto);

      expect(service.create).toHaveBeenCalledWith(validDto, MEMBER_ID);
    });
  });
});
