import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardController } from './dashboard.controller';
import { OwnerDashboardService } from './owner-dashboard.service';
import { User, UserSchema } from '../../common/models/user.model';
import {
  WorkoutSession,
  WorkoutSessionSchema,
} from '../../common/models/workout-session.model';
import { CheckIn, CheckInSchema } from '../../common/models/check-in.model';
import {
  Equipment,
  EquipmentSchema,
} from '../../common/models/equipment.model';
import {
  InviteToken,
  InviteTokenSchema,
} from '../../common/models/invite-token.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: WorkoutSession.name, schema: WorkoutSessionSchema },
      { name: CheckIn.name, schema: CheckInSchema },
      { name: Equipment.name, schema: EquipmentSchema },
      { name: InviteToken.name, schema: InviteTokenSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [OwnerDashboardService],
})
export class DashboardModule {}
