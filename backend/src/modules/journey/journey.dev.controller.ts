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
import { User, UserDocument } from '../../common/models/user.model';
import {
  WorkoutSession,
  WorkoutSessionDocument,
} from '../../common/models/workout-session.model';
import {
  NutritionDailyLog,
  NutritionDailyLogDocument,
} from '../../common/models/nutrition-daily-log.model';
import {
  BodyTest,
  BodyTestDocument,
} from '../../common/models/body-test.model';
import { SeedJourneyDto } from './dto/seed-journey.dto';

/**
 * Dev/test-only routes for E2E test setup.
 * Only registered when NODE_ENV !== 'production' (see journey.module.ts).
 */
@Controller('journey/dev')
export class JourneyDevController {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(WorkoutSession.name)
    private readonly workoutSessionModel: Model<WorkoutSessionDocument>,
    @InjectModel(NutritionDailyLog.name)
    private readonly nutritionDailyLogModel: Model<NutritionDailyLogDocument>,
    @InjectModel(BodyTest.name)
    private readonly bodyTestModel: Model<BodyTestDocument>,
  ) {}

  @HttpCode(200)
  @Post('seed')
  async seed(@Body() dto: SeedJourneyDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }

    const member = await this.userModel
      .findOne({ email: dto.memberEmail })
      .lean();
    if (!member) {
      throw new NotFoundException(`Member not found: ${dto.memberEmail}`);
    }

    const memberId = member._id;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    // Seed a finished WorkoutSession for today
    const fakeplanId = new Types.ObjectId();
    const fakeExerciseId = new Types.ObjectId();
    await this.workoutSessionModel.create({
      memberId,
      memberPlanId: fakeplanId,
      dayNumber: 1,
      dayName: 'Journey Seed Day',
      startedAt: now,
      completedAt: now,
      lastActivityAt: now,
      autoSealed: false,
      sets: [
        {
          exerciseId: fakeExerciseId,
          exerciseName: 'Squat',
          groupId: 'g1',
          isSuperset: false,
          isBodyweight: false,
          setNumber: 1,
          prescribedRepsMin: 5,
          prescribedRepsMax: 8,
          isExtraSet: false,
          actualReps: 6,
          actualWeight: 100,
          completedAt: now,
        },
      ],
      loggedBy: null,
      rpe: null,
      memberNote: null,
    });

    // Seed a NutritionDailyLog for today
    // Remove existing log for today to avoid unique index conflict
    await this.nutritionDailyLogModel.deleteOne({ memberId, date: todayStr });
    await this.nutritionDailyLogModel.create({
      memberId,
      planId: new Types.ObjectId(),
      date: todayStr,
      dayTypeName: 'Normal',
      meals: [
        {
          name: 'Breakfast',
          order: 1,
          items: [
            {
              foodName: 'Oats',
              quantityG: 100,
              kcal: 350,
              protein: 12,
              carbs: 60,
              fat: 7,
            },
          ],
        },
      ],
    });

    // Seed a BodyTest for today
    await this.bodyTestModel.create({
      memberId,
      trainerId: null,
      date: now,
      age: 30,
      sex: 'male',
      weight: 80,
      protocol: 'other',
      bodyFatPct: 15,
      leanMassKg: 68,
      fatMassKg: 12,
      targetWeight: null,
      targetBodyFatPct: null,
    });

    return { ok: true };
  }
}
