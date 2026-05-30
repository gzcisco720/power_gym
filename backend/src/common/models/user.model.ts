import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserRole = 'owner' | 'trainer' | 'member';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: { virtuals: true },
})
export class User {
  @Prop({ type: String, required: true, trim: true })
  firstName: string;

  @Prop({ type: String, required: true, trim: true })
  lastName: string;

  @Prop({
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  @Prop({ type: String, required: true })
  passwordHash: string;

  @Prop({ type: String, enum: ['owner', 'trainer', 'member'], required: true })
  role: UserRole;

  @Prop({ type: Types.ObjectId, default: null })
  trainerId: Types.ObjectId | null;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.virtual('name').get(function (
  this: User & { firstName: string; lastName: string },
) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.index({ role: 1, trainerId: 1 });
