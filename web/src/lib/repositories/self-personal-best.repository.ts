import mongoose from 'mongoose';
import type { ISelfPersonalBest } from '@/lib/db/models/self-personal-best.model';
import { SelfPersonalBestModel } from '@/lib/db/models/self-personal-best.model';
import { estimatedOneRM } from '@/lib/training/epley';

export interface UpsertSelfPBData {
  userId: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  logId: string;
}

export interface ISelfPersonalBestRepository {
  findByUser(userId: string): Promise<ISelfPersonalBest[]>;
  upsertIfBetter(data: UpsertSelfPBData): Promise<boolean>;
}

const oid = (s: string) => new mongoose.Types.ObjectId(s);

export class MongoSelfPersonalBestRepository implements ISelfPersonalBestRepository {
  async findByUser(userId: string): Promise<ISelfPersonalBest[]> {
    return SelfPersonalBestModel.find({ userId: oid(userId) });
  }

  async upsertIfBetter(data: UpsertSelfPBData): Promise<boolean> {
    const newEstimated = estimatedOneRM(data.weight, data.reps);
    try {
      const result = await SelfPersonalBestModel.updateOne(
        {
          userId: oid(data.userId),
          exerciseId: oid(data.exerciseId),
          $or: [{ estimatedOneRM: { $lt: newEstimated } }, { estimatedOneRM: { $exists: false } }],
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
