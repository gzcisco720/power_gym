import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WorkoutSessionDocument = HydratedDocument<WorkoutSession>;

@Schema({ _id: false })
class SessionSet {
  @Prop({ type: Types.ObjectId, required: true })
  exerciseId: Types.ObjectId;

  @Prop({ type: String, required: true })
  exerciseName: string;

  @Prop({ type: String, required: true })
  groupId: string;

  @Prop({ type: Boolean, required: true, default: false })
  isSuperset: boolean;

  @Prop({ type: Boolean, required: true, default: false })
  isBodyweight: boolean;

  @Prop({ type: Number, required: true })
  setNumber: number;

  @Prop({ type: Number, required: true })
  prescribedRepsMin: number;

  @Prop({ type: Number, required: true })
  prescribedRepsMax: number;

  @Prop({ type: Boolean, required: true, default: false })
  isExtraSet: boolean;

  @Prop({ type: Number, default: null })
  actualWeight: number | null;

  @Prop({ type: Number, default: null })
  actualReps: number | null;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;
}

@Schema({ timestamps: false })
export class WorkoutSession {
  @Prop({ type: Types.ObjectId, required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  memberPlanId: Types.ObjectId;

  @Prop({ type: Number, required: true })
  dayNumber: number;

  @Prop({ type: String, required: true })
  dayName: string;

  @Prop({ type: Date, required: true })
  startedAt: Date;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;

  @Prop({ type: Date, required: true })
  lastActivityAt: Date;

  @Prop({ type: Boolean, required: true, default: false })
  autoSealed: boolean;

  @Prop({ type: [SchemaFactory.createForClass(SessionSet)], default: [] })
  sets: SessionSet[];

  @Prop({ type: Types.ObjectId, default: null })
  loggedBy: Types.ObjectId | null;

  @Prop({ type: Number, default: null })
  rpe: number | null;

  @Prop({ type: String, default: null })
  memberNote: string | null;
}

export const WorkoutSessionSchema =
  SchemaFactory.createForClass(WorkoutSession);
WorkoutSessionSchema.index({ memberId: 1, startedAt: -1 });
WorkoutSessionSchema.index({ memberId: 1, completedAt: 1 });
WorkoutSessionSchema.index({ completedAt: 1, lastActivityAt: 1 });
