import { Injectable } from '@nestjs/common';
import { SelfNutritionLogRepository } from '../repositories/self-nutrition-log.repository';
import type {
  ISelfNutritionLog,
  ISelfMeal,
} from '../database/models/self-nutrition-log.model';

export interface UpsertDayData {
  sourceTemplateId: string | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: ISelfMeal[];
  dayCompleted: boolean;
}

@Injectable()
export class SelfNutritionService {
  constructor(private readonly repo: SelfNutritionLogRepository) {}

  async getDay(
    userId: string,
    date: string,
  ): Promise<ISelfNutritionLog | null> {
    return this.repo.findByDate(userId, date);
  }

  async upsertDay(
    userId: string,
    date: string,
    data: UpsertDayData,
  ): Promise<ISelfNutritionLog> {
    return this.repo.upsertByDate(userId, date, data);
  }

  async listRecent(
    userId: string,
    limit: number,
  ): Promise<ISelfNutritionLog[]> {
    return this.repo.findRecent(userId, limit);
  }
}
