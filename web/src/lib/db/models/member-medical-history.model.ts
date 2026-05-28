import mongoose, { Document, Model, Schema } from 'mongoose';

export type PregnancyStatus = 'n/a' | 'not_pregnant' | 'pregnant' | 'postpartum';

export interface IMemberMedicalHistory extends Document {
  memberId: mongoose.Types.ObjectId;
  chronicConditions: string[];
  surgeries: string | null;
  allergies: string | null;
  familyHistory: string | null;
  currentDoctor: string | null;
  emergencyContact: string | null;
  pregnancyStatus: PregnancyStatus | null;
  updatedAt: Date;
}

const MemberMedicalHistorySchema = new Schema<IMemberMedicalHistory>(
  {
    memberId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    chronicConditions: { type: [String], default: [] },
    surgeries: { type: String, default: null },
    allergies: { type: String, default: null },
    familyHistory: { type: String, default: null },
    currentDoctor: { type: String, default: null },
    emergencyContact: { type: String, default: null },
    pregnancyStatus: {
      type: String,
      enum: ['n/a', 'not_pregnant', 'pregnant', 'postpartum'],
      default: null,
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const MemberMedicalHistoryModel: Model<IMemberMedicalHistory> =
  mongoose.models.MemberMedicalHistory ??
  mongoose.model<IMemberMedicalHistory>('MemberMedicalHistory', MemberMedicalHistorySchema);
