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

// Always re-register in development so schema changes take effect without a full restart.
// In production each cold start loads modules fresh so this is never needed.
if (mongoose.models.Equipment) {
  mongoose.deleteModel('Equipment');
}

export const EquipmentModel: Model<IEquipment> =
  mongoose.model<IEquipment>('Equipment', EquipmentSchema);
