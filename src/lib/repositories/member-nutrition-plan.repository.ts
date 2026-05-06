import mongoose from 'mongoose';
import type { IMemberNutritionPlan, ISchedule } from '@/lib/db/models/member-nutrition-plan.model';
import { MemberNutritionPlanModel } from '@/lib/db/models/member-nutrition-plan.model';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

export interface CreateMemberNutritionPlanData {
  memberId: string;
  assignedById: string;
  templateId: string | null;
  name: string;
  dayTypes: IDayType[];
  assignedAt: Date;
}

export interface IMemberNutritionPlanRepository {
  findActive(memberId: string): Promise<IMemberNutritionPlan | null>;
  findAllByMember(memberId: string): Promise<IMemberNutritionPlan[]>;
  deactivateAll(memberId: string): Promise<void>;
  create(data: CreateMemberNutritionPlanData): Promise<IMemberNutritionPlan>;
  updateSchedule(memberId: string, schedule: ISchedule): Promise<IMemberNutritionPlan | null>;
}

export class MongoMemberNutritionPlanRepository implements IMemberNutritionPlanRepository {
  async findActive(memberId: string): Promise<IMemberNutritionPlan | null> {
    return MemberNutritionPlanModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
      isActive: true,
    });
  }

  async findAllByMember(memberId: string): Promise<IMemberNutritionPlan[]> {
    return MemberNutritionPlanModel
      .find({ memberId: new mongoose.Types.ObjectId(memberId) })
      .sort({ assignedAt: -1 });
  }

  async deactivateAll(memberId: string): Promise<void> {
    await MemberNutritionPlanModel.updateMany(
      { memberId: new mongoose.Types.ObjectId(memberId), isActive: true },
      { $set: { isActive: false, deactivatedAt: new Date() } },
    );
  }

  async create(data: CreateMemberNutritionPlanData): Promise<IMemberNutritionPlan> {
    const plan = new MemberNutritionPlanModel({
      memberId: new mongoose.Types.ObjectId(data.memberId),
      assignedById: new mongoose.Types.ObjectId(data.assignedById),
      templateId: data.templateId ? new mongoose.Types.ObjectId(data.templateId) : null,
      name: data.name,
      dayTypes: data.dayTypes,
      isActive: true,
      assignedAt: data.assignedAt,
      schedule: { weeklyPattern: [], calendarOverrides: [] },
    });
    return plan.save();
  }

  async updateSchedule(memberId: string, schedule: ISchedule): Promise<IMemberNutritionPlan | null> {
    return MemberNutritionPlanModel.findOneAndUpdate(
      { memberId: new mongoose.Types.ObjectId(memberId), isActive: true },
      { $set: { schedule } },
      { new: true },
    );
  }
}
