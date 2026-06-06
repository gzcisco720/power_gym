import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { NutritionController } from './nutrition.controller';
import { NutritionService } from './nutrition.service';
import { JwtUser } from '../auth/strategies/jwt.strategy';

interface RequestWithUser {
  user: JwtUser;
}

const OWNER_ID = new Types.ObjectId().toString();
const TRAINER_ID = new Types.ObjectId().toString();
const MEMBER_ID = new Types.ObjectId().toString();
const TEMPLATE_ID = new Types.ObjectId().toString();

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

const samplePlan = {
  _id: 'plan-id',
  name: 'High Carb Plan',
  todayDayTypeName: 'High Carb',
  dayTypes: [],
};
const sampleLog = { _id: 'log-id', meals: [] };
const sampleSummary = {
  logged: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  target: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
};
const sampleSelfLog = {
  date: new Date().toISOString().slice(0, 10),
  items: [],
  totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
};

describe('NutritionController', () => {
  let controller: NutritionController;
  let service: {
    getMyPlan: jest.Mock;
    getToday: jest.Mock;
    logFood: jest.Mock;
    getSummary: jest.Mock;
    assignNutritionPlan: jest.Mock;
    getHistory: jest.Mock;
    getSelfToday: jest.Mock;
    logSelfFood: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getMyPlan: jest.fn().mockResolvedValue(samplePlan),
      getToday: jest.fn().mockResolvedValue(sampleLog),
      logFood: jest.fn().mockResolvedValue(sampleLog),
      getSummary: jest.fn().mockResolvedValue(sampleSummary),
      assignNutritionPlan: jest.fn().mockResolvedValue(samplePlan),
      getHistory: jest.fn().mockResolvedValue([]),
      getSelfToday: jest.fn().mockResolvedValue(sampleSelfLog),
      logSelfFood: jest.fn().mockResolvedValue(sampleSelfLog),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NutritionController],
      providers: [{ provide: NutritionService, useValue: service }],
    }).compile();

    controller = module.get<NutritionController>(NutritionController);
  });

  describe('getMyPlan', () => {
    it('delegates to service with the member id; sends null when result is null', async () => {
      service.getMyPlan.mockResolvedValue(null);
      const req = { user: memberUser } as RequestWithUser & Request;
      const mockRes = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.getMyPlan(req, mockRes as never);

      expect(service.getMyPlan).toHaveBeenCalledWith(MEMBER_ID);
      expect(mockRes.send).toHaveBeenCalledWith('null');
    });

    it('returns the plan when one exists', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;
      const mockRes = { setHeader: jest.fn(), send: jest.fn() };

      const result = await controller.getMyPlan(req, mockRes as never);

      expect(result).toEqual(samplePlan);
    });
  });

  describe('getToday', () => {
    it('delegates to service with member id', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;

      await controller.getToday(req);

      expect(service.getToday).toHaveBeenCalledWith(MEMBER_ID);
    });
  });

  describe('logFood', () => {
    it('delegates to service with member id and dto', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;
      const dto = {
        mealName: 'Breakfast',
        foodName: 'Chicken',
        quantityG: 100,
        kcal: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      };

      await controller.logFood(req, dto);

      expect(service.logFood).toHaveBeenCalledWith(MEMBER_ID, dto);
    });
  });

  describe('getSummary', () => {
    it('delegates to service with member id', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;

      await controller.getSummary(req);

      expect(service.getSummary).toHaveBeenCalledWith(MEMBER_ID);
    });
  });

  describe('assignNutritionPlan', () => {
    it('owner delegates with memberId, templateId, caller role and id', async () => {
      const req = { user: ownerUser } as RequestWithUser & Request;
      const dto = { templateId: TEMPLATE_ID };

      await controller.assignNutritionPlan(req, MEMBER_ID, dto);

      expect(service.assignNutritionPlan).toHaveBeenCalledWith(
        MEMBER_ID,
        TEMPLATE_ID,
        OWNER_ID,
        'owner',
      );
    });

    it('trainer delegates with trainer id and role', async () => {
      const req = { user: trainerUser } as RequestWithUser & Request;
      const dto = { templateId: TEMPLATE_ID };

      await controller.assignNutritionPlan(req, MEMBER_ID, dto);

      expect(service.assignNutritionPlan).toHaveBeenCalledWith(
        MEMBER_ID,
        TEMPLATE_ID,
        TRAINER_ID,
        'trainer',
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

  describe('logSelfFood', () => {
    it('delegates to service with caller id and the food payload', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;
      const dto = {
        foodName: 'Apple',
        quantityG: 200,
        kcal: 104,
        protein: 0.5,
        carbs: 28,
        fat: 0.3,
      };

      await controller.logSelfFood(req, dto);

      expect(service.logSelfFood).toHaveBeenCalledWith(MEMBER_ID, dto);
    });
  });

  describe('getSelfToday', () => {
    it('delegates to service with member id', async () => {
      const req = { user: memberUser } as RequestWithUser & Request;

      await controller.getSelfToday(req);

      expect(service.getSelfToday).toHaveBeenCalledWith(MEMBER_ID);
    });
  });
});
