import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IMemberPlan,
  MEMBER_PLAN_MODEL,
} from '../database/models/member-plan.model';
import type { IPlanDay } from '../database/models/plan-template.model';

export interface CreateMemberPlanData {
  memberId: string;
  trainerId: string;
  templateId: string;
  name: string;
  days: IPlanDay[];
  assignedAt: Date;
}

@Injectable()
export class MemberPlanRepository {
  constructor(
    @InjectModel(MEMBER_PLAN_MODEL)
    private readonly model: Model<IMemberPlan>,
  ) {}

  async findActive(memberId: string): Promise<IMemberPlan | null> {
    return this.model.findOne({
      memberId: new Types.ObjectId(memberId),
      isActive: true,
    });
  }

  async deactivateAll(memberId: string): Promise<void> {
    await this.model.updateMany(
      { memberId: new Types.ObjectId(memberId) },
      { $set: { isActive: false } },
    );
  }

  async create(data: CreateMemberPlanData): Promise<IMemberPlan> {
    const doc = new this.model({
      memberId: new Types.ObjectId(data.memberId),
      trainerId: new Types.ObjectId(data.trainerId),
      templateId: new Types.ObjectId(data.templateId),
      name: data.name,
      days: data.days,
      isActive: true,
      assignedAt: data.assignedAt,
    });
    return doc.save();
  }
}
