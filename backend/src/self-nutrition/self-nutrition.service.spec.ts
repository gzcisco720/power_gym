import 'reflect-metadata';
import { SelfNutritionService } from './self-nutrition.service';
import type { SelfNutritionLogRepository } from '../repositories/self-nutrition-log.repository';
import type { ISelfNutritionLog } from '../database/models/self-nutrition-log.model';
import { Types } from 'mongoose';

function makeLog(
  overrides: Partial<ISelfNutritionLog> = {},
): ISelfNutritionLog {
  return {
    _id: new Types.ObjectId(),
    userId: new Types.ObjectId(),
    date: '2024-01-15',
    sourceTemplateId: null,
    sourceTemplateDayTypeName: null,
    dayLabel: 'Rest Day',
    meals: [],
    dayCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as ISelfNutritionLog;
}

function makeRepo(
  overrides: Record<string, jest.Mock> = {},
): SelfNutritionLogRepository {
  return {
    findByDate: jest.fn(),
    existsForDate: jest.fn(),
    upsertByDate: jest.fn(),
    findRecent: jest.fn(),
    ...overrides,
  } as unknown as SelfNutritionLogRepository;
}

describe('SelfNutritionService', () => {
  describe('getDay', () => {
    it("returns the day's logged meals or empty shell", async () => {
      const log = makeLog({ date: '2024-01-15' });
      const repo = makeRepo({ findByDate: jest.fn().mockResolvedValue(log) });
      const svc = new SelfNutritionService(repo);

      const result = await svc.getDay('user1', '2024-01-15');

      expect(result).toBe(log);
    });

    it('returns null when no log exists for the date', async () => {
      const repo = makeRepo({ findByDate: jest.fn().mockResolvedValue(null) });
      const svc = new SelfNutritionService(repo);

      const result = await svc.getDay('user1', '2024-01-16');

      expect(result).toBeNull();
    });
  });

  describe('upsertDay', () => {
    it('calls upsertByDate and returns the updated log', async () => {
      const log = makeLog();
      const upsertByDate = jest.fn().mockResolvedValue(log);
      const repo = makeRepo({ upsertByDate });
      const svc = new SelfNutritionService(repo);

      const data = {
        sourceTemplateId: null,
        sourceTemplateDayTypeName: null,
        dayLabel: 'Training Day',
        meals: [],
        dayCompleted: false,
      };

      const result = await svc.upsertDay('user1', '2024-01-15', data);

      expect(result).toBe(log);
      expect(upsertByDate).toHaveBeenCalledWith('user1', '2024-01-15', data);
    });
  });

  describe('listMonth', () => {
    it('returns logs for the given year/month', async () => {
      const logs = [makeLog(), makeLog()];
      const repo = makeRepo({ findRecent: jest.fn().mockResolvedValue(logs) });
      const svc = new SelfNutritionService(repo);

      const result = await svc.listRecent('user1', 10);

      expect(result).toEqual(logs);
    });
  });
});
