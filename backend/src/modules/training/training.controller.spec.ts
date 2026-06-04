import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const OWNER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();
const MEMBER_ID = new Types.ObjectId().toString();
const TEMPLATE_ID = new Types.ObjectId().toString();
const SESSION_ID = new Types.ObjectId().toString();

const ownerUser: JwtUser = {
  sub: OWNER_ID,
  role: 'owner',
  firstName: 'Test',
  lastName: 'Owner',
  trainerId: null,
};

const trainerUser: JwtUser = {
  sub: TRAINER_ID,
  role: 'trainer',
  firstName: 'Test',
  lastName: 'Trainer',
  trainerId: null,
};

const memberUser: JwtUser = {
  sub: MEMBER_ID,
  role: 'member',
  firstName: 'Test',
  lastName: 'Member',
  trainerId: TRAINER_ID,
};

describe('TrainingController', () => {
  let controller: TrainingController;
  let service: {
    getMyPlan: jest.Mock;
    assignPlan: jest.Mock;
    startSession: jest.Mock;
    patchSet: jest.Mock;
    finishSession: jest.Mock;
    getHistory: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getMyPlan: jest.fn().mockResolvedValue(null),
      assignPlan: jest.fn().mockResolvedValue({ _id: 'plan-id' }),
      startSession: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      patchSet: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      finishSession: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      getHistory: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TrainingController],
      providers: [{ provide: TrainingService, useValue: service }],
    }).compile();

    controller = module.get<TrainingController>(TrainingController);
  });

  describe('assignPlan', () => {
    it('delegates to service with memberId, templateId, caller role and id', async () => {
      const req = { user: ownerUser } as RequestWithUser & Request;
      const dto = { templateId: TEMPLATE_ID };

      await controller.assignPlan(req, MEMBER_ID, dto);

      expect(service.assignPlan).toHaveBeenCalledWith(
        MEMBER_ID,
        TEMPLATE_ID,
        OWNER_ID,
        'owner',
      );
    });

    it('trainer delegates with trainer id and role', async () => {
      const req = { user: trainerUser } as RequestWithUser & Request;
      const dto = { templateId: TEMPLATE_ID };

      await controller.assignPlan(req, MEMBER_ID, dto);

      expect(service.assignPlan).toHaveBeenCalledWith(
        MEMBER_ID,
        TEMPLATE_ID,
        TRAINER_ID,
        'trainer',
      );
    });
  });

  describe('getMyPlan', () => {
    it('delegates to service with the member id', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.getMyPlan(req, mockRes as never);

      expect(service.getMyPlan).toHaveBeenCalledWith(MEMBER_ID);
    });
  });

  describe('startSession', () => {
    it('delegates to service with memberId and dayNumber', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;
      const dto = { dayNumber: 1 };

      await controller.startSession(req, dto);

      expect(service.startSession).toHaveBeenCalledWith(MEMBER_ID, 1);
    });
  });

  describe('patchSet', () => {
    it('delegates to service with sessionId, memberId, and dto', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;
      const dto = {
        setNumber: 1,
        exerciseId: new Types.ObjectId().toString(),
        actualReps: 10,
        actualWeight: 80,
      };

      await controller.patchSet(req, SESSION_ID, dto);

      expect(service.patchSet).toHaveBeenCalledWith(SESSION_ID, MEMBER_ID, dto);
    });
  });

  describe('finishSession', () => {
    it('delegates to service with sessionId and memberId', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;

      await controller.finishSession(req, SESSION_ID);

      expect(service.finishSession).toHaveBeenCalledWith(SESSION_ID, MEMBER_ID);
    });
  });

  describe('getHistory', () => {
    it('delegates to service with memberId, callerId, and callerRole', async () => {
      const req = { user: ownerUser } as RequestWithUser & Request;

      await controller.getHistory(req, MEMBER_ID);

      expect(service.getHistory).toHaveBeenCalledWith(
        MEMBER_ID,
        OWNER_ID,
        'owner',
      );
    });
  });
});
