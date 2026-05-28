import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PERSONAL_BEST_MODEL,
  PersonalBestSchema,
} from '../database/models/personal-best.model';
import { UsersModule } from '../users/users.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PERSONAL_BEST_MODEL, schema: PersonalBestSchema },
    ]),
    UsersModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
})
export class ProgressModule {}
