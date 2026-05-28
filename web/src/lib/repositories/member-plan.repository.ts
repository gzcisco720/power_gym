import mongoose from 'mongoose';
import type { IMemberPlan } from '@/lib/db/models/member-plan.model';
import { MemberPlanModel } from '@/lib/db/models/member-plan.model';
import type { IPlanDay } from '@/lib/db/models/plan-template.model';

export interface CreateMemberPlanData {
  memberId: string;
  trainerId: string;
  templateId: string;
  name: string;
  days: IPlanDay[];
  assignedAt: Date;
}

export interface IMemberPlanRepository {
  findActive(memberId: string): Promise<IMemberPlan | null>;
  deactivateAll(memberId: string): Promise<void>;
  create(data: CreateMemberPlanData): Promise<IMemberPlan>;
}

export class MongoMemberPlanRepository implements IMemberPlanRepository {
  async findActive(memberId: string): Promise<IMemberPlan | null> {
    return MemberPlanModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
      isActive: true,
    });
  }

  async deactivateAll(memberId: string): Promise<void> {
    await MemberPlanModel.updateMany(
      { memberId: new mongoose.Types.ObjectId(memberId) },
      { $set: { isActive: false } },
    );
  }

  async create(data: CreateMemberPlanData): Promise<IMemberPlan> {
    const plan = new MemberPlanModel({
      memberId: new mongoose.Types.ObjectId(data.memberId),
      trainerId: new mongoose.Types.ObjectId(data.trainerId),
      templateId: new mongoose.Types.ObjectId(data.templateId),
      name: data.name,
      days: data.days,
      isActive: true,
      assignedAt: data.assignedAt,
    });
    return plan.save();
  }
}
