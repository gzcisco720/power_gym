import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ScheduledSessionsController } from './scheduled-sessions.controller';
import { ScheduledSessionsService } from './scheduled-sessions.service';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const MEMBER_ID = new Types.ObjectId().toString();
const OWNER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();

const memberReq = {
  user: {
    sub: MEMBER_ID,
    role: 'member' as const,
    firstName: 'Test',
    lastName: 'Member',
    trainerId: null,
  },
} as RequestWithUser & Request;

const ownerReq = {
  user: {
    sub: OWNER_ID,
    role: 'owner' as const,
    firstName: 'Test',
    lastName: 'Owner',
    trainerId: null,
  },
} as RequestWithUser & Request;

const trainerReq = {
  user: {
    sub: TRAINER_ID,
    role: 'trainer' as const,
    firstName: 'Test',
    lastName: 'Trainer',
    trainerId: null,
  },
} as RequestWithUser & Request;

describe('ScheduledSessionsController', () => {
  let controller: ScheduledSessionsController;
  let service: {
    findForMember: jest.Mock;
    listForStaff: jest.Mock;
    createSession: jest.Mock;
    updateSession: jest.Mock;
    deleteSession: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findForMember: jest.fn(),
      listForStaff: jest.fn(),
      createSession: jest.fn(),
      updateSession: jest.fn(),
      deleteSession: jest.fn(),
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

  describe('listSessions', () => {
    it('delegates to service.listForStaff with role=owner and range=upcoming by default', async () => {
      service.listForStaff.mockResolvedValue([]);

      await controller.listSessions(ownerReq, { range: undefined });

      expect(service.listForStaff).toHaveBeenCalledWith(
        'owner',
        OWNER_ID,
        'upcoming',
      );
    });

    it('passes range=past when query specifies past', async () => {
      service.listForStaff.mockResolvedValue([]);

      await controller.listSessions(ownerReq, { range: 'past' });

      expect(service.listForStaff).toHaveBeenCalledWith(
        'owner',
        OWNER_ID,
        'past',
      );
    });
  });

  describe('create', () => {
    it('delegates to service.createSession with req.user.sub and role', async () => {
      const dto = {
        date: '2026-07-01T00:00:00.000Z',
        startTime: '09:00',
        endTime: '10:00',
        memberIds: [new Types.ObjectId().toString()],
      };
      const fakeSessions = [{ _id: 'abc' }];
      service.createSession.mockResolvedValue(fakeSessions);

      const result = await controller.createSession(dto, ownerReq);

      expect(service.createSession).toHaveBeenCalledWith(
        dto,
        'owner',
        OWNER_ID,
      );
      expect(result).toEqual(fakeSessions);
    });
  });

  describe('update', () => {
    it('delegates to service.updateSession with id, dto, role, and callerId', async () => {
      const id = new Types.ObjectId().toString();
      const dto = { startTime: '10:00' };
      const fakeSession = { _id: id };
      service.updateSession.mockResolvedValue(fakeSession);

      const result = await controller.updateSession(id, dto, trainerReq);

      expect(service.updateSession).toHaveBeenCalledWith(
        id,
        dto,
        'trainer',
        TRAINER_ID,
      );
      expect(result).toEqual(fakeSession);
    });
  });

  describe('delete', () => {
    it('delegates to service.deleteSession with id, scope, role, and callerId', async () => {
      const id = new Types.ObjectId().toString();
      service.deleteSession.mockResolvedValue(undefined);

      await controller.deleteSession(id, 'single', ownerReq);

      expect(service.deleteSession).toHaveBeenCalledWith(
        id,
        'single',
        'owner',
        OWNER_ID,
      );
    });

    it('defaults scope to single when not provided', async () => {
      const id = new Types.ObjectId().toString();
      service.deleteSession.mockResolvedValue(undefined);

      await controller.deleteSession(id, undefined, ownerReq);

      expect(service.deleteSession).toHaveBeenCalledWith(
        id,
        'single',
        'owner',
        OWNER_ID,
      );
    });
  });
});
