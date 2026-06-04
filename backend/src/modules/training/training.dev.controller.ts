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
  MemberPlan,
  MemberPlanDocument,
} from '../../common/models/member-plan.model';
import {
  PlanTemplate,
  PlanTemplateDocument,
} from '../../common/models/plan-template.model';
import { User, UserDocument } from '../../common/models/user.model';
import {
  WorkoutSession,
  WorkoutSessionDocument,
} from '../../common/models/workout-session.model';
import { SeedTrainingDto } from './dto/seed-training.dto';

/**
 * Dev/test-only routes for E2E test setup.
 * Only registered when NODE_ENV !== 'production' (see training.module.ts).
 */
@Controller('training/dev')
export class TrainingDevController {
  constructor(
    @InjectModel(MemberPlan.name)
    private readonly memberPlanModel: Model<MemberPlanDocument>,
    @InjectModel(PlanTemplate.name)
    private readonly planTemplateModel: Model<PlanTemplateDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(WorkoutSession.name)
    private readonly workoutSessionModel: Model<WorkoutSessionDocument>,
  ) {}

  @HttpCode(200)
  @Post('seed')
  async seed(@Body() dto: SeedTrainingDto) {
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

    const template = await this.planTemplateModel
      .findById(dto.templateId)
      .lean();
    if (!template) {
      throw new NotFoundException(`Template not found: ${dto.templateId}`);
    }

    const memberId = member._id;
    const ownerId = owner._id;
    const templateId = template._id;

    // Deactivate existing active plans
    await this.memberPlanModel.updateMany(
      { memberId, isActive: true },
      { $set: { isActive: false } },
    );

    const plan = await this.memberPlanModel.create({
      memberId,
      trainerId: ownerId,
      templateId,
      name: template.name,
      days: template.days,
      isActive: true,
      assignedAt: new Date(),
    });

    if (dto.seedCompletedSession && template.days.length > 0) {
      const day = template.days[0];
      const sets: Array<{
        exerciseId: Types.ObjectId;
        exerciseName: string;
        groupId: string;
        isSuperset: boolean;
        isBodyweight: boolean;
        setNumber: number;
        prescribedRepsMin: number;
        prescribedRepsMax: number;
        isExtraSet: boolean;
        actualReps: number | null;
        actualWeight: number | null;
        completedAt: Date | null;
      }> = [];

      for (const exercise of day.exercises) {
        for (let i = 1; i <= exercise.sets; i++) {
          sets.push({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            groupId: exercise.groupId,
            isSuperset: exercise.isSuperset,
            isBodyweight: exercise.isBodyweight,
            setNumber: i,
            prescribedRepsMin: exercise.repsMin,
            prescribedRepsMax: exercise.repsMax,
            isExtraSet: false,
            actualReps: 10,
            actualWeight: exercise.isBodyweight ? null : 80,
            completedAt: new Date(),
          });
        }
      }

      const now = new Date();
      await this.workoutSessionModel.create({
        memberId,
        memberPlanId: plan._id,
        dayNumber: day.dayNumber,
        dayName: day.name,
        startedAt: now,
        completedAt: now,
        lastActivityAt: now,
        autoSealed: false,
        sets,
        loggedBy: null,
        rpe: null,
        memberNote: null,
      });
    }

    return { ok: true, planId: plan._id.toString() };
  }
}
