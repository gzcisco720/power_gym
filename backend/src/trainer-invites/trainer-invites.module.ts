import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  INVITE_TOKEN_MODEL,
  InviteTokenSchema,
} from '../database/models/invite-token.model';
import { InviteRepository } from '../repositories/invite.repository';
import { EmailModule } from '../email/email.module';
import { TrainerInvitesController } from './trainer-invites.controller';
import { TrainerInvitesService } from './trainer-invites.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: INVITE_TOKEN_MODEL, schema: InviteTokenSchema },
    ]),
    EmailModule,
  ],
  controllers: [TrainerInvitesController],
  providers: [TrainerInvitesService, InviteRepository],
})
export class TrainerInvitesModule {}
