import {
  Controller,
  Post,
  Body,
  ForbiddenException,
  HttpCode,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { AuthService } from './auth.service';
import {
  ServiceType,
  ServiceTypeDocument,
} from '../../common/models/service-type.model';
import {
  ScheduledSession,
  ScheduledSessionDocument,
} from '../../common/models/scheduled-session.model';
import { User, UserDocument } from '../../common/models/user.model';
import {
  BodyTest,
  BodyTestDocument,
} from '../../common/models/body-test.model';
import { CheckIn, CheckInDocument } from '../../common/models/check-in.model';
import {
  MemberInjury,
  MemberInjuryDocument,
} from '../../common/models/member-injury.model';
import {
  MemberMedication,
  MemberMedicationDocument,
} from '../../common/models/member-medication.model';

class SeedUserRoleDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsIn(['owner', 'trainer', 'member'])
  role: 'owner' | 'trainer' | 'member';

  @IsOptional()
  @IsBoolean()
  seedBilling?: boolean;

  @IsOptional()
  @IsBoolean()
  seedMembers?: boolean;

  @IsOptional()
  @IsBoolean()
  seedPhotos?: boolean;
}

/**
 * Dev/test-only routes for E2E test setup.
 * This controller is ONLY registered when NODE_ENV !== 'production'
 * (see auth.module.ts). It is absent from the production binary.
 */
@Controller('auth/dev')
export class AuthDevController {
  constructor(
    private readonly authService: AuthService,
    @InjectModel(ServiceType.name)
    private readonly serviceTypeModel: Model<ServiceTypeDocument>,
    @InjectModel(ScheduledSession.name)
    private readonly sessionModel: Model<ScheduledSessionDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(BodyTest.name)
    private readonly bodyTestModel: Model<BodyTestDocument>,
    @InjectModel(CheckIn.name)
    private readonly checkInModel: Model<CheckInDocument>,
    @InjectModel(MemberInjury.name)
    private readonly injuryModel: Model<MemberInjuryDocument>,
    @InjectModel(MemberMedication.name)
    private readonly medicationModel: Model<MemberMedicationDocument>,
  ) {}

  @HttpCode(200)
  @Post('reset-token')
  async createResetToken(@Body() body: { email: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }
    const token = await this.authService.createDevResetToken(body.email);
    return { token };
  }

  @HttpCode(200)
  @Post('seed-user')
  async seedUser(@Body() body: { email: string; password: string }) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }
    await this.authService.seedTestUser(body.email, body.password, 'member');
    return { ok: true };
  }

  @HttpCode(200)
  @Post('seed-user-role')
  async seedUserRole(@Body() dto: SeedUserRoleDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }
    await this.authService.seedTestUser(dto.email, dto.password, dto.role);

    if (dto.seedBilling) {
      await this.seedBillingData(dto.email, dto.role);
    }

    if (dto.seedMembers) {
      await this.seedMembersData(dto.email, dto.role, dto.seedPhotos !== false);
    }

    return { ok: true };
  }

  private async seedBillingData(
    userEmail: string,
    role: 'owner' | 'trainer' | 'member',
  ) {
    const user = await this.userModel.findOne({ email: userEmail }).lean();
    if (!user) return;

    const userId = user._id;

    // Resolve trainer id: member needs a trainer assigned; owner/trainer seeds use self
    let trainerId: Types.ObjectId;
    let memberIds: Types.ObjectId[];

    if (role === 'member') {
      // Seed a trainer to own the session
      const trainerEmail = `seed-trainer-for-${userEmail}`;
      await this.authService.seedTestUser(
        trainerEmail,
        'TrainerPass123!',
        'trainer',
      );
      const trainer = await this.userModel
        .findOne({ email: trainerEmail })
        .lean();
      if (!trainer) return;
      trainerId = trainer._id;
      memberIds = [userId];

      // Link member to trainer
      await this.userModel.updateOne({ _id: userId }, { trainerId });
    } else {
      // Owner or trainer: seed a member and use self as trainer
      trainerId = userId;
      const memberEmail = `seed-member-for-${userEmail}`;
      await this.authService.seedTestUser(
        memberEmail,
        'MemberPass123!',
        'member',
      );
      const member = await this.userModel
        .findOne({ email: memberEmail })
        .lean();
      if (!member) return;
      const memberId = member._id;
      await this.userModel.updateOne({ _id: memberId }, { trainerId: userId });
      memberIds = [memberId];
    }

    // Create a service type owned by the trainer/owner
    const serviceType = await this.serviceTypeModel.create({
      name: 'Test Session',
      durationMin: 60,
      pricePerSession: 100,
      currency: 'AUD',
      note: null,
      isActive: true,
      createdBy: trainerId,
    });

    // Create a billable session in the current month (yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(9, 0, 0, 0);

    await this.sessionModel.create({
      seriesId: null,
      trainerId,
      memberIds,
      date: yesterday,
      startTime: '09:00',
      endTime: '10:00',
      status: 'scheduled',
      serviceTypeId: serviceType._id,
      customServiceName: null,
      customFee: null,
      reminderSentAt: null,
    });
  }

  private async seedMembersData(
    userEmail: string,
    role: 'owner' | 'trainer' | 'member',
    withPhotos = true,
  ) {
    if (role === 'member') return;

    const user = await this.userModel.findOne({ email: userEmail }).lean();
    if (!user) return;

    const userId = user._id;

    // Seed a named member assigned to this owner/trainer
    const memberEmail = `seed-members-member-for-${userEmail}`;
    await this.authService.seedTestUser(
      memberEmail,
      'MemberPass123!',
      'member',
    );
    const member = await this.userModel.findOne({ email: memberEmail }).lean();
    if (!member) return;

    const memberId = member._id;
    await this.userModel.updateOne(
      { _id: memberId },
      { trainerId: userId, firstName: 'Seeded', lastName: 'Member' },
    );

    // Body test
    await this.bodyTestModel.create({
      memberId,
      trainerId: userId,
      date: new Date(),
      age: 30,
      sex: 'male',
      weight: 80,
      protocol: 'other',
      bodyFatPct: 18,
      fatMassKg: 14.4,
      leanMassKg: 65.6,
      targetWeight: null,
      targetBodyFatPct: null,
    });

    // Check-in (photos array is populated when withPhotos is true, for E2E test coverage)
    await this.checkInModel.create({
      memberId,
      trainerId: userId,
      submittedAt: new Date(),
      sleepQuality: 7,
      stress: 4,
      fatigue: 5,
      hunger: 6,
      recovery: 7,
      energy: 6,
      digestion: 8,
      stuckToDiet: 'yes',
      weight: 80,
      photos: withPhotos
        ? ['https://via.placeholder.com/400x400.png?text=Check-in+Photo']
        : [],
    });

    // Active injury
    await this.injuryModel.create({
      memberId,
      title: 'Seeded Knee Injury',
      status: 'active',
      createdByRole: 'trainer',
    });

    // Active medication
    await this.medicationModel.create({
      memberId,
      name: 'Seeded Medication',
      purpose: 'Test medication',
      duration: 'short_term',
      startDate: new Date(),
      endDate: null,
      status: 'active',
    });
  }
}
