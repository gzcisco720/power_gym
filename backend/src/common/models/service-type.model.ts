import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ServiceTypeDocument = HydratedDocument<ServiceType>;

@Schema({
  collection: 'servicetypes',
  timestamps: { createdAt: true, updatedAt: false },
})
export class ServiceType {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: Number, required: true, min: 1 })
  durationMin: number;

  @Prop({ type: Number, required: true, min: 0 })
  pricePerSession: number;

  @Prop({ type: String, required: true, default: 'AUD' })
  currency: string;

  @Prop({ type: String, default: null, trim: true })
  note: string | null;

  @Prop({ type: Boolean, required: true, default: true })
  isActive: boolean;

  @Prop({ type: Types.ObjectId, required: true })
  createdBy: Types.ObjectId;
}

export const ServiceTypeSchema = SchemaFactory.createForClass(ServiceType);
ServiceTypeSchema.index({ isActive: 1 });
