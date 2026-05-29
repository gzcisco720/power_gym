import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { BodyTestsService } from './body-tests.service';
import type { AuthUser } from '../common/interfaces/auth-user.interface';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const owner: AuthUser = {
  userId: 'owner1',
  email: 'owner@x.com',
  role: 'owner',
};
const trainer: AuthUser = {
  userId: 'trainer1',
  email: 'trainer@x.com',
  role: 'trainer',
};

function makeBodyTest(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'bt1' },
    memberId: 'member1',
    trainerId: 'trainer1',
    date: new Date('2026-01-15'),
    age: 30,
    sex: 'male',
    weight: 80,
    protocol: '3site',
    tricep: null,
    chest: 15,
    subscapular: null,
    abdominal: 20,
    suprailiac: null,
    thigh: 18,
    midaxillary: null,
    bicep: null,
    lumbar: null,
    bodyFatPct: 12.5,
    fatMassKg: 10,
    leanMassKg: 70,
    targetWeight: null,
    targetBodyFatPct: null,
    ...overrides,
  };
}

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'member1' },
    role: 'member',
    trainerId: { toString: () => 'trainer1' },
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BodyTestsService', () => {
  let bodyTestRepo: {
    create: jest.Mock;
    findByMember: jest.Mock;
    deleteById: jest.Mock;
    deleteByIdAndTrainer: jest.Mock;
  };
  let userRepo: { findById: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    bodyTestRepo = {
      create: jest.fn().mockResolvedValue(makeBodyTest()),
      findByMember: jest.fn().mockResolvedValue([]),
      deleteById: jest.fn().mockResolvedValue(true),
      deleteByIdAndTrainer: jest.fn().mockResolvedValue(true),
    };
    userRepo = {
      findById: jest.fn().mockResolvedValue(makeMember()),
    };
  });

  function makeService() {
    return new BodyTestsService(bodyTestRepo as never, userRepo as never);
  }

  const baseDto = {
    date: '2026-01-15',
    weight: 80,
    protocol: '3site' as const,
    sex: 'male' as const,
    age: 30,
    chest: 15,
    abdominal: 20,
    thigh: 18,
  };

  describe('createBodyTest', () => {
    it('applies the Jackson-Pollock 3-site male formula', async () => {
      const service = makeService();
      await service.createBodyTest(owner, 'member1', baseDto);

      const sum = 15 + 20 + 18; // 53
      const density =
        1.10938 - 0.0008267 * sum + 0.0000016 * sum * sum - 0.0002574 * 30;
      const expected = 495 / density - 450;

      const [firstCall] = bodyTestRepo.create.mock.calls as [
        Record<string, unknown>[],
      ];
      const call = firstCall[0];
      expect(call.bodyFatPct as number).toBeCloseTo(expected, 2);
    });

    it('applies the Parrillo 9-site formula', async () => {
      const service = makeService();
      const dto = {
        date: '2026-01-15',
        weight: 80,
        protocol: '9site' as const,
        sex: 'male' as const,
        age: 30,
        // 9 sites summing to 100
        tricep: 12,
        chest: 11,
        subscapular: 11,
        abdominal: 12,
        suprailiac: 11,
        thigh: 11,
        midaxillary: 11,
        bicep: 10,
        lumbar: 11,
      };
      await service.createBodyTest(owner, 'member1', dto);

      const sum = 12 + 11 + 11 + 12 + 11 + 11 + 11 + 10 + 11; // 100
      const expected = sum * 0.1051 + 2.585;

      const [firstCall] = bodyTestRepo.create.mock.calls as [
        Record<string, unknown>[],
      ];
      const call = firstCall[0];
      expect(call.bodyFatPct as number).toBeCloseTo(expected, 4);
    });

    it("passes through bodyFatPct directly for protocol 'other'", async () => {
      const service = makeService();
      const dto = {
        date: '2026-01-15',
        weight: 80,
        protocol: 'other' as const,
        bodyFatPct: 18.5,
      };
      await service.createBodyTest(owner, 'member1', dto);

      const [firstCall] = bodyTestRepo.create.mock.calls as [
        Record<string, unknown>[],
      ];
      const call = firstCall[0];
      expect(call.bodyFatPct).toBe(18.5);
    });

    it('computes fatMassKg and leanMassKg from weight and bodyFatPct', async () => {
      const service = makeService();
      const dto = {
        date: '2026-01-15',
        weight: 80,
        protocol: 'other' as const,
        bodyFatPct: 20,
      };
      await service.createBodyTest(owner, 'member1', dto);

      const [firstCall] = bodyTestRepo.create.mock.calls as [
        Record<string, unknown>[],
      ];
      const call = firstCall[0];
      expect(call.fatMassKg).toBe(16);
      expect(call.leanMassKg).toBe(64);
    });

    it('throws NotFoundException when a trainer creates a test for a member they do not own', async () => {
      userRepo.findById.mockResolvedValue(
        makeMember({ trainerId: { toString: () => 'other-trainer' } }),
      );
      const service = makeService();
      await expect(
        service.createBodyTest(trainer, 'member1', baseDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteBodyTest', () => {
    it('uses deleteById for owner and deleteByIdAndTrainer for trainer', async () => {
      const service = makeService();

      await service.deleteBodyTest(owner, 'member1', 'bt1');
      expect(bodyTestRepo.deleteById).toHaveBeenCalledWith('bt1');
      expect(bodyTestRepo.deleteByIdAndTrainer).not.toHaveBeenCalled();

      jest.clearAllMocks();
      bodyTestRepo.deleteByIdAndTrainer.mockResolvedValue(true);

      await service.deleteBodyTest(trainer, 'member1', 'bt1');
      expect(bodyTestRepo.deleteByIdAndTrainer).toHaveBeenCalledWith(
        'bt1',
        'trainer1',
      );
      expect(bodyTestRepo.deleteById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when nothing was deleted', async () => {
      bodyTestRepo.deleteById.mockResolvedValue(false);
      const service = makeService();
      await expect(
        service.deleteBodyTest(owner, 'member1', 'bt1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('exportMeBodyTestsCsv', () => {
    it('emits the header row and one row per test with fixed-decimal values', async () => {
      const testDoc = {
        ...makeBodyTest(),
        date: new Date('2026-01-15'),
        weight: 80,
        bodyFatPct: 12.5,
        fatMassKg: 10,
        leanMassKg: 70,
        protocol: '3site',
      };
      bodyTestRepo.findByMember.mockResolvedValue([testDoc]);
      const service = makeService();

      const csv = await service.exportMeBodyTestsCsv(owner);
      const rows = csv.split('\n');

      expect(rows[0]).toBe(
        'Date,Weight (kg),Body Fat (%),Fat Mass (kg),Lean Mass (kg),Protocol',
      );
      expect(rows).toHaveLength(2);
      expect(rows[1]).toContain('"2026-01-15"');
      expect(rows[1]).toContain('"80.0"');
      expect(rows[1]).toContain('"12.5"');
      expect(rows[1]).toContain('"10.0"');
      expect(rows[1]).toContain('"70.0"');
      expect(rows[1]).toContain('"3site"');
    });
  });
});
