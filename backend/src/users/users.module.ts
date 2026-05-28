import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { USER_MODEL, UserSchema } from '../database/models/user.model';
import {
  INVITE_TOKEN_MODEL,
  InviteTokenSchema,
} from '../database/models/invite-token.model';
import {
  USER_PROFILE_MODEL,
  UserProfileSchema,
} from '../database/models/user-profile.model';
import { UserRepository } from '../repositories/user.repository';
import { InviteRepository } from '../repositories/invite.repository';
import { UserProfileRepository } from '../repositories/user-profile.repository';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: USER_MODEL, schema: UserSchema },
      { name: INVITE_TOKEN_MODEL, schema: InviteTokenSchema },
      { name: USER_PROFILE_MODEL, schema: UserProfileSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    UserRepository,
    InviteRepository,
    UserProfileRepository,
  ],
  exports: [UsersService, UserRepository, UserProfileRepository],
})
export class UsersModule {}
