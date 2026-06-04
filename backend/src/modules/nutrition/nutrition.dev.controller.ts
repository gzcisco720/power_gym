import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MemberNutritionPlan,
  MemberNutritionPlanDocument,
} from '../../common/models/member-nutrition-plan.model';
import {
  NutritionTemplate,
  NutritionTemplateDocument,
} from '../nutrition-templates/nutrition-template.model';
import { User, UserDocument } from '../../common/models/user.model';
import { SeedNutritionDto } from './dto/seed-nutrition.dto';

/**
 * Dev/test-only routes for E2E test setup.
 * Only registered when NODE_ENV !== 'production' (see nutrition.module.ts).
 */
@Controller('nutrition/dev')
export class NutritionDevController {
  constructor(
    @InjectModel(MemberNutritionPlan.name)
    private readonly memberNutritionPlanModel: Model<MemberNutritionPlanDocument>,
    @InjectModel(NutritionTemplate.name)
    private readonly nutritionTemplateModel: Model<NutritionTemplateDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  @HttpCode(200)
  @Post('seed')
  async seed(@Body() dto: SeedNutritionDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }

    const member = await this.userModel
      .findOne({ email: dto.memberEmail })
      .lean();
    if (!member) {
      throw new NotFoundException(`Member not found: ${dto.memberEmail}`);
    }

    const owner = await this.userModel
      .findOne({ email: dto.ownerEmail })
      .lean();
    if (!owner) {
      throw new NotFoundException(`Owner not found: ${dto.ownerEmail}`);
    }

    const template = await this.nutritionTemplateModel
      .findById(dto.templateId)
      .lean();
    if (!template) {
      throw new NotFoundException(`Template not found: ${dto.templateId}`);
    }

    const memberId = member._id;
    const ownerId = owner._id;
    const templateId = template._id;

    // Deactivate existing active plans
    await this.memberNutritionPlanModel.updateMany(
      { memberId, isActive: true },
      { $set: { isActive: false } },
    );

    // Build a default schedule with weeklyPattern for all 7 days pointing to dayTypes[0]
    const defaultDayTypeName =
      template.dayTypes.length > 0 ? template.dayTypes[0].name : '';
    const weeklyPattern = (
      [0, 1, 2, 3, 4, 5, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[]
    ).map((dow) => ({
      dayOfWeek: dow,
      dayTypeName: defaultDayTypeName,
    }));

    const plan = await this.memberNutritionPlanModel.create({
      memberId: new Types.ObjectId(memberId.toString()),
      assignedById: new Types.ObjectId(ownerId.toString()),
      templateId: new Types.ObjectId(templateId.toString()),
      name: template.name,
      dayTypes: template.dayTypes,
      isActive: true,
      assignedAt: new Date(),
      schedule: {
        weeklyPattern,
        calendarOverrides: [],
        iterate: true,
      },
    });

    return { ok: true, planId: plan._id.toString() };
  }
}
