import mongoose, { Document, Model, Schema } from 'mongoose';

export type EquipmentStatus = 'active' | 'maintenance' | 'retired';

export interface IEquipment extends Document {
  name: string;
  status: EquipmentStatus;
  brand: string | null;
  quantity: number;
  images: string[];
  note: string | null;
  trackCondition: boolean;
  createdAt: Date;
}

const EquipmentSchema = new Schema<IEquipment>(
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
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const EquipmentModel: Model<IEquipment> =
  mongoose.models.Equipment ?? mongoose.model<IEquipment>('Equipment', EquipmentSchema);
