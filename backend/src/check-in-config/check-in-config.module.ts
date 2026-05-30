import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CHECK_IN_CONFIG_MODEL,
  CheckInConfigSchema,
} from '../database/models/check-in-config.model';
import { USER_MODEL, UserSchema } from '../database/models/user.model';
import { CheckInConfigRepository } from '../repositories/check-in-config.repository';
import { UserRepository } from '../repositories/user.repository';
import { CheckInConfigService } from './check-in-config.service';
import { CheckInConfigController } from './check-in-config.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CHECK_IN_CONFIG_MODEL, schema: CheckInConfigSchema },
      { name: USER_MODEL, schema: UserSchema },
    ]),
  ],
  controllers: [CheckInConfigController],
  providers: [CheckInConfigService, CheckInConfigRepository, UserRepository],
})
export class CheckInConfigModule {}
