import { Test, TestingModule } from '@nestjs/testing';
import { CheckInsController } from './check-ins.controller';
import { CheckInsService } from './check-ins.service';
import { Types } from 'mongoose';
import { JwtUser } from '../auth/strategies/jwt.strategy';

const MEMBER_ID_2 = new Types.ObjectId().toString();
const CHECK_IN_ID = new Types.ObjectId().toString();

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
    findByMemberScoped: jest.Mock;
    findOneByMemberScoped: jest.Mock;
    findPhotosForMemberScoped: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn().mockResolvedValue({ _id: 'new-id' }),
      findByMember: jest.fn().mockResolvedValue([]),
      getUploadSignature: jest
        .fn()
        .mockReturnValue({ provider: 'local', folder: 'check-ins' }),
      findByMemberScoped: jest.fn().mockResolvedValue([]),
      findOneByMemberScoped: jest
        .fn()
        .mockResolvedValue({ _id: 'check-in-id' }),
      findPhotosForMemberScoped: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CheckInsController],
      providers: [{ provide: CheckInsService, useValue: service }],
    }).compile();

    controller = module.get<CheckInsController>(CheckInsController);
  });

  describe('findMemberCheckIns', () => {
    it('passes memberId, req.user.sub, req.user.role to the service', async () => {
      const req: RequestWithUser & Request = {
        user: {
          sub: new Types.ObjectId().toString(),
          role: 'trainer',
          firstName: 'Test',
          lastName: 'Trainer',
          trainerId: null,
        },
      } as RequestWithUser & Request;

      await controller.findMemberCheckIns(req, MEMBER_ID_2);

      expect(service.findByMemberScoped).toHaveBeenCalledWith(
        MEMBER_ID_2,
        req.user.sub,
        req.user.role,
      );
    });
  });

  describe('findMemberCheckIn', () => {
    it('passes memberId, id, req.user.sub, req.user.role to the service', async () => {
      const req: RequestWithUser & Request = {
        user: {
          sub: new Types.ObjectId().toString(),
          role: 'owner',
          firstName: 'Test',
          lastName: 'Owner',
          trainerId: null,
        },
      } as RequestWithUser & Request;

      await controller.findMemberCheckIn(req, MEMBER_ID_2, CHECK_IN_ID);

      expect(service.findOneByMemberScoped).toHaveBeenCalledWith(
        MEMBER_ID_2,
        CHECK_IN_ID,
        req.user.sub,
        req.user.role,
      );
    });
  });

  describe('findMemberPhotos', () => {
    it('delegates to service with memberId, caller id, and caller role', async () => {
      const callerId = new Types.ObjectId().toString();
      const req: RequestWithUser & Request = {
        user: {
          sub: callerId,
          role: 'trainer',
          firstName: 'Test',
          lastName: 'Trainer',
          trainerId: null,
        },
      } as RequestWithUser & Request;

      await controller.findMemberPhotos(req, MEMBER_ID_2);

      expect(service.findPhotosForMemberScoped).toHaveBeenCalledWith(
        MEMBER_ID_2,
        callerId,
        'trainer',
      );
    });
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
