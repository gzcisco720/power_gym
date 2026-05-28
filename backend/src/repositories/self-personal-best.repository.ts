import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ISelfPersonalBest,
  SELF_PERSONAL_BEST_MODEL,
} from '../database/models/self-personal-best.model';
import { estimatedOneRM } from '../training/epley';

export interface UpsertSelfPBData {
  userId: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  logId: string;
}

const oid = (s: string) => new Types.ObjectId(s);

@Injectable()
export class SelfPersonalBestRepository {
  constructor(
    @InjectModel(SELF_PERSONAL_BEST_MODEL)
    private readonly model: Model<ISelfPersonalBest>,
  ) {}

  async findByUser(userId: string): Promise<ISelfPersonalBest[]> {
    return this.model.find({ userId: oid(userId) });
  }

  async upsertIfBetter(data: UpsertSelfPBData): Promise<boolean> {
    const newEstimated = estimatedOneRM(data.weight, data.reps);
    try {
      const result = await this.model.updateOne(
        {
          userId: oid(data.userId),
          exerciseId: oid(data.exerciseId),
          $or: [
            { estimatedOneRM: { $lt: newEstimated } },
            { estimatedOneRM: { $exists: false } },
          ],
        },
        {
          $set: {
            exerciseName: data.exerciseName,
            bestWeight: data.weight,
            bestReps: data.reps,
            estimatedOneRM: newEstimated,
            achievedAt: new Date(),
            logId: oid(data.logId),
          },
        },
        { upsert: true },
      );
      return result.modifiedCount > 0 || result.upsertedCount > 0;
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
      return false;
    }
  }
}
