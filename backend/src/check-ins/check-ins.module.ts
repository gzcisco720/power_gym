import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CHECK_IN_MODEL,
  CheckInSchema,
} from '../database/models/check-in.model';
import {
  CHECK_IN_CONFIG_MODEL,
  CheckInConfigSchema,
} from '../database/models/check-in-config.model';
import { CheckInRepository } from '../repositories/check-in.repository';
import { CheckInConfigRepository } from '../repositories/check-in-config.repository';
import { UsersModule } from '../users/users.module';
import { CheckInsController } from './check-ins.controller';
import { CheckInsService } from './check-ins.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CHECK_IN_MODEL, schema: CheckInSchema },
      { name: CHECK_IN_CONFIG_MODEL, schema: CheckInConfigSchema },
    ]),
    UsersModule,
  ],
  controllers: [CheckInsController],
  providers: [CheckInsService, CheckInRepository, CheckInConfigRepository],
})
export class CheckInsModule {}
