import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ScheduledSessionsController } from './scheduled-sessions.controller';
import { ScheduledSessionsService } from './scheduled-sessions.service';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const MEMBER_ID = new Types.ObjectId().toString();

const memberReq = {
  user: {
    sub: MEMBER_ID,
    role: 'member' as const,
    firstName: 'Test',
    lastName: 'Member',
    trainerId: null,
  },
} as RequestWithUser & Request;

describe('ScheduledSessionsController', () => {
  let controller: ScheduledSessionsController;
  let service: { findForMember: jest.Mock };

  beforeEach(async () => {
    service = {
      findForMember: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScheduledSessionsController],
      providers: [{ provide: ScheduledSessionsService, useValue: service }],
    }).compile();

    controller = module.get<ScheduledSessionsController>(
      ScheduledSessionsController,
    );
  });

  describe('findMySessions', () => {
    it('passes req.user.sub to service.findForMember and returns its result', async () => {
      const fakeSessions = [{ _id: 'abc', trainerName: 'Alice Smith' }];
      service.findForMember.mockResolvedValue(fakeSessions);

      const result = await controller.findMySessions(memberReq);

      expect(service.findForMember).toHaveBeenCalledWith(MEMBER_ID);
      expect(result).toEqual(fakeSessions);
    });
  });
});
