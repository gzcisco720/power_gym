import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

const REQUESTER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();
const MEMBER_ID = new Types.ObjectId().toString();

function makeReq(role = 'owner', trainerId: string | null = null) {
  return {
    user: { sub: REQUESTER_ID, role, trainerId },
  };
}

describe('MembersController', () => {
  let controller: MembersController;
  let service: {
    listMembers: jest.Mock;
    getOverview: jest.Mock;
    getOverviewStats: jest.Mock;
    getBodyTests: jest.Mock;
    getInjuries: jest.Mock;
    getMedications: jest.Mock;
    assignTrainer: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      listMembers: jest.fn().mockResolvedValue([]),
      getOverview: jest.fn().mockResolvedValue({}),
      getOverviewStats: jest.fn().mockResolvedValue({}),
      getBodyTests: jest.fn().mockResolvedValue([]),
      getInjuries: jest.fn().mockResolvedValue([]),
      getMedications: jest.fn().mockResolvedValue([]),
      assignTrainer: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembersController],
      providers: [{ provide: MembersService, useValue: service }],
    }).compile();

    controller = module.get<MembersController>(MembersController);
  });

  describe('every endpoint delegates to the service with req.user.sub, req.user.role, and req.user.trainerId', () => {
    it('listMembers passes sub and role', async () => {
      const req = makeReq('trainer', TRAINER_ID);
      await controller.listMembers(req as never);

      expect(service.listMembers).toHaveBeenCalledWith(REQUESTER_ID, 'trainer');
    });

    it('getOverview passes sub, role, and member id param', async () => {
      const req = makeReq('owner');
      await controller.getOverview(req as never, MEMBER_ID);

      expect(service.getOverview).toHaveBeenCalledWith(
        MEMBER_ID,
        REQUESTER_ID,
        'owner',
      );
    });

    it('getBodyTests passes sub, role, and member id param', async () => {
      const req = makeReq('trainer', TRAINER_ID);
      await controller.getBodyTests(req as never, MEMBER_ID);

      expect(service.getBodyTests).toHaveBeenCalledWith(
        MEMBER_ID,
        REQUESTER_ID,
        'trainer',
      );
    });

    it('getInjuries passes sub, role, and member id param', async () => {
      const req = makeReq('owner');
      await controller.getInjuries(req as never, MEMBER_ID);

      expect(service.getInjuries).toHaveBeenCalledWith(
        MEMBER_ID,
        REQUESTER_ID,
        'owner',
      );
    });

    it('getMedications passes sub, role, and member id param', async () => {
      const req = makeReq('owner');
      await controller.getMedications(req as never, MEMBER_ID);

      expect(service.getMedications).toHaveBeenCalledWith(
        MEMBER_ID,
        REQUESTER_ID,
        'owner',
      );
    });

    it('getOverviewStats passes sub, role, and member id param', async () => {
      const req = makeReq('owner');
      await controller.getOverviewStats(req as never, MEMBER_ID);

      expect(service.getOverviewStats).toHaveBeenCalledWith(
        MEMBER_ID,
        REQUESTER_ID,
        'owner',
      );
    });

    it('assignTrainer passes member id and trainerId from body to the service', async () => {
      await controller.assignTrainer(MEMBER_ID, {
        trainerId: TRAINER_ID,
      });

      expect(service.assignTrainer).toHaveBeenCalledWith(MEMBER_ID, TRAINER_ID);
    });

    it('assignTrainer passes null trainerId when unassigning', async () => {
      await controller.assignTrainer(MEMBER_ID, { trainerId: null });

      expect(service.assignTrainer).toHaveBeenCalledWith(MEMBER_ID, null);
    });
  });
});
