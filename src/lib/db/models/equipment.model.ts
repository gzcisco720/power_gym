import mongoose, { Document, Model, Schema } from 'mongoose';

export type EquipmentCategory = 'cardio' | 'strength' | 'free_weight' | 'cable' | 'other';
export type EquipmentStatus = 'active' | 'maintenance' | 'retired';

export interface IEquipment extends Document {
  name: string;
  category: EquipmentCategory;
  quantity: number;
  status: EquipmentStatus;
  purchasedAt: Date | null;
  notes: string | null;
  createdAt: Date;
}

const EquipmentSchema = new Schema<IEquipment>(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['cardio', 'strength', 'free_weight', 'cable', 'other'],
      required: true,
      default: 'other',
    },
    quantity: { type: Number, required: true, default: 1, min: 1 },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'retired'],
      required: true,
      default: 'active',
    },
    purchasedAt: { type: Date, default: null },
    notes: { type: String, default: null, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const EquipmentModel: Model<IEquipment> =
  mongoose.models.Equipment ??
  mongoose.model<IEquipment>('Equipment', EquipmentSchema);
