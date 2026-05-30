import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MEMBER_INJURY_MODEL,
  MemberInjurySchema,
} from '../database/models/member-injury.model';
import {
  MEMBER_MEDICAL_HISTORY_MODEL,
  MemberMedicalHistorySchema,
} from '../database/models/member-medical-history.model';
import {
  MEMBER_MEDICATION_MODEL,
  MemberMedicationSchema,
} from '../database/models/member-medication.model';
import { USER_MODEL, UserSchema } from '../database/models/user.model';
import { MemberInjuryRepository } from '../repositories/member-injury.repository';
import { MemberMedicalHistoryRepository } from '../repositories/member-medical-history.repository';
import { MemberMedicationRepository } from '../repositories/member-medication.repository';
import { UserRepository } from '../repositories/user.repository';
import { MemberHealthService } from './member-health.service';
import { MemberHealthController } from './member-health.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MEMBER_INJURY_MODEL, schema: MemberInjurySchema },
      {
        name: MEMBER_MEDICAL_HISTORY_MODEL,
        schema: MemberMedicalHistorySchema,
      },
      { name: MEMBER_MEDICATION_MODEL, schema: MemberMedicationSchema },
      { name: USER_MODEL, schema: UserSchema },
    ]),
  ],
  controllers: [MemberHealthController],
  providers: [
    MemberHealthService,
    MemberInjuryRepository,
    MemberMedicalHistoryRepository,
    MemberMedicationRepository,
    UserRepository,
  ],
})
export class MemberHealthModule {}
