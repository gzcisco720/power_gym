import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ConditionReportDocument = HydratedDocument<ConditionReport>;

@Schema({ collection: 'conditionreports', timestamps: false })
export class ConditionReport {
  @Prop({ type: Types.ObjectId, ref: 'Equipment', required: true })
  equipmentId: Types.ObjectId;

  @Prop({ type: String, required: true, trim: true })
  note: string;

  @Prop({ type: Date, default: () => new Date() })
  reportedAt: Date;
}

export const ConditionReportSchema =
  SchemaFactory.createForClass(ConditionReport);

ConditionReportSchema.index({ equipmentId: 1, reportedAt: -1 });
