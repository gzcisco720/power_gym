import mongoose from 'mongoose';
import type { IMemberNutritionPlan } from '@/lib/db/models/member-nutrition-plan.model';
import { MemberNutritionPlanModel } from '@/lib/db/models/member-nutrition-plan.model';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';

export interface CreateMemberNutritionPlanData {
  memberId: string;
  trainerId: string;
  templateId: string;
  name: string;
  dayTypes: IDayType[];
  assignedAt: Date;
}

export interface IMemberNutritionPlanRepository {
  findActive(memberId: string): Promise<IMemberNutritionPlan | null>;
  deactivateAll(memberId: string): Promise<void>;
  create(data: CreateMemberNutritionPlanData): Promise<IMemberNutritionPlan>;
}

export class MongoMemberNutritionPlanRepository implements IMemberNutritionPlanRepository {
  async findActive(memberId: string): Promise<IMemberNutritionPlan | null> {
    return MemberNutritionPlanModel.findOne({
      memberId: new mongoose.Types.ObjectId(memberId),
      isActive: true,
    });
  }

  async deactivateAll(memberId: string): Promise<void> {
    await MemberNutritionPlanModel.updateMany(
      { memberId: new mongoose.Types.ObjectId(memberId) },
      { $set: { isActive: false } },
    );
  }

  async create(data: CreateMemberNutritionPlanData): Promise<IMemberNutritionPlan> {
    const plan = new MemberNutritionPlanModel({
      memberId: new mongoose.Types.ObjectId(data.memberId),
      trainerId: new mongoose.Types.ObjectId(data.trainerId),
      templateId: new mongoose.Types.ObjectId(data.templateId),
      name: data.name,
      dayTypes: data.dayTypes,
      isActive: true,
      assignedAt: data.assignedAt,
    });
    return plan.save();
  }
}
