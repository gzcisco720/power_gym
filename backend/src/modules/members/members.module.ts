import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { User, UserSchema } from '../../common/models/user.model';
import { BodyTest, BodyTestSchema } from '../../common/models/body-test.model';
import { CheckIn, CheckInSchema } from '../../common/models/check-in.model';
import {
  MemberInjury,
  MemberInjurySchema,
} from '../../common/models/member-injury.model';
import {
  MemberMedication,
  MemberMedicationSchema,
} from '../../common/models/member-medication.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: BodyTest.name, schema: BodyTestSchema },
      { name: CheckIn.name, schema: CheckInSchema },
      { name: MemberInjury.name, schema: MemberInjurySchema },
      { name: MemberMedication.name, schema: MemberMedicationSchema },
    ]),
  ],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
