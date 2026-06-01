import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PersonalBestDocument = HydratedDocument<PersonalBest>;

@Schema()
export class PersonalBest {
  @Prop({ type: Types.ObjectId, required: true })
  memberId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  exerciseId: Types.ObjectId;

  @Prop({ type: String, required: true })
  exerciseName: string;

  @Prop({ type: Number, required: true })
  bestWeight: number;

  @Prop({ type: Number, required: true })
  bestReps: number;

  @Prop({ type: Number, required: true })
  estimatedOneRM: number;

  @Prop({ type: Date, required: true })
  achievedAt: Date;

  @Prop({ type: Types.ObjectId, required: true })
  sessionId: Types.ObjectId;
}

export const PersonalBestSchema = SchemaFactory.createForClass(PersonalBest);
PersonalBestSchema.index({ memberId: 1, exerciseId: 1 }, { unique: true });
