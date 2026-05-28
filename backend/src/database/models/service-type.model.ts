import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export interface IServiceType extends Document {
  _id: Types.ObjectId;
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
  note: string | null;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export const SERVICE_TYPE_MODEL = 'ServiceType';

export const ServiceTypeSchema = new Schema<IServiceType>(
  {
    name: { type: String, required: true, trim: true },
    durationMin: { type: Number, required: true, min: 1 },
    pricePerSession: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'AUD' },
    note: { type: String, default: null },
    isActive: { type: Boolean, required: true, default: true },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ServiceTypeSchema.index({ isActive: 1 });
