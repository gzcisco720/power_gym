import mongoose, { Document, Model, Schema } from 'mongoose';

export type InjuryStatus = 'active' | 'resolved';
export type InjuryType = 'acute' | 'chronic' | 'post_surgery';
export type BodyPart = 'knee' | 'shoulder' | 'lower_back' | 'hip' | 'ankle' | 'wrist' | 'neck' | 'other';
export type BodySide = 'left' | 'right' | 'bilateral';
export type RehabStatus = 'not_started' | 'in_progress' | 'cleared';
export type CreatedByRole = 'trainer' | 'member';

export interface IMemberInjury extends Document {
  memberId: mongoose.Types.ObjectId;
  title: string;
  status: InjuryStatus;
  recordedAt: Date;
  trainerNotes: string | null;
  memberNotes: string | null;
  affectedMovements: string | null;
  injuryType: InjuryType | null;
  bodyPart: BodyPart | null;
  bodySide: BodySide | null;
  painAtRest: number | null;
  painDuringExercise: number | null;
  mechanism: string | null;
  aggravatingFactors: string | null;
  relievingFactors: string | null;
  seenDoctor: boolean;
  doctorRestrictions: string | null;
  rehabilitationStatus: RehabStatus | null;
  resolvedAt: Date | null;
  createdByRole: CreatedByRole;
  createdAt: Date;
}

const MemberInjurySchema = new Schema<IMemberInjury>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'resolved'], default: 'active' },
    recordedAt: { type: Date, default: () => new Date() },
    trainerNotes: { type: String, default: null },
    memberNotes: { type: String, default: null },
    affectedMovements: { type: String, default: null },
    injuryType: { type: String, enum: ['acute', 'chronic', 'post_surgery'], default: null },
    bodyPart: { type: String, enum: ['knee', 'shoulder', 'lower_back', 'hip', 'ankle', 'wrist', 'neck', 'other'], default: null },
    bodySide: { type: String, enum: ['left', 'right', 'bilateral'], default: null },
    painAtRest: { type: Number, min: 0, max: 10, default: null },
    painDuringExercise: { type: Number, min: 0, max: 10, default: null },
    mechanism: { type: String, default: null },
    aggravatingFactors: { type: String, default: null },
    relievingFactors: { type: String, default: null },
    seenDoctor: { type: Boolean, default: false },
    doctorRestrictions: { type: String, default: null },
    rehabilitationStatus: { type: String, enum: ['not_started', 'in_progress', 'cleared'], default: null },
    resolvedAt: { type: Date, default: null },
    createdByRole: { type: String, enum: ['trainer', 'member'], default: 'trainer', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

MemberInjurySchema.index({ memberId: 1, recordedAt: -1 });

export const MemberInjuryModel: Model<IMemberInjury> =
  mongoose.models.MemberInjury ??
  mongoose.model<IMemberInjury>('MemberInjury', MemberInjurySchema);
