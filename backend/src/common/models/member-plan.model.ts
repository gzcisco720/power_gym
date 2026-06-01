import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type MemberPlanDocument = HydratedDocument<MemberPlan>;

// Minimal sub-schemas matching web/src/lib/db/models/plan-template.model.ts
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

@Schema({ timestamps: false })
export class MemberPlan {
  @Prop({ type: Types.ObjectId, required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  trainerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  templateId: Types.ObjectId;

  @Prop({ type: String, required: true })
  name: string;

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

  @Prop({ type: Boolean, required: true, default: true })
  isActive: boolean;

  @Prop({ type: Date, required: true })
  assignedAt: Date;
}

export const MemberPlanSchema = SchemaFactory.createForClass(MemberPlan);
MemberPlanSchema.index({ memberId: 1, isActive: 1 });
