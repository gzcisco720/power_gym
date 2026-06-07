import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NutritionService } from './nutrition.service';
import { MemberNutritionPlan } from '../../common/models/member-nutrition-plan.model';
import { NutritionDailyLog } from '../../common/models/nutrition-daily-log.model';
import { NutritionTemplate } from '../nutrition-templates/nutrition-template.model';
import { User } from '../../common/models/user.model';
import { SelfNutritionLog } from '../../common/models/self-nutrition-log.model';

const OWNER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();
const OTHER_TRAINER_ID = new Types.ObjectId().toString();
const MEMBER_ID = new Types.ObjectId().toString();
const TEMPLATE_ID = new Types.ObjectId().toString();
const PLAN_ID = new Types.ObjectId().toString();
const LOG_ID = new Types.ObjectId().toString();

// Helper: get today's date string YYYY-MM-DD
function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Weekday for today (0=Sun, 1=Mon, ..., 6=Sat)
const todayDow = new Date().getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

const sampleMealItem = {
  foodName: 'Chicken Breast',
  quantityG: 100,
  kcal: 165,
  protein: 31,
  carbs: 0,
  fat: 3.6,
};

const sampleDayType = {
  name: 'High Carb',
  meals: [
    {
      name: 'Breakfast',
      order: 1,
      items: [sampleMealItem],
    },
  ],
};

const sampleActivePlan = {
  _id: new Types.ObjectId(PLAN_ID),
  memberId: new Types.ObjectId(MEMBER_ID),
  assignedById: new Types.ObjectId(OWNER_ID),
  templateId: new Types.ObjectId(TEMPLATE_ID),
  name: 'High Carb Plan',
  isActive: true,
  assignedAt: new Date(),
  dayTypes: [sampleDayType],
  schedule: {
    weeklyPattern: [{ dayOfWeek: todayDow, dayTypeName: 'High Carb' }],
    calendarOverrides: [],
    iterate: true,
  },
};

const sampleActivePlanNoPattern = {
  ...sampleActivePlan,
  schedule: {
    weeklyPattern: [],
    calendarOverrides: [],
    iterate: true,
  },
};

const sampleTemplate = {
  _id: new Types.ObjectId(TEMPLATE_ID),
  name: 'High Carb Template',
  createdBy: new Types.ObjectId(OWNER_ID),
  dayTypes: [sampleDayType],
};

const sampleMember = {
  _id: new Types.ObjectId(MEMBER_ID),
  role: 'member' as const,
  trainerId: new Types.ObjectId(TRAINER_ID),
};

const sampleLog = {
  _id: new Types.ObjectId(LOG_ID),
  memberId: new Types.ObjectId(MEMBER_ID),
  planId: new Types.ObjectId(PLAN_ID),
  date: todayStr(),
  dayTypeName: 'High Carb',
  meals: [{ name: 'Breakfast', order: 1, items: [] }],
  save: jest.fn().mockResolvedValue(undefined),
};

