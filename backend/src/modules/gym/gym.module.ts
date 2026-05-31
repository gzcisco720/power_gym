import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GymController } from './gym.controller';
import { GymService } from './gym.service';
import { User, UserSchema } from '../../common/models/user.model';
import {
  UserProfile,
  UserProfileSchema,
} from '../../common/models/user-profile.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserProfile.name, schema: UserProfileSchema },
    ]),
  ],
  controllers: [GymController],
  providers: [GymService],
})
export class GymModule {}
