import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PregnancyStatus =
  | 'n/a'
  | 'not_pregnant'
  | 'pregnant'
  | 'postpartum';

export type MemberMedicalHistoryDocument =
  HydratedDocument<MemberMedicalHistory>;

@Schema({ timestamps: { createdAt: false, updatedAt: true } })
export class MemberMedicalHistory {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  memberId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  chronicConditions: string[];

  @Prop({ type: String, default: null })
  surgeries: string | null;

  @Prop({ type: String, default: null })
  allergies: string | null;

  @Prop({ type: String, default: null })
  familyHistory: string | null;

  @Prop({ type: String, default: null })
  currentDoctor: string | null;

  @Prop({ type: String, default: null })
  emergencyContact: string | null;

  @Prop({
    type: String,
    enum: ['n/a', 'not_pregnant', 'pregnant', 'postpartum'],
    default: null,
  })
  pregnancyStatus: PregnancyStatus | null;
}

export const MemberMedicalHistorySchema =
  SchemaFactory.createForClass(MemberMedicalHistory);
