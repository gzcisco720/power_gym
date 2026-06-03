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
}
