import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BODY_TEST_MODEL,
  BodyTestSchema,
} from '../database/models/body-test.model';
import { BodyTestRepository } from '../repositories/body-test.repository';
import { BodyTestsService } from './body-tests.service';
import {
  BodyTestsController,
  MeBodyTestsController,
} from './body-tests.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BODY_TEST_MODEL, schema: BodyTestSchema },
    ]),
  ],
  controllers: [MeBodyTestsController, BodyTestsController],
  providers: [BodyTestsService, BodyTestRepository],
})
export class BodyTestsModule {}
