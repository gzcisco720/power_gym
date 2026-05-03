import mongoose from 'mongoose';
import { CheckInModel, type ICheckIn } from '@/lib/db/models/check-in.model';

export interface CreateCheckInData {
  memberId: string;
  trainerId: string;
  submittedAt: Date;
  sleepQuality: number;
  stress: number;
  fatigue: number;
  hunger: number;
  recovery: number;
  energy: number;
  digestion: number;
  weight: number | null;
  waist: number | null;
  steps: number | null;
  exerciseMinutes: number | null;
  walkRunDistance: number | null;
  sleepHours: number | null;
  dietDetails: string;
  stuckToDiet: 'yes' | 'no' | 'partial';
  wellbeing: string;
  notes: string;
  photos: string[];
}

export interface ICheckInRepository {
  create(data: CreateCheckInData): Promise<ICheckIn>;
  findByMember(memberId: string): Promise<ICheckIn[]>;
  findById(checkInId: string, memberId: string): Promise<ICheckIn | null>;
  hasCheckInThisWeek(memberId: string, weekStart: Date): Promise<boolean>;
}

export class MongoCheckInRepository implements ICheckInRepository {
  async create(data: CreateCheckInData): Promise<ICheckIn> {
    const doc = new CheckInModel({
      ...data,
      memberId: new mongoose.Types.ObjectId(data.memberId),
      trainerId: new mongoose.Types.ObjectId(data.trainerId),
    });
    return doc.save();
  }

  async findByMember(memberId: string): Promise<ICheckIn[]> {
    return CheckInModel.find({
      memberId: new mongoose.Types.ObjectId(memberId),
    }).sort({ submittedAt: -1 });
  }

  async findById(checkInId: string, memberId: string): Promise<ICheckIn | null> {
    return CheckInModel.findOne({
      _id: new mongoose.Types.ObjectId(checkInId),
      memberId: new mongoose.Types.ObjectId(memberId),
    });
  }

  async hasCheckInThisWeek(memberId: string, weekStart: Date): Promise<boolean> {
    const count = await CheckInModel.countDocuments({
      memberId: new mongoose.Types.ObjectId(memberId),
      submittedAt: { $gte: weekStart },
    });
    return count > 0;
  }
}
