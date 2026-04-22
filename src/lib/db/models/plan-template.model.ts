import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPlanDayExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: mongoose.Types.ObjectId;
  exerciseName: string;
  imageUrl: string | null;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
}

export interface IPlanDay {
  dayNumber: number;
  name: string;
  exercises: IPlanDayExercise[];
}

export interface IPlanTemplate extends Document {
  name: string;
  description: string | null;
  createdBy: mongoose.Types.ObjectId;
  days: IPlanDay[];
  createdAt: Date;
}

const PlanDayExerciseSchema = new Schema<IPlanDayExercise>(
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

const PlanDaySchema = new Schema<IPlanDay>(
  {
    dayNumber: { type: Number, required: true },
    name: { type: String, required: true },
    exercises: [PlanDayExerciseSchema],
  },
  { _id: false },
);

const PlanTemplateSchema = new Schema<IPlanTemplate>(
  {
    name: { type: String, required: true },
    description: { type: String, default: null },
    createdBy: { type: Schema.Types.ObjectId, required: true },
    days: [PlanDaySchema],
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const PlanTemplateModel: Model<IPlanTemplate> =
  mongoose.models.PlanTemplate ??
  mongoose.model<IPlanTemplate>('PlanTemplate', PlanTemplateSchema);
