import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type PlanTemplateDocument = HydratedDocument<PlanTemplate>;

const PlanDayExerciseSchema = new MongooseSchema(
  {
    groupId: { type: String, required: true },
    isSuperset: { type: Boolean, required: true, default: false },
    exerciseId: { type: Types.ObjectId, required: true },
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

const PlanDaySchema = new MongooseSchema(
  {
    dayNumber: { type: Number, required: true },
    name: { type: String, required: true },
    exercises: [PlanDayExerciseSchema],
  },
  { _id: false },
);

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class PlanTemplate {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  description: string | null;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [PlanDaySchema], default: [] })
  days: {
    dayNumber: number;
    name: string;
    exercises: {
      groupId: string;
      isSuperset: boolean;
      exerciseId: Types.ObjectId;
      exerciseName: string;
      imageUrl: string | null;
      isBodyweight: boolean;
      sets: number;
      repsMin: number;
      repsMax: number;
      restSeconds: number | null;
    }[];
  }[];
}

export const PlanTemplateSchema = SchemaFactory.createForClass(PlanTemplate);
PlanTemplateSchema.index({ createdBy: 1 });
