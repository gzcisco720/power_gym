import { Schema } from 'mongoose';
import type { Document, Types } from 'mongoose';
import type { UserRole } from '../../common/interfaces/auth-user.interface';

export interface IUser extends Document {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  readonly name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  trainerId: Types.ObjectId | null;
  createdAt: Date;
}

export const USER_MODEL = 'User';

export const UserSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['owner', 'trainer', 'member'],
      required: true,
    },
    trainerId: { type: Schema.Types.ObjectId, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    toJSON: { virtuals: true },
  },
);

UserSchema.virtual('name').get(function (this: IUser): string {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.index({ role: 1, trainerId: 1 });
// Enforce at most one owner at the DB level, preventing bootstrap race conditions.
UserSchema.index(
  { role: 1 },
  { unique: true, partialFilterExpression: { role: 'owner' } },
);
