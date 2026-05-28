import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ICheckIn, CHECK_IN_MODEL } from '../database/models/check-in.model';

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

@Injectable()
export class CheckInRepository {
  constructor(
    @InjectModel(CHECK_IN_MODEL)
    private readonly model: Model<ICheckIn>,
  ) {}

  async create(data: CreateCheckInData): Promise<ICheckIn> {
    const doc = new this.model({
      ...data,
      memberId: new Types.ObjectId(data.memberId),
      trainerId: new Types.ObjectId(data.trainerId),
    });
    return doc.save();
  }

  async findByMember(memberId: string): Promise<ICheckIn[]> {
    return this.model
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ submittedAt: -1 });
  }

  async existsForDay(
    memberId: string,
    dayStart: Date,
    dayEnd: Date,
  ): Promise<boolean> {
    const doc = await this.model.exists({
      memberId: new Types.ObjectId(memberId),
      submittedAt: { $gte: dayStart, $lt: dayEnd },
    });
    return doc !== null;
  }
}
