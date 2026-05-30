import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IMemberNutritionPlan,
  ISchedule,
  MEMBER_NUTRITION_PLAN_MODEL,
} from '../database/models/member-nutrition-plan.model';
import type { IDayType } from '../database/models/nutrition-template.model';

export type { ISchedule };

export interface CreateMemberNutritionPlanData {
  memberId: string;
  assignedById: string;
  templateId: string | null;
  name: string;
  dayTypes: IDayType[];
  assignedAt: Date;
  schedule: ISchedule;
}

@Injectable()
export class MemberNutritionPlanRepository {
  constructor(
    @InjectModel(MEMBER_NUTRITION_PLAN_MODEL)
    private readonly model: Model<IMemberNutritionPlan>,
  ) {}

  async findActive(memberId: string): Promise<IMemberNutritionPlan | null> {
    return this.model.findOne({
      memberId: new Types.ObjectId(memberId),
      isActive: true,
    });
  }

  async findAllByMember(memberId: string): Promise<IMemberNutritionPlan[]> {
    return this.model
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ assignedAt: -1 });
  }

  async deactivateAll(memberId: string): Promise<void> {
    await this.model.updateMany(
      { memberId: new Types.ObjectId(memberId), isActive: true },
      { $set: { isActive: false, deactivatedAt: new Date() } },
    );
  }

  async updateSchedule(
    memberId: string,
    schedule: ISchedule,
  ): Promise<IMemberNutritionPlan | null> {
    return this.model.findOneAndUpdate(
      { memberId: new Types.ObjectId(memberId), isActive: true },
      { $set: { schedule } },
      { returnDocument: 'after' },
    );
  }

  async create(
    data: CreateMemberNutritionPlanData,
  ): Promise<IMemberNutritionPlan> {
    const doc = new this.model({
      memberId: new Types.ObjectId(data.memberId),
      assignedById: new Types.ObjectId(data.assignedById),
      templateId: data.templateId ? new Types.ObjectId(data.templateId) : null,
      name: data.name,
      dayTypes: data.dayTypes,
      isActive: true,
      assignedAt: data.assignedAt,
      schedule: data.schedule,
    });
    return doc.save();
  }
}
