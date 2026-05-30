import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  BODY_TEST_MODEL,
  BodyTestSchema,
} from '../database/models/body-test.model';
import { USER_MODEL, UserSchema } from '../database/models/user.model';
import { BodyTestRepository } from '../repositories/body-test.repository';
import { UserRepository } from '../repositories/user.repository';
import { BodyTestsService } from './body-tests.service';
import {
  BodyTestsController,
  MeBodyTestsController,
} from './body-tests.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BODY_TEST_MODEL, schema: BodyTestSchema },
      { name: USER_MODEL, schema: UserSchema },
    ]),
  ],
  controllers: [MeBodyTestsController, BodyTestsController],
  providers: [BodyTestsService, BodyTestRepository, UserRepository],
})
export class BodyTestsModule {}
