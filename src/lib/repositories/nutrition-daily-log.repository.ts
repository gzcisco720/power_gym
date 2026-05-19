import mongoose from 'mongoose';
import type { INutritionDailyLog, IDailyLogMeal } from '@/lib/db/models/nutrition-daily-log.model';
import { NutritionDailyLogModel } from '@/lib/db/models/nutrition-daily-log.model';

export interface UpsertDailyLogData {
  planId: string;
  dayTypeName: string;
  meals: IDailyLogMeal[];
  dayCompleted: boolean;
}

export interface INutritionDailyLogRepository {
  findByDate(memberId: string, date: string): Promise<INutritionDailyLog | null>;
  upsert(memberId: string, date: string, data: UpsertDailyLogData): Promise<INutritionDailyLog>;
  findByMemberMonth(memberId: string, year: number, month: number): Promise<INutritionDailyLog[]>;
}

export class MongoNutritionDailyLogRepository implements INutritionDailyLogRepository {
  async findByDate(memberId: string, date: string): Promise<INutritionDailyLog | null> {
    return NutritionDailyLogModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
      date,
    });
  }

  async findByMemberMonth(memberId: string, year: number, month: number): Promise<INutritionDailyLog[]> {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const start = `${year}-${pad(month)}-01`;
    const end = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`;
    return NutritionDailyLogModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
      date: { $gte: start, $lt: end },
    }).sort({ date: 1 });
  }

  async upsert(memberId: string, date: string, data: UpsertDailyLogData): Promise<INutritionDailyLog> {
    const result = await NutritionDailyLogModel.findOneAndUpdate(
      { memberId: new mongoose.Types.ObjectId(memberId), date },
      {
        $set: {
          planId: new mongoose.Types.ObjectId(data.planId),
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
