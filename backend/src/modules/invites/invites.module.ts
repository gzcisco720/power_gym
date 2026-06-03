import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import {
  InviteToken,
  InviteTokenSchema,
} from '../../common/models/invite-token.model';
import { User, UserSchema } from '../../common/models/user.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InviteToken.name, schema: InviteTokenSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
