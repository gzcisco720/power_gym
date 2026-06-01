import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type EquipmentDocument = HydratedDocument<Equipment>;
export type EquipmentStatus = 'active' | 'maintenance' | 'retired';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class Equipment {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    enum: ['active', 'maintenance', 'retired'],
    default: 'active',
  })
  status: EquipmentStatus;

  @Prop({ type: String, default: null, trim: true })
  brand: string | null;

  @Prop({ type: Number, required: true, default: 1, min: 1 })
  quantity: number;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: String, default: null, trim: true })
  note: string | null;

  @Prop({ type: Boolean, default: false })
  trackCondition: boolean;

  @Prop({ type: Date, default: null })
  nextServiceDate: Date | null;
}

export const EquipmentSchema = SchemaFactory.createForClass(Equipment);
