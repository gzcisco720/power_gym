import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IPersonalBest,
  PERSONAL_BEST_MODEL,
} from '../database/models/personal-best.model';
import { estimatedOneRM } from '../training/epley';

export interface UpsertPBData {
  memberId: string;
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  sessionId: string;
}

@Injectable()
export class PersonalBestRepository {
  constructor(
    @InjectModel(PERSONAL_BEST_MODEL)
    private readonly model: Model<IPersonalBest>,
  ) {}

  async findByMember(memberId: string): Promise<IPersonalBest[]> {
    return this.model.find({ memberId: new Types.ObjectId(memberId) });
  }

  async findByMemberSorted(memberId: string): Promise<IPersonalBest[]> {
    return this.model
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ achievedAt: 1 });
  }

  async upsertIfBetter(data: UpsertPBData): Promise<void> {
    const newEstimated = estimatedOneRM(data.weight, data.reps);
    try {
      await this.model.updateOne(
        {
          memberId: new Types.ObjectId(data.memberId),
          exerciseId: new Types.ObjectId(data.exerciseId),
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
            sessionId: new Types.ObjectId(data.sessionId),
          },
        },
        { upsert: true },
      );
    } catch (err) {
      if ((err as { code?: number }).code !== 11000) throw err;
    }
  }
}
