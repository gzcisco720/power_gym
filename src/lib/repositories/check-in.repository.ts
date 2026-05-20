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
  countSince(since: Date): Promise<number>;
  findPhotosForMember(memberId: string): Promise<{
    _id: string;
    submittedAt: Date;
    photos: string[];
    weight: number | null;
  }[]>;
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
    const doc = await CheckInModel.exists({
      memberId: new mongoose.Types.ObjectId(memberId),
      submittedAt: { $gte: weekStart },
    });
    return doc !== null;
  }

  async countSince(since: Date): Promise<number> {
    return CheckInModel.countDocuments({ submittedAt: { $gte: since } });
  }

  async findPhotosForMember(memberId: string): Promise<{
    _id: string;
    submittedAt: Date;
    photos: string[];
    weight: number | null;
  }[]> {
    const docs = await CheckInModel.find(
      {
        memberId: new mongoose.Types.ObjectId(memberId),
        'photos.0': { $exists: true },
      },
      { submittedAt: 1, photos: 1, weight: 1 },
    ).sort({ submittedAt: 1 }).lean();

    return docs.map((d) => ({
      _id: String(d._id),
      submittedAt: d.submittedAt as Date,
      photos: d.photos as string[],
      weight: (d.weight as number | null | undefined) ?? null,
    }));
  }
}
