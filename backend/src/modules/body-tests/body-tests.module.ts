import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BodyTestsController } from './body-tests.controller';
import { BodyTestsService } from './body-tests.service';
import { BodyTest, BodyTestSchema } from '../../common/models/body-test.model';
import { User, UserSchema } from '../../common/models/user.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BodyTest.name, schema: BodyTestSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BodyTestsController],
  providers: [BodyTestsService],
})
export class BodyTestsModule {}
