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
import { IsEmail, IsString } from 'class-validator';
import { User, UserDocument } from '../../common/models/user.model';
import { CheckIn, CheckInDocument } from '../../common/models/check-in.model';

class SeedCheckInsDto {
  @IsEmail()
  memberEmail: string;

  @IsString()
  memberPassword?: string;
}

/**
 * Dev/test-only routes for E2E test setup.
 * Only registered when NODE_ENV !== 'production' (see check-ins.module.ts).
 */
@Controller('check-ins/dev')
export class CheckInsDevController {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(CheckIn.name)
    private readonly checkInModel: Model<CheckInDocument>,
  ) {}

  @HttpCode(200)
  @Post('seed')
  async seed(@Body() dto: SeedCheckInsDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }

    const member = await this.userModel
      .findOne({ email: dto.memberEmail })
      .lean();
    if (!member) {
      throw new NotFoundException(`Member not found: ${dto.memberEmail}`);
    }

    const memberId = member._id as Types.ObjectId;
    // Use a fake trainer id (the member themselves, or any ObjectId)
    const trainerId = memberId;

    const now = new Date();

    // Seed 3 check-ins across consecutive weeks — triggers streak and compare sections.
    // Most recent: this week, with body metrics and a photo URL.
    // Second: 1 week ago, with different metrics.
    // Third: 2 weeks ago, no body metrics.

    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const checkIns = [
      {
        memberId,
        trainerId,
        submittedAt: new Date(now.getTime()),
        sleepQuality: 8,
        energy: 7,
        recovery: 8,
        stress: 4,
        fatigue: 4,
        hunger: 6,
        digestion: 8,
        weight: 80.5,
        waist: 85,
        steps: 8000,
        exerciseMinutes: 45,
        walkRunDistance: null,
        sleepHours: 7.5,
        stuckToDiet: 'yes' as const,
        dietDetails: '',
        wellbeing: '',
        notes: '',
        photos: ['https://via.placeholder.com/300x400'],
      },
      {
        memberId,
        trainerId,
        submittedAt: new Date(now.getTime() - weekMs),
        sleepQuality: 7,
        energy: 6,
        recovery: 7,
        stress: 5,
        fatigue: 5,
        hunger: 6,
        digestion: 7,
        weight: 81.0,
        waist: 86,
        steps: 7500,
        exerciseMinutes: 40,
        walkRunDistance: null,
        sleepHours: 7.0,
        stuckToDiet: 'partial' as const,
        dietDetails: '',
        wellbeing: '',
        notes: '',
        photos: [],
      },
      {
        memberId,
        trainerId,
        submittedAt: new Date(now.getTime() - 2 * weekMs),
        sleepQuality: 6,
        energy: 5,
        recovery: 6,
        stress: 6,
        fatigue: 6,
        hunger: 5,
        digestion: 6,
        weight: null,
        waist: null,
        steps: null,
        exerciseMinutes: null,
        walkRunDistance: null,
        sleepHours: null,
        stuckToDiet: 'no' as const,
        dietDetails: '',
        wellbeing: '',
        notes: '',
        photos: [],
      },
    ];

    await this.checkInModel.insertMany(checkIns);

    return { ok: true, count: checkIns.length };
  }
}
