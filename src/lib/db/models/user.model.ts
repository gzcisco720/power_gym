import mongoose, { Document, Model, Schema } from 'mongoose';
import type { UserRole } from '@/types/auth';

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  trainerId: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'trainer', 'member'], required: true },
    trainerId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: { virtuals: true } },
);

UserSchema.virtual('name').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.index({ role: 1, trainerId: 1 });

export const UserModel: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);
