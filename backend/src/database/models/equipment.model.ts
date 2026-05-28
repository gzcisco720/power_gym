import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';

export type EquipmentStatus = 'active' | 'maintenance' | 'retired';

export interface IEquipment extends Document {
  _id: Types.ObjectId;
  name: string;
  status: EquipmentStatus;
  brand: string | null;
  quantity: number;
  images: string[];
  note: string | null;
  trackCondition: boolean;
  nextServiceDate: Date | null;
  createdAt: Date;
}

export const EQUIPMENT_MODEL = 'Equipment';

export const EquipmentSchema = new Schema<IEquipment>(
  {
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'retired'],
      default: 'active',
    },
    brand: { type: String, default: null, trim: true },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    images: { type: [String], default: [] },
    note: { type: String, default: null, trim: true },
    trackCondition: { type: Boolean, default: false },
    nextServiceDate: { type: Date, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
