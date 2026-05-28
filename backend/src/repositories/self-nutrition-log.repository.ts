import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ISelfNutritionLog,
  ISelfMeal,
  SELF_NUTRITION_LOG_MODEL,
} from '../database/models/self-nutrition-log.model';

export interface UpsertSelfNutritionLogData {
  sourceTemplateId: string | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: ISelfMeal[];
  dayCompleted: boolean;
}

@Injectable()
export class SelfNutritionLogRepository {
  constructor(
    @InjectModel(SELF_NUTRITION_LOG_MODEL)
    private readonly model: Model<ISelfNutritionLog>,
  ) {}

  async findByDate(
    userId: string,
    date: string,
  ): Promise<ISelfNutritionLog | null> {
    return this.model.findOne({ userId: new Types.ObjectId(userId), date });
  }

  async existsForDate(userId: string, date: string): Promise<boolean> {
    const count = await this.model.countDocuments({
      userId: new Types.ObjectId(userId),
      date,
    });
    return count > 0;
  }

  async upsertByDate(
    userId: string,
    date: string,
    data: UpsertSelfNutritionLogData,
  ): Promise<ISelfNutritionLog> {
    const result = await this.model.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), date },
      {
        $set: {
          sourceTemplateId: data.sourceTemplateId
            ? new Types.ObjectId(data.sourceTemplateId)
            : null,
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

  async findRecent(
    userId: string,
    limit: number,
  ): Promise<ISelfNutritionLog[]> {
    return this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ date: -1 })
      .limit(Math.max(1, limit));
  }
}
