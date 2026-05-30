import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CHECK_IN_MODEL,
  CheckInSchema,
} from '../database/models/check-in.model';
import { USER_MODEL, UserSchema } from '../database/models/user.model';
import { CheckInRepository } from '../repositories/check-in.repository';
import { UserRepository } from '../repositories/user.repository';
import { CheckInsService } from './check-ins.service';
import {
  CheckInsController,
  CheckInDetailController,
} from './check-ins.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CHECK_IN_MODEL, schema: CheckInSchema },
      { name: USER_MODEL, schema: UserSchema },
    ]),
  ],
  controllers: [CheckInsController, CheckInDetailController],
  providers: [CheckInsService, CheckInRepository, UserRepository],
})
export class CheckInsModule {}
