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
    getProgress: jest.Mock;
    getExerciseHistory: jest.Mock;
    getMemberPlan: jest.Mock;
    startMemberSession: jest.Mock;
    patchMemberSet: jest.Mock;
    finishMemberSession: jest.Mock;
    getSelfSessions: jest.Mock;
    getSelfSession: jest.Mock;
    addSet: jest.Mock;
    deleteSet: jest.Mock;
    addMemberSet: jest.Mock;
    deleteMemberSet: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getMyPlan: jest.fn().mockResolvedValue(null),
      assignPlan: jest.fn().mockResolvedValue({ _id: 'plan-id' }),
      startSession: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      patchSet: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      finishSession: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      getHistory: jest.fn().mockResolvedValue([]),
      getProgress: jest
        .fn()
        .mockResolvedValue({ heatmapDates: [], exercises: [] }),
      getExerciseHistory: jest
        .fn()
        .mockResolvedValue({ exerciseId: '', exerciseName: '', sessions: [] }),
      getMemberPlan: jest.fn().mockResolvedValue(null),
      startMemberSession: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      patchMemberSet: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      finishMemberSession: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      getSelfSessions: jest.fn().mockResolvedValue([]),
      getSelfSession: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      addSet: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      deleteSet: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      addMemberSet: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
      deleteMemberSet: jest.fn().mockResolvedValue({ _id: SESSION_ID }),
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

      await controller.finishSession(req, SESSION_ID, {});

      expect(service.finishSession).toHaveBeenCalledWith(
        SESSION_ID,
        MEMBER_ID,
        undefined,
      );
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

  describe('getProgress', () => {
    it('delegates to service with memberId, req.user.sub, req.user.role', async () => {
      const req = { user: trainerUser } as RequestWithUser & Request;

      await controller.getProgress(req, MEMBER_ID);

      expect(service.getProgress).toHaveBeenCalledWith(
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
      );
    });
  });

  describe('getMemberPlan', () => {
    it('delegates to service with memberId, caller sub and role', async () => {
      const req = { user: trainerUser } as RequestWithUser & Request;
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.getMemberPlan(req, MEMBER_ID, mockRes as never);

      expect(service.getMemberPlan).toHaveBeenCalledWith(
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
      );
    });
  });

  describe('startMemberSession', () => {
    it('delegates to service with memberId, dto.dayNumber, caller sub and role', async () => {
      const req = { user: trainerUser } as RequestWithUser & Request;
      const dto = { dayNumber: 1 };

      await controller.startMemberSession(req, MEMBER_ID, dto);

      expect(service.startMemberSession).toHaveBeenCalledWith(
        MEMBER_ID,
        1,
        TRAINER_ID,
        'trainer',
      );
    });
  });

  describe('finishMemberSession', () => {
    it('delegates to service with sessionId, memberId, caller sub and role', async () => {
      const req = { user: trainerUser } as RequestWithUser & Request;

      await controller.finishMemberSession(req, MEMBER_ID, SESSION_ID, {});

      expect(service.finishMemberSession).toHaveBeenCalledWith(
        SESSION_ID,
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
        undefined,
      );
    });
  });

  describe('getExerciseHistory', () => {
    it('delegates to service with memberId, exerciseId, req.user.sub, req.user.role', async () => {
      const req = { user: trainerUser } as RequestWithUser & Request;
      const EXERCISE_ID = new Types.ObjectId().toString();

      await controller.getExerciseHistory(req, MEMBER_ID, EXERCISE_ID);

      expect(service.getExerciseHistory).toHaveBeenCalledWith(
        MEMBER_ID,
        EXERCISE_ID,
        TRAINER_ID,
        'trainer',
      );
    });
  });

  describe('getSelfSessions', () => {
    it('delegates to service with the caller id from the JWT', async () => {
      const req = { user: trainerUser } as RequestWithUser & Request;

      await controller.getSelfSessions(req);

      expect(service.getSelfSessions).toHaveBeenCalledWith(TRAINER_ID);
    });
  });

  describe('getSelfSession', () => {
    it('delegates to service with session id and caller id', async () => {
      const req = { user: trainerUser } as RequestWithUser & Request;

      await controller.getSelfSession(req, SESSION_ID);

      expect(service.getSelfSession).toHaveBeenCalledWith(
        SESSION_ID,
        TRAINER_ID,
      );
    });
  });

  describe('finishSession (with rpe)', () => {
    it('passes rpe from body to service', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;

      await controller.finishSession(req, SESSION_ID, { rpe: 8 });

      expect(service.finishSession).toHaveBeenCalledWith(
        SESSION_ID,
        MEMBER_ID,
        8,
      );
    });

    it('passes undefined rpe when body is empty', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;

      await controller.finishSession(req, SESSION_ID, {});

      expect(service.finishSession).toHaveBeenCalledWith(
        SESSION_ID,
        MEMBER_ID,
        undefined,
      );
    });
  });

  describe('addSet', () => {
    it('delegates to service with sessionId, memberId, exerciseId', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;
      const EXERCISE_ID = new Types.ObjectId().toString();

      await controller.addSet(req, SESSION_ID, { exerciseId: EXERCISE_ID });

      expect(service.addSet).toHaveBeenCalledWith(
        SESSION_ID,
        MEMBER_ID,
        EXERCISE_ID,
      );
    });
  });

  describe('deleteSet', () => {
    it('delegates to service with sessionId, memberId, exerciseId, setNumber', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;
      const EXERCISE_ID = new Types.ObjectId().toString();

      await controller.deleteSet(req, SESSION_ID, {
        exerciseId: EXERCISE_ID,
        setNumber: 4,
      });

      expect(service.deleteSet).toHaveBeenCalledWith(
        SESSION_ID,
        MEMBER_ID,
        EXERCISE_ID,
        4,
      );
    });
  });

  describe('finishMemberSession (with rpe)', () => {
    it('passes rpe from body to service', async () => {
      const req = { user: trainerUser } as RequestWithUser & Request;

      await controller.finishMemberSession(req, MEMBER_ID, SESSION_ID, {
        rpe: 7,
      });

      expect(service.finishMemberSession).toHaveBeenCalledWith(
        SESSION_ID,
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
        7,
      );
    });
  });

  describe('addMemberSet', () => {
    it('delegates to service with all scoped params', async () => {
      const req = { user: trainerUser } as RequestWithUser & Request;
      const EXERCISE_ID = new Types.ObjectId().toString();

      await controller.addMemberSet(req, MEMBER_ID, SESSION_ID, {
        exerciseId: EXERCISE_ID,
      });

      expect(service.addMemberSet).toHaveBeenCalledWith(
        SESSION_ID,
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
        EXERCISE_ID,
      );
    });
  });

  describe('deleteMemberSet', () => {
    it('delegates to service with all scoped params', async () => {
      const req = { user: trainerUser } as RequestWithUser & Request;
      const EXERCISE_ID = new Types.ObjectId().toString();

      await controller.deleteMemberSet(req, MEMBER_ID, SESSION_ID, {
        exerciseId: EXERCISE_ID,
        setNumber: 4,
      });

      expect(service.deleteMemberSet).toHaveBeenCalledWith(
        SESSION_ID,
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
        EXERCISE_ID,
        4,
      );
    });
  });
});
