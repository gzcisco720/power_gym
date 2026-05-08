import mongoose from 'mongoose';
import type { ISelfNutritionLog, ISelfMeal } from '@/lib/db/models/self-nutrition-log.model';
import { SelfNutritionLogModel } from '@/lib/db/models/self-nutrition-log.model';

export interface UpsertSelfNutritionLogData {
  sourceTemplateId: string | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: ISelfMeal[];
  dayCompleted: boolean;
}

export interface ISelfNutritionLogRepository {
  findByDate(userId: string, date: string): Promise<ISelfNutritionLog | null>;
  upsertByDate(userId: string, date: string, data: UpsertSelfNutritionLogData): Promise<ISelfNutritionLog>;
  findByUserMonth(userId: string, year: number, month: number): Promise<ISelfNutritionLog[]>;
  delete(userId: string, date: string): Promise<boolean>;
}

const oid = (s: string) => new mongoose.Types.ObjectId(s);
const pad2 = (n: number) => n.toString().padStart(2, '0');

export class MongoSelfNutritionLogRepository implements ISelfNutritionLogRepository {
  async findByDate(userId: string, date: string): Promise<ISelfNutritionLog | null> {
    return SelfNutritionLogModel.findOne({ userId: oid(userId), date });
  }

  async upsertByDate(
    userId: string,
    date: string,
    data: UpsertSelfNutritionLogData,
  ): Promise<ISelfNutritionLog> {
    const result = await SelfNutritionLogModel.findOneAndUpdate(
      { userId: oid(userId), date },
      {
        $set: {
          sourceTemplateId: data.sourceTemplateId ? oid(data.sourceTemplateId) : null,
          sourceTemplateDayTypeName: data.sourceTemplateDayTypeName,
          dayLabel: data.dayLabel,
          meals: data.meals,
          dayCompleted: data.dayCompleted,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    if (!result) throw new Error('Upsert failed');
    return result;
  }

  async findByUserMonth(userId: string, year: number, month: number): Promise<ISelfNutritionLog[]> {
    const startStr = `${year}-${pad2(month)}-01`;
    const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${pad2(month + 1)}-01`;
    return SelfNutritionLogModel.find({
      userId: oid(userId),
      date: { $gte: startStr, $lt: nextMonth },
    }).sort({ date: 1 });
  }

  async delete(userId: string, date: string): Promise<boolean> {
    const result = await SelfNutritionLogModel.findOneAndDelete({ userId: oid(userId), date });
    return result !== null;
  }
}
