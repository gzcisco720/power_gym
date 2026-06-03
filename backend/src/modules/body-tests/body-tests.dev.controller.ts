import {
  Controller,
  Post,
  Body,
  ForbiddenException,
  HttpCode,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IsNotEmpty, IsString } from 'class-validator';
import {
  BodyTest,
  BodyTestDocument,
} from '../../common/models/body-test.model';
import { User, UserDocument } from '../../common/models/user.model';
import { BodyTestsService } from './body-tests.service';

class SeedBodyTestDto {
  @IsString()
  @IsNotEmpty()
  email: string;
}

/**
 * Dev/test-only routes for E2E test setup.
 * This controller is ONLY registered when NODE_ENV !== 'production'
 * (see body-tests.module.ts). It is absent from the production binary.
 */
@Controller('body-tests/dev')
export class BodyTestsDevController {
  constructor(
    private readonly bodyTestsService: BodyTestsService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(BodyTest.name)
    private readonly bodyTestModel: Model<BodyTestDocument>,
  ) {}

  @HttpCode(200)
  @Post('seed-for-user')
  async seedBodyTestForUser(@Body() dto: SeedBodyTestDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }

    const user = await this.userModel.findOne({ email: dto.email });
    if (!user) throw new NotFoundException('User not found');

    const existing = await this.bodyTestModel
      .findOne({ memberId: user._id })
      .sort({ date: -1 });
    if (existing) {
      return { ok: true, seeded: false };
    }

    await this.bodyTestModel.create({
      memberId: new Types.ObjectId(user._id.toString()),
      trainerId: null,
      date: new Date('2026-01-15'),
      age: 30,
      sex: 'male',
      weight: 80,
      protocol: '3site',
      chest: 12,
      abdominal: 18,
      thigh: 14,
      tricep: null,
      subscapular: null,
      suprailiac: null,
      midaxillary: null,
      bicep: null,
      lumbar: null,
      bodyFatPct: 15.3,
      fatMassKg: 12.24,
      leanMassKg: 67.76,
      targetWeight: null,
      targetBodyFatPct: null,
    });

    return { ok: true, seeded: true };
  }
}
