import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MemberNutritionPlan,
  MemberNutritionPlanDocument,
} from '../../common/models/member-nutrition-plan.model';
import {
  NutritionDailyLog,
  NutritionDailyLogDocument,
} from '../../common/models/nutrition-daily-log.model';
import {
  NutritionTemplate,
  NutritionTemplateDocument,
} from '../nutrition-templates/nutrition-template.model';
import { User, UserDocument, UserRole } from '../../common/models/user.model';
import { LogFoodDto } from './dto/log-food.dto';

export interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MacroSummary {
  logged: MacroTotals;
  target: MacroTotals;
}

export interface ActiveNutritionPlan {
  _id: Types.ObjectId;
  name: string;
  templateId: Types.ObjectId | null;
  assignedAt: Date;
  dayTypes: MemberNutritionPlanDocument['dayTypes'];
  todayDayTypeName: string;
  isActive: boolean;
  memberId: Types.ObjectId;
  assignedById: Types.ObjectId;
  schedule: MemberNutritionPlanDocument['schedule'];
}

function getTodayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function resolveTodayDayTypeName(plan: MemberNutritionPlanDocument): string {
  const todayDateStr = getTodayStr();
  const todayDow = new Date().getDay();

  // Check calendar overrides first
  const override = plan.schedule.calendarOverrides.find(
    (o) => o.date === todayDateStr,
  );
  if (override) {
    return override.dayTypeName;
  }

  // Check weekly pattern
  const weeklyEntry = plan.schedule.weeklyPattern.find(
    (e) => e.dayOfWeek === todayDow,
  );
  if (weeklyEntry) {
    return weeklyEntry.dayTypeName;
  }

  // Fall back to dayTypes[0].name
  return plan.dayTypes[0]?.name ?? '';
}

@Injectable()
export class NutritionService {
  constructor(
    @InjectModel(MemberNutritionPlan.name)
    private readonly memberNutritionPlanModel: Model<MemberNutritionPlanDocument>,
    @InjectModel(NutritionDailyLog.name)
    private readonly nutritionDailyLogModel: Model<NutritionDailyLogDocument>,
    @InjectModel(NutritionTemplate.name)
    private readonly nutritionTemplateModel: Model<NutritionTemplateDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async getMyPlan(memberId: string): Promise<ActiveNutritionPlan | null> {
    const plan = await this.memberNutritionPlanModel.findOne({
      memberId: new Types.ObjectId(memberId),
      isActive: true,
    });

    if (!plan) {
      return null;
    }

    const todayDayTypeName = resolveTodayDayTypeName(plan);

    return {
      _id: plan._id,
      name: plan.name,
      templateId: plan.templateId,
      assignedAt: plan.assignedAt,
      dayTypes: plan.dayTypes,
      todayDayTypeName,
      isActive: plan.isActive,
      memberId: plan.memberId,
      assignedById: plan.assignedById,
      schedule: plan.schedule,
    };
  }

  async getToday(memberId: string): Promise<NutritionDailyLogDocument> {
    const plan = await this.memberNutritionPlanModel.findOne({
      memberId: new Types.ObjectId(memberId),
      isActive: true,
    });

    if (!plan) {
      throw new NotFoundException('No active nutrition plan found');
    }

    const todayStr = getTodayStr();
    const existing = await this.nutritionDailyLogModel.findOne({
      memberId: new Types.ObjectId(memberId),
      date: todayStr,
    });

    if (existing) {
      return existing;
    }

    const todayDayTypeName = resolveTodayDayTypeName(plan);
    const dayType = plan.dayTypes.find((dt) => dt.name === todayDayTypeName);
    const mealSlots = (dayType?.meals ?? []).map((m) => ({
      name: m.name,
      order: m.order,
      items: [],
    }));

    return this.nutritionDailyLogModel.create({
      memberId: new Types.ObjectId(memberId),
      planId: plan._id,
      date: todayStr,
      dayTypeName: todayDayTypeName,
      meals: mealSlots,
    });
  }

  async logFood(
    memberId: string,
    dto: LogFoodDto,
  ): Promise<NutritionDailyLogDocument> {
    const log = await this.getToday(memberId);

    const meal = log.meals.find((m) => m.name === dto.mealName);
    if (!meal) {
      throw new NotFoundException(
        `Meal "${dto.mealName}" not found in today's log`,
      );
    }

    meal.items.push({
      foodName: dto.foodName,
      quantityG: dto.quantityG,
      kcal: dto.kcal,
      protein: dto.protein,
      carbs: dto.carbs,
      fat: dto.fat,
    });

    await log.save();
    return log;
  }

  async getSummary(memberId: string): Promise<MacroSummary> {
    const log = await this.getToday(memberId);

    const plan = await this.memberNutritionPlanModel.findOne({
      memberId: new Types.ObjectId(memberId),
      isActive: true,
    });

    const zeroed: MacroTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

    const logged = log.meals.reduce(
      (acc, meal) => {
        for (const item of meal.items) {
          acc.kcal += item.kcal;
          acc.protein += item.protein;
          acc.carbs += item.carbs;
          acc.fat += item.fat;
        }
        return acc;
      },
      { ...zeroed },
    );

    const target = { ...zeroed };

    if (plan) {
      const dayType = plan.dayTypes.find((dt) => dt.name === log.dayTypeName);
      if (dayType) {
        for (const meal of dayType.meals) {
          for (const item of meal.items) {
            target.kcal += item.kcal;
            target.protein += item.protein;
            target.carbs += item.carbs;
            target.fat += item.fat;
          }
        }
      }
    }

    return { logged, target };
  }

  async assignNutritionPlan(
    memberId: string,
    templateId: string,
    callerId: string,
    callerRole: UserRole,
  ): Promise<MemberNutritionPlanDocument> {
    const template = await this.nutritionTemplateModel.findById(templateId);
    if (!template || template.createdBy.toString() !== callerId) {
      throw new NotFoundException('Nutrition template not found');
    }

    const member = await this.userModel.findById(memberId);
    if (!member || member.role !== 'member') {
      throw new NotFoundException('Member not found');
    }

    if (callerRole === 'trainer') {
      const assignedTrainerId = member.trainerId?.toString() ?? null;
      if (assignedTrainerId !== callerId) {
        throw new NotFoundException('Member not found');
      }
    }

    await this.memberNutritionPlanModel.updateMany(
      { memberId: new Types.ObjectId(memberId), isActive: true },
      { $set: { isActive: false } },
    );

    return this.memberNutritionPlanModel.create({
      memberId: new Types.ObjectId(memberId),
      assignedById: new Types.ObjectId(callerId),
      templateId: new Types.ObjectId(templateId),
      name: template.name,
      dayTypes: template.dayTypes,
      isActive: true,
      assignedAt: new Date(),
    });
  }

  async getHistory(
    memberId: string,
    callerId: string,
    callerRole: UserRole,
  ): Promise<NutritionDailyLogDocument[]> {
    const member = await this.userModel.findById(memberId);
    if (!member || member.role !== 'member') {
      throw new NotFoundException('Member not found');
    }

    if (callerRole === 'trainer') {
      const assignedTrainerId = member.trainerId?.toString() ?? null;
      if (assignedTrainerId !== callerId) {
        throw new NotFoundException('Member not found');
      }
    }

    return this.nutritionDailyLogModel
      .find({ memberId: new Types.ObjectId(memberId) })
      .sort({ date: -1 });
  }
}
