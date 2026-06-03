import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Post,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import {
  ScheduledSession,
  ScheduledSessionDocument,
} from '../../common/models/scheduled-session.model';
import { User, UserDocument } from '../../common/models/user.model';
import {
  ServiceType,
  ServiceTypeDocument,
} from '../../common/models/service-type.model';
import { SeedSessionsDto } from './dto/seed-sessions.dto';

/**
 * Dev/test-only routes for E2E test setup.
 * Only registered when NODE_ENV !== 'production' (see scheduled-sessions.module.ts).
 */
@Controller('scheduled-sessions/dev')
export class ScheduledSessionsDevController {
  constructor(
    @InjectModel(ScheduledSession.name)
    private readonly sessionModel: Model<ScheduledSessionDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(ServiceType.name)
    private readonly serviceTypeModel: Model<ServiceTypeDocument>,
  ) {}

  @HttpCode(200)
  @Post('seed')
  async seed(@Body() dto: SeedSessionsDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException();
    }

    const member = await this.userModel
      .findOne({ email: dto.memberEmail })
      .lean();
    if (!member) {
      throw new ForbiddenException(`Member not found: ${dto.memberEmail}`);
    }

    const memberObjId = member._id;

    for (const item of dto.sessions) {
      let trainerObjId: Types.ObjectId;

      if (item.trainerEmail) {
        const trainer = await this.userModel
          .findOne({ email: item.trainerEmail })
          .lean();
        if (!trainer) {
          const hash = await bcrypt.hash('TrainerPass123!', 10);
          const created = await this.userModel.create({
            firstName: 'Seed',
            lastName: 'Trainer',
            email: item.trainerEmail,
            passwordHash: hash,
            role: 'trainer',
            trainerId: null,
          });
          trainerObjId = created._id;
        } else {
          trainerObjId = trainer._id;
        }
        // Link member to trainer if not already set
        await this.userModel.updateOne(
          { _id: memberObjId, trainerId: null },
          { trainerId: trainerObjId },
        );
      } else {
        // Use existing trainerId or fall back to a default seed trainer
        const freshMember = await this.userModel.findById(memberObjId).lean();
        if (freshMember?.trainerId) {
          trainerObjId = freshMember.trainerId;
        } else {
          const defaultTrainerEmail = `seed-trainer-for-${dto.memberEmail}`;
          const defaultTrainer = await this.userModel
            .findOne({ email: defaultTrainerEmail })
            .lean();
          if (!defaultTrainer) {
            const hash = await bcrypt.hash('TrainerPass123!', 10);
            const created = await this.userModel.create({
              firstName: 'Default',
              lastName: 'Trainer',
              email: defaultTrainerEmail,
              passwordHash: hash,
              role: 'trainer',
              trainerId: null,
            });
            trainerObjId = created._id;
          } else {
            trainerObjId = defaultTrainer._id;
          }
          await this.userModel.updateOne(
            { _id: memberObjId },
            { trainerId: trainerObjId },
          );
        }
      }

      let serviceTypeId: Types.ObjectId | null = null;
      if (item.serviceTypeName) {
        const st = await this.serviceTypeModel.create({
          name: item.serviceTypeName,
          durationMin: 60,
          pricePerSession: 0,
          currency: 'AUD',
          note: null,
          isActive: true,
          createdBy: trainerObjId,
        });
        serviceTypeId = st._id;
      }

      await this.sessionModel.create({
        seriesId: null,
        trainerId: trainerObjId,
        memberIds: [memberObjId],
        date: new Date(item.date),
        startTime: item.startTime,
        endTime: item.endTime,
        status: item.status ?? 'scheduled',
        serviceTypeId,
        customServiceName: item.customServiceName ?? null,
        customFee: null,
        reminderSentAt: null,
      });
    }

    return { ok: true };
  }
}
