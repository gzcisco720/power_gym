import mongoose, { Document, Model, Schema } from 'mongoose';
import type { UserRole } from '@/types/auth';

export interface IUserProfile extends Document {
  userId: mongoose.Types.ObjectId;
  role: UserRole | null;
  phone: string | null;
  // member
  sex: 'male' | 'female' | null;
  dateOfBirth: Date | null;
  height: number | null;
  fitnessGoal: 'lose_fat' | 'build_muscle' | 'maintain' | 'improve_performance' | null;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  // trainer
  bio: string | null;
  specializations: string[];
  // owner
  gymName: string | null;
  updatedAt: Date;
}

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    role: { type: String, enum: ['owner', 'trainer', 'member'], default: null },
    phone: { type: String, default: null, trim: true },
    sex: { type: String, enum: ['male', 'female'], default: null },
    dateOfBirth: { type: Date, default: null },
    height: { type: Number, default: null },
    fitnessGoal: {
      type: String,
      enum: ['lose_fat', 'build_muscle', 'maintain', 'improve_performance'],
      default: null,
    },
    fitnessLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: null,
    },
    bio: { type: String, default: null, trim: true },
    specializations: { type: [String], default: [] },
    gymName: { type: String, default: null, trim: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const UserProfileModel: Model<IUserProfile> =
  mongoose.models.UserProfile ??
  mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
