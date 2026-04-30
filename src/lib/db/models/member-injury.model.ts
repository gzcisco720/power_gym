import mongoose, { Document, Model, Schema } from 'mongoose';

export type InjuryStatus = 'active' | 'resolved';

export interface IMemberInjury extends Document {
  memberId: mongoose.Types.ObjectId;
  title: string;
  status: InjuryStatus;
  recordedAt: Date;
  trainerNotes: string | null;
  memberNotes: string | null;
  affectedMovements: string | null;
  createdAt: Date;
}

const MemberInjurySchema = new Schema<IMemberInjury>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'resolved'],
      default: 'active',
    },
    recordedAt: { type: Date, default: () => new Date() },
    trainerNotes: { type: String, default: null },
    memberNotes: { type: String, default: null },
    affectedMovements: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const MemberInjuryModel: Model<IMemberInjury> =
  mongoose.models.MemberInjury ??
  mongoose.model<IMemberInjury>('MemberInjury', MemberInjurySchema);
