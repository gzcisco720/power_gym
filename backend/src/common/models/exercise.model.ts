import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ExerciseDocument = HydratedDocument<Exercise>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Exercise {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, default: null })
  muscleGroup: string | null;

  @Prop({ type: Boolean, required: true, default: false })
  isGlobal: boolean;

  @Prop({ type: Types.ObjectId, default: null })
  createdBy: Types.ObjectId | null;

  @Prop({ type: String, default: null })
  imageUrl: string | null;

  @Prop({ type: Boolean, required: true, default: false })
  isBodyweight: boolean;

  @Prop({ type: [Types.ObjectId], default: [] })
  equipmentIds: Types.ObjectId[];

  @Prop({ type: [String], default: [] })
  bodyParts: string[];
}

export const ExerciseSchema = SchemaFactory.createForClass(Exercise);
ExerciseSchema.index({ name: 1, createdBy: 1 }, { unique: true });
ExerciseSchema.index({ isGlobal: 1 });
ExerciseSchema.index({ createdBy: 1 });
