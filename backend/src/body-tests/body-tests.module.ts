import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BODY_TEST_MODEL,
  BodyTestSchema,
} from '../database/models/body-test.model';
import { BodyTestRepository } from '../repositories/body-test.repository';
import { UsersModule } from '../users/users.module';
import { BodyTestsController } from './body-tests.controller';
import { BodyTestsService } from './body-tests.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BODY_TEST_MODEL, schema: BodyTestSchema },
    ]),
    UsersModule,
  ],
  controllers: [BodyTestsController],
  providers: [BodyTestsService, BodyTestRepository],
})
export class BodyTestsModule {}
