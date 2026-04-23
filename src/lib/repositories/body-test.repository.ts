import mongoose from 'mongoose';
import { BodyTestModel, type IBodyTest } from '@/lib/db/models/body-test.model';

export interface CreateBodyTestData {
  memberId: string;
  trainerId: string;
  date: Date;
  age: number;
  sex: 'male' | 'female';
  weight: number;
  protocol: '3site' | '7site' | '9site' | 'other';
  tricep?: number | null;
  chest?: number | null;
  subscapular?: number | null;
  abdominal?: number | null;
  suprailiac?: number | null;
  thigh?: number | null;
  midaxillary?: number | null;
  bicep?: number | null;
  lumbar?: number | null;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight?: number | null;
  targetBodyFatPct?: number | null;
}

export interface IBodyTestRepository {
  create(data: CreateBodyTestData): Promise<IBodyTest>;
  findByMember(memberId: string): Promise<IBodyTest[]>;
  deleteById(testId: string, trainerId: string): Promise<void>;
}

export class MongoBodyTestRepository implements IBodyTestRepository {
  async create(data: CreateBodyTestData): Promise<IBodyTest> {
    const test = new BodyTestModel({
      ...data,
      memberId: new mongoose.Types.ObjectId(data.memberId),
      trainerId: new mongoose.Types.ObjectId(data.trainerId),
    });
    return test.save();
  }

  async findByMember(memberId: string): Promise<IBodyTest[]> {
    return BodyTestModel.find({ memberId: new mongoose.Types.ObjectId(memberId) }).sort({ date: -1 });
  }

  async deleteById(testId: string, trainerId: string): Promise<void> {
    await BodyTestModel.deleteOne({
      _id: new mongoose.Types.ObjectId(testId),
      trainerId: new mongoose.Types.ObjectId(trainerId),
    });
  }
}
