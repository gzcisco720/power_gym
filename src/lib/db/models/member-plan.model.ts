import mongoose, { Document, Model, Schema } from 'mongoose';
import type { IPlanDay, IPlanDayExercise } from './plan-template.model';

export interface IMemberPlan extends Document {
  memberId: mongoose.Types.ObjectId;
  trainerId: mongoose.Types.ObjectId;
  templateId: mongoose.Types.ObjectId;
  name: string;
  days: IPlanDay[];
  isActive: boolean;
  assignedAt: Date;
}

const MemberPlanDayExerciseSchema = new Schema<IPlanDayExercise>(
  {
    groupId: { type: String, required: true },
    isSuperset: { type: Boolean, required: true, default: false },
    exerciseId: { type: Schema.Types.ObjectId, required: true },
    exerciseName: { type: String, required: true },
    imageUrl: { type: String, default: null },
    isBodyweight: { type: Boolean, required: true, default: false },
    sets: { type: Number, required: true },
    repsMin: { type: Number, required: true },
    repsMax: { type: Number, required: true },
    restSeconds: { type: Number, default: null },
  },
  { _id: false },
);

const MemberPlanDaySchema = new Schema<IPlanDay>(
  {
    dayNumber: { type: Number, required: true },
    name: { type: String, required: true },
    exercises: [MemberPlanDayExerciseSchema],
  },
  { _id: false },
);

const MemberPlanSchema = new Schema<IMemberPlan>(
  {
    memberId: { type: Schema.Types.ObjectId, required: true },
    trainerId: { type: Schema.Types.ObjectId, required: true },
    templateId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    days: [MemberPlanDaySchema],
    isActive: { type: Boolean, required: true, default: true },
    assignedAt: { type: Date, required: true },
  },
  { timestamps: false },
);

MemberPlanSchema.index({ memberId: 1, isActive: 1 });

export const MemberPlanModel: Model<IMemberPlan> =
  mongoose.models.MemberPlan ??
  mongoose.model<IMemberPlan>('MemberPlan', MemberPlanSchema);
