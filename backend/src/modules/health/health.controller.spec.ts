import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { Types } from 'mongoose';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const MEMBER_ID = new Types.ObjectId().toString();
const INJURY_ID = new Types.ObjectId().toString();

describe('HealthController', () => {
  let controller: HealthController;
  let service: {
    findInjuries: jest.Mock;
    createInjury: jest.Mock;
    updateInjury: jest.Mock;
    deleteInjury: jest.Mock;
    findMedications: jest.Mock;
    createMedication: jest.Mock;
    updateMedication: jest.Mock;
    deleteMedication: jest.Mock;
    getMedicalHistory: jest.Mock;
    saveMedicalHistory: jest.Mock;
  };

  const memberReq = {
    user: {
      sub: MEMBER_ID,
      role: 'member' as const,
      firstName: 'Test',
      lastName: 'User',
      trainerId: null,
    },
  } as RequestWithUser & Request;

  beforeEach(async () => {
    service = {
      findInjuries: jest.fn().mockResolvedValue([]),
      createInjury: jest.fn().mockResolvedValue({ _id: INJURY_ID }),
      updateInjury: jest.fn().mockResolvedValue({ _id: INJURY_ID }),
      deleteInjury: jest.fn().mockResolvedValue(undefined),
      findMedications: jest.fn().mockResolvedValue([]),
      createMedication: jest.fn().mockResolvedValue({ _id: 'med-id' }),
      updateMedication: jest.fn().mockResolvedValue({ _id: 'med-id' }),
      deleteMedication: jest.fn().mockResolvedValue(undefined),
      getMedicalHistory: jest.fn().mockResolvedValue({ chronicConditions: [] }),
      saveMedicalHistory: jest
        .fn()
        .mockResolvedValue({ chronicConditions: [] }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: service }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('deleteInjury', () => {
    it('delegates to service with req.user.sub and the route id', async () => {
      await controller.deleteInjury(memberReq, INJURY_ID);

      expect(service.deleteInjury).toHaveBeenCalledWith(INJURY_ID, MEMBER_ID);
    });
  });
});
