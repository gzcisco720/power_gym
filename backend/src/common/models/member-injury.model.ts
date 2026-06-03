import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InjuryStatus = 'active' | 'resolved';
export type InjuryType = 'acute' | 'chronic' | 'post_surgery';
export type BodyPart =
  | 'knee'
  | 'shoulder'
  | 'lower_back'
  | 'hip'
  | 'ankle'
  | 'wrist'
  | 'neck'
  | 'other';
export type BodySide = 'left' | 'right' | 'bilateral';
export type RehabStatus = 'not_started' | 'in_progress' | 'cleared';
export type CreatedByRole = 'trainer' | 'member';

export type MemberInjuryDocument = HydratedDocument<MemberInjury>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class MemberInjury {
  @Prop({ type: Types.ObjectId, required: true })
  memberId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, enum: ['active', 'resolved'], default: 'active' })
  status: InjuryStatus;

  @Prop({ type: Date, default: () => new Date() })
  recordedAt: Date;

  @Prop({ type: String, default: null })
  trainerNotes: string | null;

  @Prop({ type: String, default: null })
  memberNotes: string | null;

  @Prop({ type: String, default: null })
  affectedMovements: string | null;

  @Prop({
    type: String,
    enum: ['acute', 'chronic', 'post_surgery'],
    default: null,
  })
  injuryType: InjuryType | null;

  @Prop({
    type: String,
    enum: [
      'knee',
      'shoulder',
      'lower_back',
      'hip',
      'ankle',
      'wrist',
      'neck',
      'other',
    ],
    default: null,
  })
  bodyPart: BodyPart | null;

  @Prop({ type: String, enum: ['left', 'right', 'bilateral'], default: null })
  bodySide: BodySide | null;

  @Prop({ type: Number, min: 0, max: 10, default: null })
  painAtRest: number | null;

  @Prop({ type: Number, min: 0, max: 10, default: null })
  painDuringExercise: number | null;

  @Prop({ type: String, default: null })
  mechanism: string | null;

  @Prop({ type: String, default: null })
  aggravatingFactors: string | null;

  @Prop({ type: String, default: null })
  relievingFactors: string | null;

  @Prop({ type: Boolean, default: false })
  seenDoctor: boolean;

  @Prop({ type: String, default: null })
  doctorRestrictions: string | null;

  @Prop({
    type: String,
    enum: ['not_started', 'in_progress', 'cleared'],
    default: null,
  })
  rehabilitationStatus: RehabStatus | null;

  @Prop({ type: Date, default: null })
  resolvedAt: Date | null;

  @Prop({ type: String, enum: ['trainer', 'member'], default: 'trainer' })
  createdByRole: CreatedByRole;
}

export const MemberInjurySchema = SchemaFactory.createForClass(MemberInjury);
MemberInjurySchema.index({ memberId: 1, recordedAt: -1 });
