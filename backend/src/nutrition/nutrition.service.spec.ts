import 'reflect-metadata';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NutritionService } from './nutrition.service';
import type { AuthUser } from '../common/interfaces/auth-user.interface';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const trainer: AuthUser = {
  userId: 'trainer1',
  email: 'trainer@x.com',
  role: 'trainer',
};
const member: AuthUser = {
  userId: 'member1',
  email: 'member@x.com',
  role: 'member',
};

function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'member1' },
    role: 'member',
    trainerId: { toString: () => 'trainer1' },
    ...overrides,
  };
}

function makeFood(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => 'food1' },
    name: 'Rice',
    brand: null,
    createdBy: 'trainer1',
    ...overrides,
  };
}

function makeMealItem(
  overrides: Partial<{
    foodName: string;
    quantityG: number;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  }> = {},
) {
  return {
    foodName: 'Food',
    quantityG: 100,
    kcal: 100,
    protein: 10,
    carbs: 20,
    fat: 5,
    ...overrides,
  };
}

function makeSelfLog(items: ReturnType<typeof makeMealItem>[]) {
  return {
    _id: { toString: () => 'log1' },
    meals: [{ name: 'Meal', order: 0, completed: false, items }],
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NutritionService', () => {
  let foodRepo: {
    create: jest.Mock;
    findVisibleTo: jest.Mock;
  };
  let templateRepo: { findByCreator: jest.Mock; create: jest.Mock };
  let memberPlanRepo: {
    findActive: jest.Mock;
    deactivateAll: jest.Mock;
    create: jest.Mock;
  };
  let dailyLogRepo: { existsForDate: jest.Mock; findRecent: jest.Mock };
  let selfLogRepo: {
    existsForDate: jest.Mock;
    upsertByDate: jest.Mock;
    findByDate: jest.Mock;
  };
  let userRepo: { findById: jest.Mock };
  let fatSecretService: { search: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    foodRepo = {
      create: jest.fn().mockResolvedValue(makeFood()),
      findVisibleTo: jest.fn().mockResolvedValue([]),
    };
    templateRepo = {
      findByCreator: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({}),
    };
    memberPlanRepo = {
      findActive: jest.fn().mockResolvedValue(null),
      deactivateAll: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockResolvedValue({}),
    };
    dailyLogRepo = {
      existsForDate: jest.fn().mockResolvedValue(false),
      findRecent: jest.fn().mockResolvedValue([]),
    };
    selfLogRepo = {
      existsForDate: jest.fn().mockResolvedValue(false),
      upsertByDate: jest.fn().mockResolvedValue({}),
      findByDate: jest.fn().mockResolvedValue(null),
    };
    userRepo = {
      findById: jest.fn().mockResolvedValue(makeMember()),
    };
    fatSecretService = {
      search: jest.fn().mockResolvedValue([]),
    };
  });

  function makeService() {
    return new NutritionService(
      foodRepo as never,
      templateRepo as never,
      memberPlanRepo as never,
      dailyLogRepo as never,
      selfLogRepo as never,
      userRepo as never,
      fatSecretService as never,
    );
  }

  describe('createFood', () => {
    it('trims name and defaults brand to null when omitted', async () => {
      const service = makeService();
      await service.createFood(trainer, {
        name: '  Rice  ',
        macrosPer100g: { kcal: 350, protein: 7, carbs: 78, fat: 1 },
        servings: [],
      });

      const [firstCall] = foodRepo.create.mock.calls as [
        Record<string, unknown>[],
      ];
      const call = firstCall[0];
      expect(call.name).toBe('Rice');
      expect(call.brand).toBeNull();
    });
  });

  describe('listFoods', () => {
    it("resolves creatorId via member's trainerId for a member caller", async () => {
      userRepo.findById.mockResolvedValue(
        makeMember({ trainerId: { toString: () => 'trainer1' } }),
      );
      const service = makeService();
      await service.listFoods(member);

      expect(foodRepo.findVisibleTo).toHaveBeenCalledWith(
        'trainer1',
        undefined,
      );
    });

    it('returns [] when a member has no trainerId', async () => {
      userRepo.findById.mockResolvedValue(makeMember({ trainerId: undefined }));
      const service = makeService();
      const result = await service.listFoods(member);

      expect(result).toEqual([]);
      expect(foodRepo.findVisibleTo).not.toHaveBeenCalled();
    });
  });

  describe('searchFoods', () => {
    it('delegates to fatSecretService.search', async () => {
      const service = makeService();
      await service.searchFoods('chicken');

      expect(fatSecretService.search).toHaveBeenCalledWith('chicken');
    });
  });

  describe('getMemberPlan', () => {
    it("throws ForbiddenException when a member requests another member's plan", async () => {
      const service = makeService();
      await expect(
        service.getMemberPlan(member, 'other-member'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assignMemberPlan', () => {
    it('throws NotFoundException for a non-member target', async () => {
      userRepo.findById.mockResolvedValue(null);
      const service = makeService();
      await expect(
        service.assignMemberPlan(trainer, 'member1', {
          name: 'Plan A',
          dayTypes: [],
          schedule: {
            weeklyPattern: [],
            calendarOverrides: [],
            iterate: false,
          },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deactivates then creates with assignedById=caller.userId', async () => {
      const service = makeService();
      await service.assignMemberPlan(trainer, 'member1', {
        name: 'Plan A',
        dayTypes: [],
        schedule: { weeklyPattern: [], calendarOverrides: [], iterate: false },
      });

      expect(memberPlanRepo.deactivateAll).toHaveBeenCalledWith('member1');
      const [firstCall] = memberPlanRepo.create.mock.calls as [
        Record<string, unknown>[],
      ];
      const createCall = firstCall[0];
      expect(createCall.assignedById).toBe('trainer1');
    });
  });

  describe('logNutrition', () => {
    it('returns totals summed across all meal items', async () => {
      selfLogRepo.upsertByDate.mockResolvedValue({});
      const service = makeService();

      const dto = {
        date: '2026-01-15',
        dayLabel: 'Training Day',
        dayCompleted: false,
        meals: [
          {
            name: 'Meal',
            order: 0,
            completed: false,
            items: [
              makeMealItem({ kcal: 200, protein: 10, carbs: 20, fat: 5 }),
              makeMealItem({ kcal: 300, protein: 15, carbs: 30, fat: 8 }),
            ],
          },
        ],
      };

      const result = await service.logNutrition(member, dto);
      expect(result.totals.kcal).toBe(500);
      expect(result.totals.protein).toBe(25);
      expect(result.totals.carbs).toBe(50);
      expect(result.totals.fat).toBe(13);
    });
  });

  describe('getMemberNutritionRecent', () => {
    it('sets loggedToday=true when either plan log OR self log exists for today', async () => {
      dailyLogRepo.existsForDate.mockResolvedValue(false);
      selfLogRepo.existsForDate.mockResolvedValue(true);
      dailyLogRepo.findRecent.mockResolvedValue([]);
      const service = makeService();

      const result = await service.getMemberNutritionRecent(member, 'member1');
      expect(result.loggedToday).toBe(true);
    });

    it('de-duplicates recent items by foodName and caps the list at 20', async () => {
      dailyLogRepo.existsForDate.mockResolvedValue(false);
      selfLogRepo.existsForDate.mockResolvedValue(false);

      // 25 unique names + 5 duplicates of the first 5 = 30 total items
      // Result should be capped at 20 unique
      const uniqueItems = Array.from({ length: 25 }, (_, i) =>
        makeMealItem({ foodName: `Food${i}` }),
      );
      // Add 5 duplicates of first 5 names
      const duplicateItems = Array.from({ length: 5 }, (_, i) =>
        makeMealItem({ foodName: `Food${i}` }),
      );
      const allItems = [...uniqueItems, ...duplicateItems];

      dailyLogRepo.findRecent.mockResolvedValue([makeSelfLog(allItems)]);
      const service = makeService();

      const result = await service.getMemberNutritionRecent(member, 'member1');
      expect(result.recent.length).toBe(20);
    });
  });
});
