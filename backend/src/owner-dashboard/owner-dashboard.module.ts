import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_MODEL, UserSchema } from '../database/models/user.model';
import {
  INVITE_TOKEN_MODEL,
  InviteTokenSchema,
} from '../database/models/invite-token.model';
import {
  WORKOUT_SESSION_MODEL,
  WorkoutSessionSchema,
} from '../database/models/workout-session.model';
import {
  EQUIPMENT_MODEL,
  EquipmentSchema,
} from '../database/models/equipment.model';
import { UserRepository } from '../repositories/user.repository';
import { InviteRepository } from '../repositories/invite.repository';
import { WorkoutSessionRepository } from '../repositories/workout-session.repository';
import { EquipmentRepository } from '../repositories/equipment.repository';
import { CheckInRepository } from '../repositories/check-in.repository';
import {
  CHECK_IN_MODEL,
  CheckInSchema,
} from '../database/models/check-in.model';
import { OwnerDashboardController } from './owner-dashboard.controller';
import { OwnerDashboardService } from './owner-dashboard.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: USER_MODEL, schema: UserSchema },
      { name: INVITE_TOKEN_MODEL, schema: InviteTokenSchema },
      { name: WORKOUT_SESSION_MODEL, schema: WorkoutSessionSchema },
      { name: EQUIPMENT_MODEL, schema: EquipmentSchema },
      { name: CHECK_IN_MODEL, schema: CheckInSchema },
    ]),
  ],
  controllers: [OwnerDashboardController],
  providers: [
    OwnerDashboardService,
    UserRepository,
    InviteRepository,
    WorkoutSessionRepository,
    EquipmentRepository,
    CheckInRepository,
  ],
})
export class OwnerDashboardModule {}
