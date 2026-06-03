import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import {
  MemberInjury,
  MemberInjurySchema,
} from '../../common/models/member-injury.model';
import {
  MemberMedication,
  MemberMedicationSchema,
} from '../../common/models/member-medication.model';
import {
  MemberMedicalHistory,
  MemberMedicalHistorySchema,
} from '../../common/models/member-medical-history.model';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MemberInjury.name, schema: MemberInjurySchema },
      { name: MemberMedication.name, schema: MemberMedicationSchema },
      { name: MemberMedicalHistory.name, schema: MemberMedicalHistorySchema },
    ]),
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
