import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IServiceType extends Document {
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const ServiceTypeSchema = new Schema<IServiceType>(
  {
    name: { type: String, required: true, trim: true },
    durationMin: { type: Number, required: true, min: 1 },
    pricePerSession: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'CNY' },
    isActive: { type: Boolean, required: true, default: true },
    createdBy: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ServiceTypeSchema.index({ isActive: 1 });

export const ServiceTypeModel: Model<IServiceType> =
  mongoose.models.ServiceType ??
  mongoose.model<IServiceType>('ServiceType', ServiceTypeSchema);
