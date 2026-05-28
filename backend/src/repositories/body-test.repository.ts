import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IBodyTest, BODY_TEST_MODEL } from '../database/models/body-test.model';

export interface CreateBodyTestData {
  memberId: string;
  trainerId: string;
  date: Date;
  age: number;
  sex: 'male' | 'female';
  weight: number;
  protocol: '3site' | '7site' | '9site' | 'other';
  tricep: number | null;
  chest: number | null;
  subscapular: number | null;
  abdominal: number | null;
  suprailiac: number | null;
  thigh: number | null;
  midaxillary: number | null;
  bicep: number | null;
  lumbar: number | null;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
}

@Injectable()
export class BodyTestRepository {
  constructor(
    @InjectModel(BODY_TEST_MODEL)
    private readonly model: Model<IBodyTest>,
  ) {}

  async create(data: CreateBodyTestData): Promise<IBodyTest> {
    const doc = new this.model({
      ...data,
      memberId: new Types.ObjectId(data.memberId),
      trainerId: new Types.ObjectId(data.trainerId),
    });
    return doc.save();
  }

  async findByMember(memberId: string): Promise<IBodyTest[]> {
    return this.model
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ date: -1 });
  }

  async deleteByIdAndTrainer(
    testId: string,
    trainerId: string,
  ): Promise<boolean> {
    const result = await this.model.deleteOne({
      _id: new Types.ObjectId(testId),
      trainerId: new Types.ObjectId(trainerId),
    });
    return result.deletedCount > 0;
  }

  async deleteById(testId: string): Promise<boolean> {
    const result = await this.model.deleteOne({
      _id: new Types.ObjectId(testId),
    });
    return result.deletedCount > 0;
  }
}
