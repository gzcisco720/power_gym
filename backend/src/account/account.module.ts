import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_MODEL, UserSchema } from '../database/models/user.model';
import {
  USER_PROFILE_MODEL,
  UserProfileSchema,
} from '../database/models/user-profile.model';
import { UserRepository } from '../repositories/user.repository';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: USER_MODEL, schema: UserSchema },
      { name: USER_PROFILE_MODEL, schema: UserProfileSchema },
    ]),
  ],
  controllers: [AccountController],
  providers: [AccountService, UserRepository, UserProfileRepository],
})
export class AccountModule {}
