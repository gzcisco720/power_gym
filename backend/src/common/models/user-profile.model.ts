import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserProfileDocument = HydratedDocument<UserProfile>;

// ─── GymInfo sub-schema ───────────────────────────────────────────────────────

@Schema({ _id: false })
export class GymInfo {
  @Prop({ type: String, default: null, trim: true })
  name: string | null;

  @Prop({ type: String, default: null, trim: true })
  address: string | null;

  @Prop({ type: String, default: null, trim: true })
  phone: string | null;

  @Prop({ type: String, default: null, trim: true })
  email: string | null;

  @Prop({ type: String, default: null, trim: true })
  website: string | null;

  @Prop({ type: String, default: null, trim: true })
  hours: string | null;

  @Prop({ type: String, default: null, trim: true })
  description: string | null;

  @Prop({ type: String, default: null, trim: true })
  logoUrl: string | null;

  @Prop({ type: String, default: null, trim: true })
  loginLogoUrl: string | null;
}

export const GymInfoSchema = SchemaFactory.createForClass(GymInfo);

// ─── UserProfile schema ───────────────────────────────────────────────────────

@Schema({ timestamps: { createdAt: false, updatedAt: true } })
export class UserProfile {
  @Prop({ type: Types.ObjectId, required: true, unique: true })
  userId: Types.ObjectId;

  // common fields (all roles)
  @Prop({ type: String, default: null, trim: true })
  mobile: string | null;

  @Prop({ type: String, default: null, trim: true })
  address: string | null;

  @Prop({ type: Date, default: null })
  dateOfBirth: Date | null;

  @Prop({ type: String, default: null })
  avatarUrl: string | null;

  // member-specific
  @Prop({ type: String, enum: ['male', 'female'], default: null })
  sex: 'male' | 'female' | null;

  @Prop({ type: Number, default: null })
  height: number | null;

  @Prop({
    type: String,
    enum: ['lose_fat', 'build_muscle', 'maintain', 'improve_performance'],
    default: null,
  })
  fitnessGoal:
    | 'lose_fat'
    | 'build_muscle'
    | 'maintain'
    | 'improve_performance'
    | null;

  @Prop({
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: null,
  })
  fitnessLevel: 'beginner' | 'intermediate' | 'advanced' | null;

  // trainer + owner
  @Prop({ type: [String], default: [] })
  certifications: string[];

  // trainer-specific
  @Prop({ type: String, default: null, trim: true })
  bio: string | null;

  @Prop({ type: [String], default: [] })
  specializations: string[];

  // owner-specific
  @Prop({ type: GymInfoSchema, default: null })
  gymInfo: GymInfo | null;
}

export const UserProfileSchema = SchemaFactory.createForClass(UserProfile);
