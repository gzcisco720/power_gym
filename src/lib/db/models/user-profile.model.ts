import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IGymInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  logoUrl: string | null;
  loginBgUrl: string | null;
  loginLogoUrl: string | null;
}

export interface IUserProfile extends Document {
  userId: mongoose.Types.ObjectId;
  // common fields (all roles)
  mobile: string | null;
  address: string | null;
  dateOfBirth: Date | null;
  avatarUrl: string | null;
  // member-specific
  sex: 'male' | 'female' | null;
  height: number | null;
  fitnessGoal: 'lose_fat' | 'build_muscle' | 'maintain' | 'improve_performance' | null;
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | null;
  // trainer + owner
  certifications: string[];
  // trainer-specific
  bio: string | null;
  specializations: string[];
  // owner-specific
  gymInfo: IGymInfo | null;
  updatedAt: Date;
}

const GymInfoSchema = new Schema<IGymInfo>(
  {
    name: { type: String, default: null, trim: true },
    address: { type: String, default: null, trim: true },
    phone: { type: String, default: null, trim: true },
    email: { type: String, default: null, trim: true },
    website: { type: String, default: null, trim: true },
    hours: { type: String, default: null, trim: true },
    description: { type: String, default: null, trim: true },
    logoUrl: { type: String, default: null, trim: true },
    loginBgUrl: { type: String, default: null, trim: true },
    loginLogoUrl: { type: String, default: null, trim: true },
  },
  { _id: false },
);

const UserProfileSchema = new Schema<IUserProfile>(
  {
    userId: { type: Schema.Types.ObjectId, required: true, unique: true },
    mobile: { type: String, default: null, trim: true },
    address: { type: String, default: null, trim: true },
    dateOfBirth: { type: Date, default: null },
    avatarUrl: { type: String, default: null },
    sex: { type: String, enum: ['male', 'female'], default: null },
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
    certifications: { type: [String], default: [] },
    bio: { type: String, default: null, trim: true },
    specializations: { type: [String], default: [] },
    gymInfo: { type: GymInfoSchema, default: null },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const UserProfileModel: Model<IUserProfile> =
  mongoose.models.UserProfile ??
  mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
