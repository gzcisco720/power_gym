import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const OWNER_ID = 'owner-id-123';
const TRAINER_ID = 'trainer-id-456';
const MEMBER_ID = 'member-id-789';

const FROM = '2026-05-01T00:00:00.000Z';
const TO = '2026-05-31T23:59:59.999Z';

describe('BillingController', () => {
  let controller: BillingController;
  let service: { getMyBilling: jest.Mock; getSummary: jest.Mock };

  beforeEach(async () => {
    service = {
      getMyBilling: jest
        .fn()
        .mockResolvedValue({ lines: [], total: 0, count: 0, currency: 'AUD' }),
      getSummary: jest
        .fn()
        .mockResolvedValue({ members: [], grandTotal: 0, currency: 'AUD' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [{ provide: BillingService, useValue: service }, Reflector],
    }).compile();

    controller = module.get<BillingController>(BillingController);
  });

  describe('@Roles metadata', () => {
    it('GET summary handler has owner and trainer roles', () => {
      const reflector = new Reflector();
      const roles = reflector.get<string[]>(ROLES_KEY, controller.getSummary);
      expect(roles).toContain('owner');
      expect(roles).toContain('trainer');
    });

    it('GET my handler has member role', () => {
      const reflector = new Reflector();
      const roles = reflector.get<string[]>(ROLES_KEY, controller.getMy);
      expect(roles).toContain('member');
    });
  });

  describe('getSummary', () => {
    it('delegates to service.getSummary with role, sub, from, to', async () => {
      const req = {
        user: {
          sub: OWNER_ID,
          role: 'owner' as const,
          firstName: 'Test',
          lastName: 'Owner',
          trainerId: null,
        },
      } as RequestWithUser & Request;

      await controller.getSummary(req, { from: FROM, to: TO });

      expect(service.getSummary).toHaveBeenCalledWith(
        'owner',
        OWNER_ID,
        FROM,
        TO,
      );
    });

    it('delegates with trainer role and trainer sub', async () => {
      const req = {
        user: {
          sub: TRAINER_ID,
          role: 'trainer' as const,
          firstName: 'Test',
          lastName: 'Trainer',
          trainerId: null,
        },
      } as RequestWithUser & Request;

      await controller.getSummary(req, { from: FROM, to: TO });

      expect(service.getSummary).toHaveBeenCalledWith(
        'trainer',
        TRAINER_ID,
        FROM,
        TO,
      );
    });
  });

  describe('getMy', () => {
    it('delegates to service.getMyBilling with member sub, from, to', async () => {
      const req = {
        user: {
          sub: MEMBER_ID,
          role: 'member' as const,
          firstName: 'Test',
          lastName: 'Member',
          trainerId: TRAINER_ID,
        },
      } as RequestWithUser & Request;

      await controller.getMy(req, { from: FROM, to: TO });

      expect(service.getMyBilling).toHaveBeenCalledWith(MEMBER_ID, FROM, TO);
    });
  });
});
