import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IsString } from 'class-validator';
import {
  WorkoutSession,
  WorkoutSessionDocument,
} from '../../common/models/workout-session.model';
import {
  PersonalBest,
  PersonalBestDocument,
} from '../../common/models/personal-best.model';
import {
  MemberPlan,
  MemberPlanDocument,
} from '../../common/models/member-plan.model';
import {
  BodyTest,
  BodyTestDocument,
} from '../../common/models/body-test.model';
import {
  MemberInjury,
  MemberInjuryDocument,
} from '../../common/models/member-injury.model';
import {
  MemberMedication,
  MemberMedicationDocument,
} from '../../common/models/member-medication.model';

class SeedOverviewStatsDto {
  @IsString()
  memberId: string;
}

/**
 * Dev/test-only routes for E2E test setup.
 * Only registered when NODE_ENV !== 'production' (see members.module.ts).
 */
@Controller('members/dev')
export class MembersDevController {
  constructor(
    @InjectModel(WorkoutSession.name)
    private readonly workoutSessionModel: Model<WorkoutSessionDocument>,
    @InjectModel(PersonalBest.name)
    private readonly personalBestModel: Model<PersonalBestDocument>,
    @InjectModel(MemberPlan.name)
    private readonly memberPlanModel: Model<MemberPlanDocument>,
    @InjectModel(BodyTest.name)
    private readonly bodyTestModel: Model<BodyTestDocument>,
    @InjectModel(MemberInjury.name)
    private readonly memberInjuryModel: Model<MemberInjuryDocument>,
    @InjectModel(MemberMedication.name)
    private readonly memberMedicationModel: Model<MemberMedicationDocument>,
  ) {}

  @HttpCode(200)
  @Post('seed-overview-stats')
  async seedOverviewStats(@Body() dto: SeedOverviewStatsDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }

    const memberId = new Types.ObjectId(dto.memberId);
    const fakeExerciseId = new Types.ObjectId();
    const fakePlanId = new Types.ObjectId();
    const fakeTemplateId = new Types.ObjectId();
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Seed 2 completed WorkoutSession records this month
    const session1Date = new Date(
      thisMonth.getTime() + 2 * 24 * 60 * 60 * 1000,
    );
    const session2Date = new Date(
      thisMonth.getTime() + 5 * 24 * 60 * 60 * 1000,
    );

    const sampleSet = {
      exerciseId: fakeExerciseId,
      exerciseName: 'Bench Press',
      groupId: 'g1',
      isSuperset: false,
      isBodyweight: false,
      setNumber: 1,
      prescribedRepsMin: 8,
      prescribedRepsMax: 12,
      isExtraSet: false,
      actualReps: 10,
      actualWeight: 80,
      completedAt: now,
    };

    await this.workoutSessionModel.insertMany([
      {
        memberId,
        memberPlanId: fakePlanId,
        dayNumber: 1,
        dayName: 'Day 1',
        startedAt: session1Date,
        completedAt: session1Date,
        lastActivityAt: session1Date,
        autoSealed: false,
        sets: [sampleSet],
        loggedBy: null,
        rpe: null,
        memberNote: null,
      },
      {
        memberId,
        memberPlanId: fakePlanId,
        dayNumber: 2,
        dayName: 'Day 2',
        startedAt: session2Date,
        completedAt: session2Date,
        lastActivityAt: session2Date,
        autoSealed: false,
        sets: [sampleSet],
        loggedBy: null,
        rpe: null,
        memberNote: null,
      },
    ]);

    // Seed 2 BodyTest records with different bodyFatPct and weight values
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    await this.bodyTestModel.insertMany([
      {
        memberId,
        trainerId: null,
        date: twoMonthsAgo,
        age: 30,
        sex: 'male',
        weight: 85.0,
        protocol: '3site',
        chest: 12,
        abdominal: 18,
        thigh: 14,
        bodyFatPct: 18.5,
        leanMassKg: 69.3,
        fatMassKg: 15.7,
        targetWeight: null,
        targetBodyFatPct: null,
      },
      {
        memberId,
        trainerId: null,
        date: now,
        age: 30,
        sex: 'male',
        weight: 83.0,
        protocol: '3site',
        chest: 10,
        abdominal: 15,
        thigh: 12,
        bodyFatPct: 16.2,
        leanMassKg: 69.5,
        fatMassKg: 13.5,
        targetWeight: null,
        targetBodyFatPct: null,
      },
    ]);

    // Seed 1 PersonalBest record
    const fakeSessionId = new Types.ObjectId();
    await this.personalBestModel.findOneAndUpdate(
      { memberId, exerciseId: fakeExerciseId },
      {
        memberId,
        exerciseId: fakeExerciseId,
        exerciseName: 'Bench Press',
        bestWeight: 100,
        bestReps: 5,
        estimatedOneRM: 117,
        achievedAt: now,
        sessionId: fakeSessionId,
      },
      { upsert: true, new: true },
    );

    // Seed 1 active MemberPlan record
    await this.memberPlanModel.findOneAndUpdate(
      { memberId, isActive: true },
      {
        memberId,
        trainerId: memberId,
        templateId: fakeTemplateId,
        name: 'Strength Program',
        days: [
          {
            dayNumber: 1,
            name: 'Push',
            exercises: [],
          },
        ],
        isActive: true,
        assignedAt: now,
      },
      { upsert: true, new: true },
    );

    // Seed 1 active MemberInjury record
    await this.memberInjuryModel.create({
      memberId,
      title: 'Left knee soreness',
      status: 'active',
      recordedAt: now,
      trainerNotes: null,
      memberNotes: null,
      affectedMovements: null,
      injuryType: 'chronic',
      bodyPart: 'knee',
      bodySide: 'left',
      painAtRest: 2,
      painDuringExercise: 4,
      mechanism: null,
      aggravatingFactors: null,
      relievingFactors: null,
      seenDoctor: false,
      doctorRestrictions: null,
      rehabilitationStatus: 'in_progress',
      resolvedAt: null,
      createdByRole: 'trainer',
    });

    // Seed 1 active MemberMedication record
    await this.memberMedicationModel.create({
      memberId,
      name: 'Vitamin D',
      purpose: 'Bone health',
      duration: 'long_term',
      startDate: now,
      endDate: null,
      notes: null,
      status: 'active',
    });

    return { ok: true };
  }
}
