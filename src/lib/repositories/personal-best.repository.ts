import mongoose from 'mongoose';
import type { IPersonalBest } from '@/lib/db/models/personal-best.model';
import { PersonalBestModel } from '@/lib/db/models/personal-best.model';
import { estimatedOneRM } from '@/lib/training/epley';

export interface UpsertPBData {
  memberId: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  sessionId: string;
}

export interface IPersonalBestRepository {
  findByMember(memberId: string): Promise<IPersonalBest[]>;
  upsertIfBetter(data: UpsertPBData): Promise<void>;
}

export class MongoPersonalBestRepository implements IPersonalBestRepository {
  async findByMember(memberId: string): Promise<IPersonalBest[]> {
    return PersonalBestModel.find({ memberId: new mongoose.Types.ObjectId(memberId) });
  }

  async upsertIfBetter(data: UpsertPBData): Promise<void> {
    const newEstimated = estimatedOneRM(data.weight, data.reps);
    try {
      await PersonalBestModel.updateOne(
        {
          memberId: new mongoose.Types.ObjectId(data.memberId),
          exerciseId: new mongoose.Types.ObjectId(data.exerciseId),
          $or: [{ estimatedOneRM: { $lt: newEstimated } }, { estimatedOneRM: { $exists: false } }],
        },
        {
          $set: {
            exerciseName: data.exerciseName,
            bestWeight: data.weight,
            bestReps: data.reps,
            estimatedOneRM: newEstimated,
            achievedAt: new Date(),
            sessionId: new mongoose.Types.ObjectId(data.sessionId),
          },
        },
        { upsert: true },
      );
    } catch (err) {
      // E11000: a concurrent upsert created the document first — the PB is already recorded
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
}