describe('NutritionService', () => {
  let service: NutritionService;
  let memberNutritionPlanModel: {
    findOne: jest.Mock;
    updateMany: jest.Mock;
    create: jest.Mock;
  };
  let nutritionDailyLogModel: {
    findOne: jest.Mock;
    create: jest.Mock;
    find: jest.Mock;
  };
  let nutritionTemplateModel: {
    findById: jest.Mock;
  };
  let userModel: {
    findById: jest.Mock;
  };
  let selfNutritionLogModel: {
    findOne: jest.Mock;
    findOneAndUpdate: jest.Mock;
  };

  beforeEach(async () => {
    memberNutritionPlanModel = {
      findOne: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      create: jest.fn(),
    };

    nutritionDailyLogModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };

    nutritionTemplateModel = {
      findById: jest.fn(),
    };

    userModel = {
      findById: jest.fn(),
    };

    selfNutritionLogModel = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NutritionService,
        {
          provide: getModelToken(MemberNutritionPlan.name),
          useValue: memberNutritionPlanModel,
        },
        {
          provide: getModelToken(NutritionDailyLog.name),
          useValue: nutritionDailyLogModel,
        },
        {
          provide: getModelToken(NutritionTemplate.name),
          useValue: nutritionTemplateModel,
        },
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: getModelToken(SelfNutritionLog.name),
          useValue: selfNutritionLogModel,
        },
      ],
    }).compile();

    service = module.get<NutritionService>(NutritionService);
  });

  // ─── getMyPlan ────────────────────────────────────────────────────────────────

  describe('getMyPlan', () => {
    it("returns the active MemberNutritionPlan with todayDayTypeName resolved from weeklyPattern when today's weekday matches an entry", async () => {
      memberNutritionPlanModel.findOne.mockResolvedValue(sampleActivePlan);

      const result = await service.getMyPlan(MEMBER_ID);

      expect(result).not.toBeNull();
      expect(result?.todayDayTypeName).toBe('High Carb');
      expect(result?.dayTypes).toHaveLength(1);
    });

    it('falls back to dayTypes[0].name as todayDayTypeName when schedule has no matching override or pattern entry', async () => {
      memberNutritionPlanModel.findOne.mockResolvedValue(
        sampleActivePlanNoPattern,
      );

      const result = await service.getMyPlan(MEMBER_ID);

      expect(result).not.toBeNull();
      expect(result?.todayDayTypeName).toBe('High Carb');
    });

    it('returns null when the member has no active plan', async () => {
      memberNutritionPlanModel.findOne.mockResolvedValue(null);

      const result = await service.getMyPlan(MEMBER_ID);

      expect(result).toBeNull();
    });
  });

  // ─── getToday ─────────────────────────────────────────────────────────────────

  describe('getToday', () => {
    it('lazily creates a NutritionDailyLog with resolved dayTypeName and empty meal slots mirroring the prescribed meals when none exists for today', async () => {
      memberNutritionPlanModel.findOne.mockResolvedValue(sampleActivePlan);
      nutritionDailyLogModel.findOne.mockResolvedValue(null);
      nutritionDailyLogModel.create.mockResolvedValue({
        ...sampleLog,
        meals: [{ name: 'Breakfast', order: 1, items: [] }],
      });

      const result = await service.getToday(MEMBER_ID);

      expect(nutritionDailyLogModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          memberId: new Types.ObjectId(MEMBER_ID),
          planId: new Types.ObjectId(PLAN_ID),
          dayTypeName: 'High Carb',
          date: todayStr(),
          meals: [{ name: 'Breakfast', order: 1, items: [] }],
        }),
      );
      expect(result).toBeDefined();
    });

    it('returns the existing log unchanged when one already exists for today', async () => {
      memberNutritionPlanModel.findOne.mockResolvedValue(sampleActivePlan);
      nutritionDailyLogModel.findOne.mockResolvedValue(sampleLog);

      const result = await service.getToday(MEMBER_ID);

      expect(nutritionDailyLogModel.create).not.toHaveBeenCalled();
      expect(result).toEqual(sampleLog);
    });
  });

  // ─── logFood ──────────────────────────────────────────────────────────────────

  describe('logFood', () => {
    it('appends the item to the matching meal and returns the updated log', async () => {
      const logDoc = {
        ...sampleLog,
        meals: [{ name: 'Breakfast', order: 1, items: [] }],
        save: jest.fn().mockResolvedValue(undefined),
      };
      memberNutritionPlanModel.findOne.mockResolvedValue(sampleActivePlan);
      nutritionDailyLogModel.findOne.mockResolvedValue(logDoc);

      const result = await service.logFood(MEMBER_ID, {
        mealName: 'Breakfast',
        foodName: 'Chicken',
        quantityG: 150,
        kcal: 247,
        protein: 46,
        carbs: 0,
        fat: 5,
      });

      expect(logDoc.meals[0].items).toHaveLength(1);
      expect(logDoc.meals[0].items[0].foodName).toBe('Chicken');
      expect(logDoc.save).toHaveBeenCalled();
      expect(result).toEqual(logDoc);
    });

    it("throws NotFoundException when the named meal does not exist in today's log", async () => {
      const logDoc = {
        ...sampleLog,
        meals: [{ name: 'Breakfast', order: 1, items: [] }],
        save: jest.fn(),
      };
      memberNutritionPlanModel.findOne.mockResolvedValue(sampleActivePlan);
      nutritionDailyLogModel.findOne.mockResolvedValue(logDoc);

      await expect(
        service.logFood(MEMBER_ID, {
          mealName: 'Dinner', // does not exist
          foodName: 'Chicken',
          quantityG: 100,
          kcal: 165,
          protein: 31,
          carbs: 0,
          fat: 3.6,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getSummary ───────────────────────────────────────────────────────────────

  describe('getSummary', () => {
    it('returns logged totals summed from log items and target totals summed from the resolved day type', async () => {
      const logWithItems = {
        ...sampleLog,
        dayTypeName: 'High Carb',
        meals: [
          {
            name: 'Breakfast',
            order: 1,
            items: [{ kcal: 165, protein: 31, carbs: 0, fat: 3.6 }],
          },
        ],
      };
      memberNutritionPlanModel.findOne.mockResolvedValue(sampleActivePlan);
      nutritionDailyLogModel.findOne.mockResolvedValue(logWithItems);

      const result = await service.getSummary(MEMBER_ID);

      expect(result.logged.kcal).toBe(165);
      expect(result.logged.protein).toBe(31);
      expect(result.logged.carbs).toBe(0);
      expect(result.logged.fat).toBeCloseTo(3.6);

      // Target from sampleDayType → sampleMealItem
      expect(result.target.kcal).toBe(165);
      expect(result.target.protein).toBe(31);
      expect(result.target.carbs).toBe(0);
      expect(result.target.fat).toBeCloseTo(3.6);
    });
  });

  // ─── assignNutritionPlan ──────────────────────────────────────────────────────

  describe('assignNutritionPlan', () => {
    it('deactivates prior active plans and creates a new one copying template dayTypes', async () => {
      nutritionTemplateModel.findById.mockResolvedValue(sampleTemplate);
      userModel.findById.mockResolvedValue(sampleMember);
      memberNutritionPlanModel.updateMany.mockResolvedValue({
        modifiedCount: 1,
      });
      const newPlan = {
        ...sampleActivePlan,
        _id: new Types.ObjectId(),
        isActive: true,
      };
      memberNutritionPlanModel.create.mockResolvedValue(newPlan);

      const result = await service.assignNutritionPlan(
        MEMBER_ID,
        TEMPLATE_ID,
        OWNER_ID,
        'owner',
      );

      expect(memberNutritionPlanModel.updateMany).toHaveBeenCalledWith(
        { memberId: new Types.ObjectId(MEMBER_ID), isActive: true },
        { $set: { isActive: false } },
      );
      expect(memberNutritionPlanModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: sampleTemplate.name,
          dayTypes: sampleTemplate.dayTypes,
          isActive: true,
        }),
      );
      expect(result).toEqual(newPlan);
    });

    it('throws NotFoundException when the template is not owned by the caller', async () => {
      nutritionTemplateModel.findById.mockResolvedValue(sampleTemplate);
      // caller is TRAINER_ID but template.createdBy is OWNER_ID
      userModel.findById.mockResolvedValue(sampleMember);

      await expect(
        service.assignNutritionPlan(
          MEMBER_ID,
          TEMPLATE_ID,
          TRAINER_ID,
          'trainer',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when a trainer targets a member not assigned to them', async () => {
      const trainerOwnedTemplate = {
        ...sampleTemplate,
        createdBy: new Types.ObjectId(TRAINER_ID),
      };
      nutritionTemplateModel.findById.mockResolvedValue(trainerOwnedTemplate);
      // Member belongs to OTHER_TRAINER_ID
      userModel.findById.mockResolvedValue({
        ...sampleMember,
        trainerId: new Types.ObjectId(OTHER_TRAINER_ID),
      });

      await expect(
        service.assignNutritionPlan(
          MEMBER_ID,
          TEMPLATE_ID,
          TRAINER_ID,
          'trainer',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getMemberPlan ────────────────────────────────────────────────────────────

  describe('getMemberPlan', () => {
    it('returns the member active plan with dayTypes for an owned member', async () => {
      userModel.findById.mockResolvedValue(sampleMember);
      memberNutritionPlanModel.findOne.mockResolvedValue(sampleActivePlan);

      const result = await service.getMemberPlan(
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
      );

      expect(result).not.toBeNull();
      expect(result!.dayTypes).toHaveLength(1);
      expect(result!.dayTypes[0].name).toBe('High Carb');
      expect(memberNutritionPlanModel.findOne).toHaveBeenCalledWith({
        memberId: new Types.ObjectId(MEMBER_ID),
        isActive: true,
      });
    });

    it('returns null when the member has no active plan', async () => {
      userModel.findById.mockResolvedValue(sampleMember);
      memberNutritionPlanModel.findOne.mockResolvedValue(null);

      const result = await service.getMemberPlan(
        MEMBER_ID,
        TRAINER_ID,
        'trainer',
      );

      expect(result).toBeNull();
    });

    it('throws NotFoundException when member is outside trainer scope', async () => {
      userModel.findById.mockResolvedValue({
        ...sampleMember,
        trainerId: new Types.ObjectId(OTHER_TRAINER_ID),
      });

      await expect(
        service.getMemberPlan(MEMBER_ID, TRAINER_ID, 'trainer'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getHistory ───────────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it("returns the member's daily logs sorted by date descending", async () => {
      userModel.findById.mockResolvedValue(sampleMember);

      const logs = [sampleLog];
      const mockQuery = {
        sort: jest.fn().mockResolvedValue(logs),
      };
      nutritionDailyLogModel.find.mockReturnValue(mockQuery);

      const result = await service.getHistory(MEMBER_ID, OWNER_ID, 'owner');

      expect(nutritionDailyLogModel.find).toHaveBeenCalledWith({
        memberId: new Types.ObjectId(MEMBER_ID),
      });
      expect(mockQuery.sort).toHaveBeenCalledWith({ date: -1 });
      expect(result).toEqual(logs);
    });
  });

  // ─── getSelfToday ─────────────────────────────────────────────────────────────

  describe('getSelfToday', () => {
    it('returns an empty items array and zeroed totals when no self log exists for today', async () => {
      selfNutritionLogModel.findOne.mockResolvedValue(null);

      const result = await service.getSelfToday(MEMBER_ID);

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items).toHaveLength(0);
      expect(result.totals).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it('returns the existing self log for today when one exists', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const existing = {
        userId: new Types.ObjectId(MEMBER_ID),
        date: todayStr,
        items: [
          {
            foodName: 'Apple',
            quantityG: 200,
            kcal: 104,
            protein: 0.5,
            carbs: 28,
            fat: 0.3,
          },
        ],
      };
      selfNutritionLogModel.findOne.mockResolvedValue(existing);

      const result = await service.getSelfToday(MEMBER_ID);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].foodName).toBe('Apple');
      expect(result.totals.kcal).toBe(104);
      expect(result.totals.protein).toBeCloseTo(0.5);
    });
  });

  // ─── logSelfFood ──────────────────────────────────────────────────────────────

  describe('logSelfFood', () => {
    it("creates today's self log and appends the item when none exists", async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const item = {
        foodName: 'Banana',
        quantityG: 120,
        kcal: 107,
        protein: 1.3,
        carbs: 27,
        fat: 0.4,
      };
      const upserted = {
        userId: new Types.ObjectId(MEMBER_ID),
        date: todayStr,
        items: [item],
      };
      selfNutritionLogModel.findOneAndUpdate.mockResolvedValue(upserted);

      const result = await service.logSelfFood(MEMBER_ID, item);

      expect(selfNutritionLogModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ date: todayStr }),
        expect.objectContaining({ $push: { items: item } }),
        expect.objectContaining({ upsert: true, returnDocument: 'after' }),
      );
      expect(result.items).toHaveLength(1);
      expect(result.items[0].foodName).toBe('Banana');
    });

    it('appends to existing self log and recomputes macro totals in the response', async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const existingItem = {
        foodName: 'Apple',
        quantityG: 200,
        kcal: 104,
        protein: 0.5,
        carbs: 28,
        fat: 0.3,
      };
      const newItem = {
        foodName: 'Banana',
        quantityG: 120,
        kcal: 107,
        protein: 1.3,
        carbs: 27,
        fat: 0.4,
      };
      const upserted = {
        userId: new Types.ObjectId(MEMBER_ID),
        date: todayStr,
        items: [existingItem, newItem],
      };
      selfNutritionLogModel.findOneAndUpdate.mockResolvedValue(upserted);

      const result = await service.logSelfFood(MEMBER_ID, newItem);

      expect(result.items).toHaveLength(2);
      expect(result.totals.kcal).toBeCloseTo(211);
    });
  });
});
