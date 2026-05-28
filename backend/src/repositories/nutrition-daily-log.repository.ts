import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  INutritionDailyLog,
  IDailyLogMeal,
  NUTRITION_DAILY_LOG_MODEL,
} from '../database/models/nutrition-daily-log.model';

export interface UpsertDailyLogData {
  planId: string;
  dayTypeName: string;
  meals: IDailyLogMeal[];
  dayCompleted: boolean;
}

@Injectable()
export class NutritionDailyLogRepository {
  constructor(
    @InjectModel(NUTRITION_DAILY_LOG_MODEL)
    private readonly model: Model<INutritionDailyLog>,
  ) {}

  async findByDate(
    memberId: string,
    date: string,
  ): Promise<INutritionDailyLog | null> {
    return this.model.findOne({
      memberId: new Types.ObjectId(memberId),
      date,
    });
  }

  async existsForDate(memberId: string, date: string): Promise<boolean> {
    const count = await this.model.countDocuments({
      memberId: new Types.ObjectId(memberId),
      date,
    });
    return count > 0;
  }

  async findRecent(
    memberId: string,
    days: number,
  ): Promise<INutritionDailyLog[]> {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - days);
    const cutoffISO = cutoff.toISOString().slice(0, 10);
    return this.model
      .find({
        memberId: new Types.ObjectId(memberId),
        date: { $gte: cutoffISO },
      })
      .sort({ date: -1 });
  }

  async upsert(
    memberId: string,
    date: string,
    data: UpsertDailyLogData,
  ): Promise<INutritionDailyLog> {
    const result = await this.model.findOneAndUpdate(
      { memberId: new Types.ObjectId(memberId), date },
      {
        $set: {
          planId: new Types.ObjectId(data.planId),
          dayTypeName: data.dayTypeName,
          meals: data.meals,
          dayCompleted: data.dayCompleted,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (!result) throw new Error('Upsert failed');
    return result;
  }
}
