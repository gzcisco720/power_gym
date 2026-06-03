import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CheckInsController } from './check-ins.controller';
import { CheckInsService } from './check-ins.service';
import { CheckIn, CheckInSchema } from '../../common/models/check-in.model';
import { User, UserSchema } from '../../common/models/user.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CheckIn.name, schema: CheckInSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [CheckInsController],
  providers: [CheckInsService],
})
export class CheckInsModule {}
