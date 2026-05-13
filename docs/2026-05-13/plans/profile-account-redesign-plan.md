# Profile & Account Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor User model (name → firstName/lastName), add full profile fields, avatar upload, change-password, forgot-password flow, and replace sidebar ACCOUNT link with a Popover user menu.

**Architecture:** Schema-first approach — refactor data layer (Stage 1–2), then API layer (Stage 3–5), then UI layer (Stage 6–8). Each stage commits independently. All UI follows the existing `food-form.tsx` sticky-bar + dirty-detection pattern.

**Tech Stack:** Next.js App Router, Mongoose, Auth.js v5 (JWT strategy), shadcn/ui, existing MinIO/Cloudinary upload infrastructure (`src/lib/storage/`)

---

## Stage 1: User Model Refactor (name → firstName + lastName)

**Files:**
- Modify: `src/lib/db/models/user.model.ts`
- Modify: `src/lib/repositories/user.repository.ts`
- Modify: `src/lib/auth/auth.ts`
- Modify: `src/lib/auth/auth.config.ts`
- Modify: `src/types/auth.ts`
- Modify: `__tests__/lib/db/models.test.ts`
- Modify: `__tests__/app/api/auth/register.test.ts`

- [ ] **Step 1.1: Update User model**

Replace `src/lib/db/models/user.model.ts` entirely:

```typescript
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
  { timestamps: { createdAt: true, updatedAt: false } },
);

UserSchema.virtual('name').get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.index({ role: 1, trainerId: 1 });

export const UserModel: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);
```

- [ ] **Step 1.2: Update user repository**

Replace `src/lib/repositories/user.repository.ts` entirely:

```typescript
import mongoose from 'mongoose';
import type { IUser } from '@/lib/db/models/user.model';
import { UserModel } from '@/lib/db/models/user.model';
import type { UserRole } from '@/types/auth';

export interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  trainerId: string | null;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  findById(id: string): Promise<IUser | null>;
  count(): Promise<number>;
  create(data: CreateUserData): Promise<IUser>;
  findByRole(role: 'trainer' | 'member'): Promise<IUser[]>;
  findAllMembers(trainerId?: string): Promise<IUser[]>;
  updateTrainerId(memberId: string, trainerId: string | null): Promise<void>;
  updatePassword(userId: string, passwordHash: string): Promise<void>;
  updateEmail(userId: string, email: string): Promise<void>;
  updateName(userId: string, firstName: string, lastName: string): Promise<void>;
}

export class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email });
  }

  async findById(id: string): Promise<IUser | null> {
    return UserModel.findById(id);
  }

  async count(): Promise<number> {
    return UserModel.countDocuments();
  }

  async create(data: CreateUserData): Promise<IUser> {
    const user = new UserModel(data);
    return user.save();
  }

  async findByRole(role: 'trainer' | 'member'): Promise<IUser[]> {
    return UserModel.find({ role });
  }

  async findAllMembers(trainerId?: string): Promise<IUser[]> {
    const filter: { role: 'member'; trainerId?: mongoose.Types.ObjectId } = { role: 'member' };
    if (trainerId) {
      filter.trainerId = new mongoose.Types.ObjectId(trainerId);
    }
    return UserModel.find(filter);
  }

  async updateTrainerId(memberId: string, trainerId: string | null): Promise<void> {
    await UserModel.findByIdAndUpdate(memberId, {
      $set: { trainerId: trainerId ? new mongoose.Types.ObjectId(trainerId) : null },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { $set: { passwordHash } });
  }

  async updateEmail(userId: string, email: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { $set: { email: email.toLowerCase().trim() } });
  }

  async updateName(userId: string, firstName: string, lastName: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { $set: { firstName: firstName.trim(), lastName: lastName.trim() } });
  }
}
```

- [ ] **Step 1.3: Update auth.config.ts**

Replace `src/lib/auth/auth.config.ts` entirely:

```typescript
import type { NextAuthConfig } from 'next-auth';
import type { UserRole } from '@/types/auth';

export interface AuthorizedUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  trainerId: string | null;
}

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as AuthorizedUser;
        token.id = u.id;
        token.firstName = u.firstName;
        token.lastName = u.lastName;
        token.role = u.role;
        token.trainerId = u.trainerId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.firstName = token.firstName as string;
      session.user.lastName = token.lastName as string;
      session.user.name = `${token.firstName} ${token.lastName}`;
      session.user.role = token.role as UserRole;
      session.user.trainerId = token.trainerId as string | null;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
```

- [ ] **Step 1.4: Update types/auth.ts**

Replace `src/types/auth.ts` entirely:

```typescript
import type { DefaultSession } from 'next-auth';

export type UserRole = 'owner' | 'trainer' | 'member';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      role: UserRole;
      trainerId: string | null;
    } & DefaultSession['user'];
  }
}

export interface AppJWT {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  trainerId: string | null;
}
```

- [ ] **Step 1.5: Update auth.ts authorizeCredentials**

In `src/lib/auth/auth.ts`, replace the `authorizeCredentials` function:

```typescript
export async function authorizeCredentials(
  email: string,
  password: string,
  userRepo: IUserRepository,
): Promise<AuthorizedUser | null> {
  const user = await userRepo.findByEmail(email);
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user._id.toString(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    trainerId: user.trainerId?.toString() ?? null,
  };
}
```

- [ ] **Step 1.6: Update models test**

Replace `__tests__/lib/db/models.test.ts`:

```typescript
/**
 * @jest-environment node
 */

describe('UserModel schema', () => {
  it('requires email and role fields', async () => {
    const { UserModel } = await import('@/lib/db/models/user.model');
    const user = new UserModel({});
    const err = user.validateSync();
    expect(err?.errors['email']).toBeDefined();
    expect(err?.errors['role']).toBeDefined();
  });

  it('requires firstName and lastName', async () => {
    const { UserModel } = await import('@/lib/db/models/user.model');
    const user = new UserModel({ email: 'a@b.com', passwordHash: 'x', role: 'member' });
    const err = user.validateSync();
    expect(err?.errors['firstName']).toBeDefined();
    expect(err?.errors['lastName']).toBeDefined();
  });

  it('rejects invalid role', async () => {
    const { UserModel } = await import('@/lib/db/models/user.model');
    const user = new UserModel({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@test.com',
      passwordHash: 'hash',
      role: 'superadmin',
    });
    const err = user.validateSync();
    expect(err?.errors['role']).toBeDefined();
  });

  it('virtual name returns firstName + lastName', async () => {
    const { UserModel } = await import('@/lib/db/models/user.model');
    const user = new UserModel({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@test.com',
      passwordHash: 'hash',
      role: 'member',
    });
    expect((user as { name: string }).name).toBe('John Doe');
  });
});

describe('InviteTokenModel schema', () => {
  it('requires token, role, invitedBy, recipientEmail, expiresAt', async () => {
    const { InviteTokenModel } = await import('@/lib/db/models/invite-token.model');
    const invite = new InviteTokenModel({});
    const err = invite.validateSync();
    expect(err?.errors['token']).toBeDefined();
    expect(err?.errors['role']).toBeDefined();
    expect(err?.errors['invitedBy']).toBeDefined();
    expect(err?.errors['recipientEmail']).toBeDefined();
    expect(err?.errors['expiresAt']).toBeDefined();
  });
});
```

- [ ] **Step 1.7: Update register API test**

In `__tests__/app/api/auth/register.test.ts`, update all calls that pass `name:` to pass `firstName:` + `lastName:`:

```typescript
// Line 47 — replace:
const res = await POST(makeRequest({ name: 'Owner', email: 'owner@test.com', password: 'pass' }));
// with:
const res = await POST(makeRequest({ firstName: 'Owner', lastName: 'User', email: 'owner@test.com', password: 'pass' }));

// Line 61:
const res = await POST(makeRequest({ firstName: 'X', lastName: 'Y', email: 'x@test.com', password: 'pass' }));

// Line 69:
const res = await POST(makeRequest({ firstName: 'X', lastName: 'Y', email: 'x@test.com', password: 'pass', token: 'bad' }));

// Line 85:
const res = await POST(makeRequest({ firstName: 'X', lastName: 'Y', email: 'x@test.com', password: 'pass', token: 'tok' }));

// Line 103:
const res = await POST(makeRequest({ firstName: 'New', lastName: 'User', email: 'invited@test.com', password: 'pass', token: 'tok' }));
```

- [ ] **Step 1.8: Update register API route**

Replace `src/app/api/auth/register/route.ts`:

```typescript
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { validateInviteToken } from '@/lib/auth/invite';

export async function POST(req: Request): Promise<Response> {
  const { firstName, lastName, email, password, token } = (await req.json()) as {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    token?: string;
  };

  await connectDB();
  const userRepo = new MongoUserRepository();

  if (!token) {
    const count = await userRepo.count();
    if (count > 0) {
      return Response.json({ error: 'Must use an invite link' }, { status: 403 });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await userRepo.create({ firstName, lastName, email, passwordHash, role: 'owner', trainerId: null });
    return Response.json({ success: true });
  }

  const inviteRepo = new MongoInviteRepository();
  const invite = await inviteRepo.findByToken(token);
  const validation = validateInviteToken(invite);

  if (!validation.valid) {
    return Response.json({ error: 'Invalid or expired invite' }, { status: 400 });
  }

  if (validation.invite.recipientEmail !== email.toLowerCase()) {
    return Response.json({ error: 'Email does not match invite' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await userRepo.create({
    firstName,
    lastName,
    email,
    passwordHash,
    role: validation.invite.role,
    trainerId: (validation.invite.trainerId ?? validation.invite.invitedBy).toString(),
  });
  await inviteRepo.markUsed(token);

  return Response.json({ success: true });
}
```

- [ ] **Step 1.9: Update register server action**

In `src/app/(auth)/register/actions.ts`, replace `name` references:

```typescript
// Change:
const name = (formData.get('name') ?? '') as string;
// To:
const firstName = (formData.get('firstName') ?? '') as string;
const lastName = (formData.get('lastName') ?? '') as string;

// Change all: { name, email, passwordHash, role: 'owner', trainerId: null }
// To: { firstName, lastName, email, passwordHash, role: 'owner', trainerId: null }
// (two places in the function)
```

- [ ] **Step 1.10: Update register form UI**

In `src/app/(auth)/register/_components/register-form.tsx`, replace the "Full Name" field block with:

```tsx
<div className="space-y-1.5">
  <label htmlFor="firstName" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
    First Name
  </label>
  <Input
    id="firstName"
    name="firstName"
    type="text"
    required
    autoComplete="given-name"
    className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555] focus-visible:ring-white"
  />
</div>

<div className="space-y-1.5">
  <label htmlFor="lastName" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
    Last Name
  </label>
  <Input
    id="lastName"
    name="lastName"
    type="text"
    required
    autoComplete="family-name"
    className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555] focus-visible:ring-white"
  />
</div>
```

- [ ] **Step 1.11: Fix all other tests referencing `name:` in UserModel.create**

Run: `grep -rn "name: '" __tests__/ --include="*.ts" --include="*.tsx"`

For each file listed, replace `name: 'Some Name'` in mock `create` calls with `firstName: 'Some', lastName: 'Name'`.

Key files to update (from grep above):
- `__tests__/app/api/invites.test.ts`
- `__tests__/app/api/owner-members.test.ts`
- `__tests__/app/api/owner-trainers.test.ts`
- `__tests__/app/api/trainer-invites.test.ts`
- `__tests__/app/api/owner-invites.test.ts`
- `__tests__/app/api/members-plan.test.ts`
- `__tests__/app/api/members-nutrition.test.ts`
- `__tests__/app/api/exercises.test.ts`
- `__tests__/app/api/nutrition-templates.test.ts`
- `__tests__/app/owner/members/reassign-modal.test.tsx`
- `__tests__/app/owner/owner-dashboard.test.ts`
- `__tests__/app/owner/trainer-list-client.test.tsx`
- `__tests__/app/trainer/members/trainer-member-plan-client.test.tsx`
- `__tests__/app/trainer/progress-page.test.ts`
- `__tests__/components/shared/app-shell-active-state.test.tsx`

For the app-shell test, the `userName` prop stays the same (it's a display string, not a model field).

- [ ] **Step 1.12: Update e2e/seed.ts**

Replace all `UserModel.create({ name: '...', ...})` calls with `firstName`/`lastName`:

```typescript
// owner:
await UserModel.create({ firstName: 'Test', lastName: 'Owner', email: 'owner@test.com', passwordHash, role: 'owner', trainerId: null });
// trainer:
await UserModel.create({ firstName: 'Test', lastName: 'Trainer', email: 'trainer@test.com', passwordHash, role: 'trainer', trainerId: owner._id });
// trainer2:
await UserModel.create({ firstName: 'Test', lastName: 'Trainer2', email: 'trainer2@test.com', passwordHash, role: 'trainer', trainerId: owner._id });
// member:
await UserModel.create({ firstName: 'Test', lastName: 'Member', email: 'member@test.com', passwordHash, role: 'member', trainerId: trainer._id });
// reassign-member:
await UserModel.create({ firstName: 'Reassign', lastName: 'Member', email: 'reassign-member@test.com', passwordHash, role: 'member', trainerId: trainer._id });
// hub-reassign:
await UserModel.create({ firstName: 'Hub', lastName: 'Reassign', email: 'hub-reassign@test.com', passwordHash, role: 'member', trainerId: trainer._id });
```

- [ ] **Step 1.13: Update scripts/seed-dev.ts**

Run: `grep -n "name:" scripts/seed-dev.ts | grep -v "gymName\|planName\|templateName\|exerciseName\|foodName\|equipmentName\|conditionName\|bundleName\|groupName\|injuryName\|dayName\|checkIn\|session\|catalog"`

For every `UserModel.create({ name: '...' })` found, split into `firstName` + `lastName`.

- [ ] **Step 1.14: Run tests and confirm pass**

```bash
pnpm test -- --testPathPattern="models|register"
```

Expected: all pass.

- [ ] **Step 1.15: Run lint**

```bash
pnpm lint
```

Fix any TypeScript errors (likely type errors where `user.name` is read — add `user.firstName + ' ' + user.lastName` or `(user as { name: string }).name` for virtual access).

- [ ] **Step 1.16: Commit**

```bash
git add -A
git commit -m "refactor(auth): split User.name → firstName + lastName"
```

---

## Stage 2: UserProfile Schema Changes

**Files:**
- Modify: `src/lib/db/models/user-profile.model.ts`
- Modify: `src/lib/repositories/user-profile.repository.ts`
- Modify: `src/app/(dashboard)/member/settings/actions.ts`
- Modify: `src/app/(dashboard)/trainer/settings/actions.ts`
- Modify: `src/app/(dashboard)/owner/settings/actions.ts`
- Modify: `e2e/seed.ts`

- [ ] **Step 2.1: Update UserProfile model**

Replace `src/lib/db/models/user-profile.model.ts`:

```typescript
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IGymInfo {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
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
```

- [ ] **Step 2.2: Update user-profile repository**

Replace `src/lib/repositories/user-profile.repository.ts`:

```typescript
import mongoose from 'mongoose';
import { UserProfileModel } from '@/lib/db/models/user-profile.model';
import type { IUserProfile, IGymInfo } from '@/lib/db/models/user-profile.model';

export type UpdateProfileData = Partial<
  Pick<
    IUserProfile,
    | 'mobile'
    | 'address'
    | 'dateOfBirth'
    | 'avatarUrl'
    | 'sex'
    | 'height'
    | 'fitnessGoal'
    | 'fitnessLevel'
    | 'certifications'
    | 'bio'
    | 'specializations'
    | 'gymInfo'
  >
>;

export interface IUserProfileRepository {
  findByUserId(userId: string): Promise<IUserProfile | null>;
  upsert(userId: string, data: UpdateProfileData): Promise<IUserProfile>;
}

export class MongoUserProfileRepository implements IUserProfileRepository {
  async findByUserId(userId: string): Promise<IUserProfile | null> {
    return UserProfileModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  }

  async upsert(userId: string, data: UpdateProfileData): Promise<IUserProfile> {
    const doc = await UserProfileModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $set: data },
      { upsert: true, new: true },
    );
    return doc!;
  }
}
```

- [ ] **Step 2.3: Update e2e/seed.ts UserProfileModel.create**

In `e2e/seed.ts`, update the member profile creation (around line 81) and add profiles for all users:

```typescript
// Member profile
await UserProfileModel.create({
  userId: member._id,
  sex: 'male',
  dateOfBirth: memberDob,
  height: 178,
  mobile: null,
  address: null,
  avatarUrl: null,
  certifications: [],
});
```

- [ ] **Step 2.4: Run lint**

```bash
pnpm lint
```

Fix any TypeScript errors from renamed `phone` → `mobile` and removed `gymName`/`role` fields.

- [ ] **Step 2.5: Commit**

```bash
git add -A
git commit -m "refactor(profile): expand UserProfile schema with common fields + gymInfo"
```

---

## Stage 3: PasswordResetToken Model + Email Service + API Routes

**Files:**
- Create: `src/lib/db/models/password-reset-token.model.ts`
- Create: `src/lib/repositories/password-reset-token.repository.ts`
- Create: `src/lib/email/templates/password-reset.ts`
- Modify: `src/lib/email/index.ts`
- Modify: `src/lib/email/nodemailer.ts`
- Modify: `src/lib/email/mailgun.ts`
- Create: `src/app/api/auth/forgot-password/route.ts`
- Create: `src/app/api/auth/reset-password/route.ts`
- Create: `__tests__/app/api/auth/forgot-password.test.ts`
- Create: `__tests__/app/api/auth/reset-password.test.ts`

- [ ] **Step 3.1: Create PasswordResetToken model**

Create `src/lib/db/models/password-reset-token.model.ts`:

```typescript
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: false },
);

PasswordResetTokenSchema.index({ tokenHash: 1 });
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetTokenModel: Model<IPasswordResetToken> =
  mongoose.models.PasswordResetToken ??
  mongoose.model<IPasswordResetToken>('PasswordResetToken', PasswordResetTokenSchema);
```

- [ ] **Step 3.2: Create password-reset-token repository**

Create `src/lib/repositories/password-reset-token.repository.ts`:

```typescript
import { PasswordResetTokenModel } from '@/lib/db/models/password-reset-token.model';
import type { IPasswordResetToken } from '@/lib/db/models/password-reset-token.model';
import mongoose from 'mongoose';

export interface IPasswordResetTokenRepository {
  create(userId: string, tokenHash: string, expiresAt: Date): Promise<IPasswordResetToken>;
  findByTokenHash(tokenHash: string): Promise<IPasswordResetToken | null>;
  markUsed(id: string): Promise<void>;
}

export class MongoPasswordResetTokenRepository implements IPasswordResetTokenRepository {
  async create(userId: string, tokenHash: string, expiresAt: Date): Promise<IPasswordResetToken> {
    return PasswordResetTokenModel.create({
      userId: new mongoose.Types.ObjectId(userId),
      tokenHash,
      expiresAt,
    });
  }

  async findByTokenHash(tokenHash: string): Promise<IPasswordResetToken | null> {
    return PasswordResetTokenModel.findOne({ tokenHash });
  }

  async markUsed(id: string): Promise<void> {
    await PasswordResetTokenModel.findByIdAndUpdate(id, { $set: { usedAt: new Date() } });
  }
}
```

- [ ] **Step 3.3: Create password-reset email template**

Create `src/lib/email/templates/password-reset.ts`:

```typescript
export function passwordResetEmailTemplate(params: {
  resetUrl: string;
}): { subject: string; html: string } {
  return {
    subject: 'Reset your POWER GYM password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>Reset your password</h2>
        <p>We received a request to reset your POWER GYM password. Click the button below to set a new password. This link expires in 1 hour.</p>
        <a
          href="${params.resetUrl}"
          style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;"
        >
          Reset Password
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px;">
          If you didn't request this, you can safely ignore this email. Your password won't be changed.
        </p>
      </div>
    `,
  };
}
```

- [ ] **Step 3.4: Add sendPasswordReset to IEmailService**

In `src/lib/email/index.ts`, add:

```typescript
// Add to interfaces section:
export interface SendPasswordResetParams {
  to: string;
  resetUrl: string;
}

// Add to IEmailService interface:
sendPasswordReset(params: SendPasswordResetParams): Promise<void>;
```

- [ ] **Step 3.5: Implement sendPasswordReset in NodemailerEmailService**

In `src/lib/email/nodemailer.ts`, add the method to the class (follow the same pattern as existing methods — import `passwordResetEmailTemplate` from templates and call `this.transporter.sendMail`). Check existing methods in that file for the exact pattern.

- [ ] **Step 3.6: Implement sendPasswordReset in MailgunEmailService**

In `src/lib/email/mailgun.ts`, add the method (same pattern as existing methods in that file).

- [ ] **Step 3.7: Write forgot-password API test**

Create `__tests__/app/api/auth/forgot-password.test.ts`:

```typescript
/**
 * @jest-environment node
 */
import crypto from 'crypto';

jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('bcryptjs');
jest.mock('crypto');

const mockUserRepo = { findByEmail: jest.fn() };
const mockTokenRepo = { create: jest.fn() };
const mockEmailService = { sendPasswordReset: jest.fn() };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/password-reset-token.repository', () => ({
  MongoPasswordResetTokenRepository: jest.fn(() => mockTokenRepo),
}));
jest.mock('@/lib/email/index', () => ({
  getEmailService: jest.fn(() => mockEmailService),
}));

import bcrypt from 'bcryptjs';
const mockBcrypt = jest.mocked(bcrypt);
const mockCrypto = jest.mocked(crypto);

function makeRequest(body: object) {
  return new Request('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 even when user does not exist (no enumeration)', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const res = await POST(makeRequest({ email: 'unknown@test.com' }));
    expect(res.status).toBe(200);
    expect(mockTokenRepo.create).not.toHaveBeenCalled();
    expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('creates token and sends email when user exists', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ _id: { toString: () => 'user-id' } });
    (mockCrypto.randomBytes as jest.Mock).mockReturnValue(Buffer.from('abc123', 'hex'));
    mockBcrypt.hash.mockResolvedValue('hashed-token' as never);
    mockTokenRepo.create.mockResolvedValue({});
    mockEmailService.sendPasswordReset.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/auth/forgot-password/route');
    const res = await POST(makeRequest({ email: 'user@test.com' }));
    const data = await res.json() as { success: boolean };

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockTokenRepo.create).toHaveBeenCalled();
    expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@test.com' }),
    );
  });
});
```

- [ ] **Step 3.8: Create forgot-password API route**

Create `src/app/api/auth/forgot-password/route.ts`:

```typescript
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoPasswordResetTokenRepository } from '@/lib/repositories/password-reset-token.repository';
import { getEmailService } from '@/lib/email/index';

export async function POST(req: Request): Promise<Response> {
  const { email } = (await req.json()) as { email: string };

  await connectDB();
  const userRepo = new MongoUserRepository();
  const user = await userRepo.findByEmail(email?.toLowerCase()?.trim() ?? '');

  if (!user) {
    return Response.json({ success: true });
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(rawToken, 10);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const tokenRepo = new MongoPasswordResetTokenRepository();
  await tokenRepo.create(user._id.toString(), tokenHash, expiresAt);

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&id=${user._id.toString()}`;

  await getEmailService().sendPasswordReset({ to: user.email, resetUrl });

  return Response.json({ success: true });
}
```

- [ ] **Step 3.9: Write reset-password API test**

Create `__tests__/app/api/auth/reset-password.test.ts`:

```typescript
/**
 * @jest-environment node
 */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('bcryptjs');

const mockUserRepo = { updatePassword: jest.fn() };
const mockTokenRepo = {
  findByTokenHash: jest.fn(),
  markUsed: jest.fn(),
};

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/password-reset-token.repository', () => ({
  MongoPasswordResetTokenRepository: jest.fn(() => mockTokenRepo),
}));

import bcrypt from 'bcryptjs';
const mockBcrypt = jest.mocked(bcrypt);

function makeRequest(body: object) {
  return new Request('http://localhost/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when token not found', async () => {
    mockTokenRepo.findByTokenHash.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue('h' as never);

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const res = await POST(makeRequest({ token: 'bad', userId: 'uid', newPassword: 'NewPass1!' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when token expired', async () => {
    mockTokenRepo.findByTokenHash.mockResolvedValue({
      _id: 'tid',
      userId: { toString: () => 'uid' },
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
    });
    mockBcrypt.hash.mockResolvedValue('h' as never);
    mockBcrypt.compare.mockResolvedValue(true as never);

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const res = await POST(makeRequest({ token: 'tok', userId: 'uid', newPassword: 'NewPass1!' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when token already used', async () => {
    mockTokenRepo.findByTokenHash.mockResolvedValue({
      _id: 'tid',
      userId: { toString: () => 'uid' },
      expiresAt: new Date(Date.now() + 10000),
      usedAt: new Date(),
    });
    mockBcrypt.hash.mockResolvedValue('h' as never);
    mockBcrypt.compare.mockResolvedValue(true as never);

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const res = await POST(makeRequest({ token: 'tok', userId: 'uid', newPassword: 'NewPass1!' }));
    expect(res.status).toBe(400);
  });

  it('updates password and marks token used on valid token', async () => {
    mockTokenRepo.findByTokenHash.mockResolvedValue({
      _id: 'tid',
      userId: { toString: () => 'uid' },
      expiresAt: new Date(Date.now() + 10000),
      usedAt: null,
    });
    mockBcrypt.hash.mockResolvedValue('newhash' as never);
    mockBcrypt.compare.mockResolvedValue(true as never);
    mockUserRepo.updatePassword.mockResolvedValue(undefined);
    mockTokenRepo.markUsed.mockResolvedValue(undefined);

    const { POST } = await import('@/app/api/auth/reset-password/route');
    const res = await POST(makeRequest({ token: 'tok', userId: 'uid', newPassword: 'NewPass1!' }));
    expect(res.status).toBe(200);
    expect(mockUserRepo.updatePassword).toHaveBeenCalledWith('uid', 'newhash');
    expect(mockTokenRepo.markUsed).toHaveBeenCalledWith('tid');
  });
});
```

- [ ] **Step 3.10: Create reset-password API route**

Create `src/app/api/auth/reset-password/route.ts`:

```typescript
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoPasswordResetTokenRepository } from '@/lib/repositories/password-reset-token.repository';

export async function POST(req: Request): Promise<Response> {
  const { token, userId, newPassword } = (await req.json()) as {
    token: string;
    userId: string;
    newPassword: string;
  };

  if (!token || !userId || !newPassword) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  await connectDB();
  const tokenRepo = new MongoPasswordResetTokenRepository();

  const tokenHash = await bcrypt.hash(token, 10);
  // We can't hash-then-compare since bcrypt is one-way; instead store the raw token
  // and compare against stored hash using bcrypt.compare
  // Re-design: the route receives raw token, finds by userId, then compares
  const allTokens = await tokenRepo.findByTokenHash(tokenHash);
  // Note: since bcrypt hash is non-deterministic, we must store raw token or use a different strategy.
  // Use: find by userId (recent non-used token), then bcrypt.compare raw token against stored hash.
  // See implementation note below.
  void allTokens;

  // Correct approach: find token by userId, compare raw token against stored hash
  const { PasswordResetTokenModel } = await import('@/lib/db/models/password-reset-token.model');
  const mongoose = await import('mongoose');
  const record = await PasswordResetTokenModel.findOne({
    userId: new mongoose.default.Types.ObjectId(userId),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  }).sort({ expiresAt: -1 });

  if (!record) {
    return Response.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  }

  const valid = await bcrypt.compare(token, record.tokenHash);
  if (!valid) {
    return Response.json({ error: 'Invalid or expired reset link' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const userRepo = new MongoUserRepository();
  await userRepo.updatePassword(userId, passwordHash);
  await tokenRepo.markUsed(record._id.toString());

  return Response.json({ success: true });
}
```

> **Note on reset-password route:** The forgot-password route stores `bcrypt.hash(rawToken)` in DB. The reset-password route receives `rawToken` + `userId`, finds the most recent unused non-expired token for that userId, then calls `bcrypt.compare(rawToken, storedHash)`. This is the correct pattern. The `findByTokenHash` method on the repository is not used by this route — it's available for future use. Update the test accordingly: the test should mock `PasswordResetTokenModel.findOne` instead.

- [ ] **Step 3.11: Fix reset-password test to use correct mocking**

Update `__tests__/app/api/auth/reset-password.test.ts` to mock `PasswordResetTokenModel.findOne` directly since the route uses it:

```typescript
// Add to mocks at top:
const mockFindOne = jest.fn();
jest.mock('@/lib/db/models/password-reset-token.model', () => ({
  PasswordResetTokenModel: { findOne: () => ({ sort: () => mockFindOne() }) },
}));
jest.mock('mongoose', () => ({
  default: { Types: { ObjectId: jest.fn((id: string) => id) } },
}));

// Update tests to use mockFindOne instead of mockTokenRepo.findByTokenHash
// expired test: mockFindOne.mockResolvedValue(null) — route returns 400
// valid test: mockFindOne.mockResolvedValue({ _id: 'tid', tokenHash: 'stored', userId: ... })
//             mockBcrypt.compare.mockResolvedValue(true)
```

- [ ] **Step 3.12: Run tests**

```bash
pnpm test -- --testPathPattern="forgot-password|reset-password"
```

Expected: all pass.

- [ ] **Step 3.13: Commit**

```bash
git add -A
git commit -m "feat(auth): add PasswordResetToken model + forgot/reset-password API routes"
```

---

## Stage 4: Account API Routes (Email + Password Change)

**Files:**
- Create: `src/app/api/account/email/route.ts`
- Create: `src/app/api/account/password/route.ts`
- Create: `__tests__/app/api/account/email.test.ts`
- Create: `__tests__/app/api/account/password.test.ts`

- [ ] **Step 4.1: Write email change test**

Create `__tests__/app/api/account/email.test.ts`:

```typescript
/**
 * @jest-environment node
 */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));

const mockUserRepo = {
  findByEmail: jest.fn(),
  updateEmail: jest.fn(),
};
const mockSession = { user: { id: 'user-id', email: 'old@test.com' } };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn(() => mockSession) }));

function makeRequest(body: object) {
  return new Request('http://localhost/api/account/email', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/account/email', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@/lib/auth/auth');
    jest.mocked(auth).mockResolvedValueOnce(null);

    const { PATCH } = await import('@/app/api/account/email/route');
    const res = await PATCH(makeRequest({ email: 'new@test.com' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid email format', async () => {
    const { PATCH } = await import('@/app/api/account/email/route');
    const res = await PATCH(makeRequest({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('returns 409 when email already taken', async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ _id: 'other-id' });

    const { PATCH } = await import('@/app/api/account/email/route');
    const res = await PATCH(makeRequest({ email: 'taken@test.com' }));
    expect(res.status).toBe(409);
  });

  it('updates email when valid and unique', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.updateEmail.mockResolvedValue(undefined);

    const { PATCH } = await import('@/app/api/account/email/route');
    const res = await PATCH(makeRequest({ email: 'new@test.com' }));
    expect(res.status).toBe(200);
    expect(mockUserRepo.updateEmail).toHaveBeenCalledWith('user-id', 'new@test.com');
  });
});
```

- [ ] **Step 4.2: Create email change route**

Create `src/app/api/account/email/route.ts`:

```typescript
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserRepository } from '@/lib/repositories/user.repository';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PATCH(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { email } = (await req.json()) as { email: string };
  const normalized = email?.toLowerCase()?.trim() ?? '';

  if (!EMAIL_RE.test(normalized)) {
    return Response.json({ error: 'Invalid email format' }, { status: 400 });
  }

  await connectDB();
  const userRepo = new MongoUserRepository();
  const existing = await userRepo.findByEmail(normalized);
  if (existing && existing._id.toString() !== session.user.id) {
    return Response.json({ error: 'Email already in use' }, { status: 409 });
  }

  await userRepo.updateEmail(session.user.id, normalized);
  return Response.json({ success: true });
}
```

- [ ] **Step 4.3: Write password change test**

Create `__tests__/app/api/account/password.test.ts`:

```typescript
/**
 * @jest-environment node
 */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('bcryptjs');

const mockUserRepo = {
  findById: jest.fn(),
  updatePassword: jest.fn(),
};
const mockSession = { user: { id: 'user-id' } };

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn(() => mockSession) }));

import bcrypt from 'bcryptjs';
const mockBcrypt = jest.mocked(bcrypt);

function makeRequest(body: object) {
  return new Request('http://localhost/api/account/password', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/account/password', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when not authenticated', async () => {
    const { auth } = await import('@/lib/auth/auth');
    jest.mocked(auth).mockResolvedValueOnce(null);

    const { PATCH } = await import('@/app/api/account/password/route');
    const res = await PATCH(makeRequest({ currentPassword: 'old', newPassword: 'New1pass!' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when current password is wrong', async () => {
    mockUserRepo.findById.mockResolvedValue({ passwordHash: 'hash' });
    mockBcrypt.compare.mockResolvedValue(false as never);

    const { PATCH } = await import('@/app/api/account/password/route');
    const res = await PATCH(makeRequest({ currentPassword: 'wrong', newPassword: 'New1pass!' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when new password too weak', async () => {
    mockUserRepo.findById.mockResolvedValue({ passwordHash: 'hash' });
    mockBcrypt.compare.mockResolvedValue(true as never);

    const { PATCH } = await import('@/app/api/account/password/route');
    const res = await PATCH(makeRequest({ currentPassword: 'old', newPassword: 'weak' }));
    expect(res.status).toBe(400);
  });

  it('updates password when valid', async () => {
    mockUserRepo.findById.mockResolvedValue({ passwordHash: 'oldhash' });
    mockBcrypt.compare.mockResolvedValue(true as never);
    mockBcrypt.hash.mockResolvedValue('newhash' as never);
    mockUserRepo.updatePassword.mockResolvedValue(undefined);

    const { PATCH } = await import('@/app/api/account/password/route');
    const res = await PATCH(makeRequest({ currentPassword: 'OldPass1!', newPassword: 'NewPass1!' }));
    expect(res.status).toBe(200);
    expect(mockUserRepo.updatePassword).toHaveBeenCalledWith('user-id', 'newhash');
  });
});
```

- [ ] **Step 4.4: Create password change route**

Create `src/app/api/account/password/route.ts`:

```typescript
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserRepository } from '@/lib/repositories/user.repository';

const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export async function PATCH(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { currentPassword, newPassword } = (await req.json()) as {
    currentPassword: string;
    newPassword: string;
  };

  if (!PASSWORD_RE.test(newPassword)) {
    return Response.json(
      { error: 'Password must be at least 8 characters with 1 uppercase and 1 number' },
      { status: 400 },
    );
  }

  await connectDB();
  const userRepo = new MongoUserRepository();
  const user = await userRepo.findById(session.user.id);
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return Response.json({ error: 'Current password is incorrect' }, { status: 400 });

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await userRepo.updatePassword(session.user.id, passwordHash);
  return Response.json({ success: true });
}
```

- [ ] **Step 4.5: Run tests**

```bash
pnpm test -- --testPathPattern="account"
```

Expected: all pass.

- [ ] **Step 4.6: Commit**

```bash
git add -A
git commit -m "feat(account): add email-change and password-change API routes"
```

---

## Stage 5: Settings Page Restructure

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/shared/app-shell.tsx` (add `userEmail` prop for popover — sidebar popover is Stage 6, but AppShell props need updating here)
- Replace: `src/app/(dashboard)/member/settings/page.tsx`
- Replace: `src/app/(dashboard)/member/settings/actions.ts`
- Delete: `src/app/(dashboard)/member/settings/_components/member-profile-form.tsx`
- Create: `src/app/(dashboard)/member/settings/_components/profile-tab.tsx`
- Create: `src/app/(dashboard)/member/settings/_components/account-tab.tsx`
- Create: `src/app/(dashboard)/member/settings/_components/security-tab.tsx`
- (Same pattern for trainer and owner — owner adds gym-info-tab.tsx)

- [ ] **Step 5.1: Update dashboard layout to pass email + avatarUrl**

Replace `src/app/(dashboard)/layout.tsx`:

```typescript
import { auth } from '@/lib/auth/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { AppShell } from '@/components/shared/app-shell';
import { PageTransition } from '@/components/shared/page-transition';
import { LogoutButton } from '@/components/shared/logout-button';
import type { UserRole } from '@/types/auth';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  await connectDB();
  const profile = await new MongoUserProfileRepository().findByUserId(session.user.id);

  return (
    <AppShell
      role={session.user.role as UserRole}
      userName={`${session.user.firstName} ${session.user.lastName}`}
      userEmail={session.user.email ?? ''}
      avatarUrl={profile?.avatarUrl ?? null}
      logoutSlot={<LogoutButton />}
    >
      <PageTransition>{children}</PageTransition>
    </AppShell>
  );
}
```

- [ ] **Step 5.2: Update AppShell props (partial — full sidebar popover is Stage 6)**

In `src/components/shared/app-shell.tsx`, add `userEmail` and `avatarUrl` to `AppShellProps` and `SidebarContentProps`:

```typescript
interface SidebarContentProps {
  role: UserRole;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  userInitials: string;
  logoutSlot?: React.ReactNode;
}

interface AppShellProps {
  role: UserRole;
  userName: string;
  userEmail: string;
  avatarUrl: string | null;
  children: React.ReactNode;
  logoutSlot?: React.ReactNode;
}
```

Pass the new props through and update the `AppShell` function to pass `userEmail` and `avatarUrl` to `SidebarContent`. The sidebar rendering stays the same for now — the Popover is added in Stage 6.

In `SidebarContent`, update the avatar display to show image when `avatarUrl` is set:

```tsx
{/* Replace the initials div: */}
{avatarUrl ? (
  <img
    src={avatarUrl}
    alt={userName}
    className="h-8 w-8 shrink-0 rounded-full object-cover border border-[#222]"
  />
) : (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#222] bg-[#1a1a1a] text-[11px] font-semibold text-[#666]">
    {userInitials}
  </div>
)}
```

- [ ] **Step 5.3: Create validation helper**

Create `src/lib/validation/user.ts`:

```typescript
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MOBILE_RE = /^[0-9\s+\-().]{7,20}$/;
export const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d).{8,}$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!EMAIL_RE.test(email.trim())) return 'Invalid email format';
  return null;
}

export function validateMobile(mobile: string): string | null {
  if (!mobile) return null; // optional
  const digits = mobile.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return 'Mobile number must be 7–15 digits';
  if (!MOBILE_RE.test(mobile)) return 'Invalid mobile format';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!PASSWORD_RE.test(password)) {
    return 'Password must be at least 8 characters with 1 uppercase letter and 1 number';
  }
  return null;
}
```

- [ ] **Step 5.4: Create shared settings tab component**

Create `src/components/shared/settings-tabs.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Tab {
  value: string;
  label: string;
}

interface Props {
  tabs: Tab[];
  basePath: string;
}

export function SettingsTabs({ tabs, basePath }: Props) {
  const searchParams = useSearchParams();
  const active = searchParams.get('tab') ?? tabs[0]?.value ?? '';

  return (
    <div className="flex gap-1 border-b border-foreground/10 px-4 sm:px-8">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={`${basePath}?tab=${tab.value}`}
          className={cn(
            'pb-3 pt-1 px-1 text-[13px] font-medium border-b-2 transition-colors',
            active === tab.value
              ? 'border-white text-white'
              : 'border-transparent text-foreground/50 hover:text-foreground/80',
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 5.5: Create member settings page**

Replace `src/app/(dashboard)/member/settings/page.tsx`:

```typescript
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { SettingsTabs } from '@/components/shared/settings-tabs';
import { MemberProfileTab } from './_components/profile-tab';
import { AccountTab } from './_components/account-tab';
import { SecurityTab } from './_components/security-tab';

const TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'account', label: 'Account' },
  { value: 'security', label: 'Security' },
];

export default async function MemberSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = 'profile' } = await searchParams;
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const [raw, user] = await Promise.all([
    new MongoUserProfileRepository().findByUserId(session.user.id),
    new MongoUserRepository().findById(session.user.id),
  ]);

  return (
    <div>
      <PageHeader title="Settings" />
      <SettingsTabs tabs={TABS} basePath="/member/settings" />
      <div className="px-4 sm:px-8 py-7 max-w-lg">
        {tab === 'profile' && (
          <MemberProfileTab
            firstName={user?.firstName ?? ''}
            lastName={user?.lastName ?? ''}
            mobile={raw?.mobile ?? null}
            address={raw?.address ?? null}
            dateOfBirth={raw?.dateOfBirth ? raw.dateOfBirth.toISOString() : null}
            avatarUrl={raw?.avatarUrl ?? null}
            sex={raw?.sex ?? null}
            fitnessGoal={raw?.fitnessGoal ?? null}
            fitnessLevel={raw?.fitnessLevel ?? null}
          />
        )}
        {tab === 'account' && <AccountTab currentEmail={user?.email ?? ''} />}
        {tab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}
```

- [ ] **Step 5.6: Create member profile tab**

Create `src/app/(dashboard)/member/settings/_components/profile-tab.tsx`:

```tsx
'use client';

import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateMemberProfileAction } from '../actions';
import type { UpdateProfileState } from '../actions';
import { uploadFile } from '@/lib/storage/upload-file';
import { getAvatarSignatureAction } from '../actions';

interface Props {
  firstName: string;
  lastName: string;
  mobile: string | null;
  address: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  sex: 'male' | 'female' | null;
  fitnessGoal: string | null;
  fitnessLevel: string | null;
}

const FITNESS_GOALS = [
  { value: 'lose_fat', label: 'Lose Fat' },
  { value: 'build_muscle', label: 'Build Muscle' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'improve_performance', label: 'Improve Performance' },
] as const;

const FITNESS_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

export function MemberProfileTab(props: Props) {
  const [avatarUrl, setAvatarUrl] = useState(props.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const config = await getAvatarSignatureAction();
      const { secure_url } = await uploadFile(file, config);
      setAvatarUrl(secure_url);
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    if (avatarUrl) formData.set('avatarUrl', avatarUrl);
    const result: UpdateProfileState = await updateMemberProfileAction({ error: '' }, formData);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Profile saved');
    }
  }

  const dobValue = props.dateOfBirth
    ? new Date(props.dateOfBirth).toISOString().split('T')[0]
    : '';

  const initials = `${props.firstName[0] ?? ''}${props.lastName[0] ?? ''}`.toUpperCase();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="relative h-16 w-16 shrink-0 rounded-full border border-foreground/10 overflow-hidden bg-muted hover:opacity-80 transition-opacity cursor-pointer"
          aria-label="Change avatar"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <span className="text-[16px] font-semibold text-foreground/60">{initials}</span>
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-xs text-white">
              uploading...
            </div>
          )}
        </button>
        <div>
          <p className="text-sm font-medium text-foreground">Profile Photo</p>
          <p className="text-xs text-foreground/65">JPG, PNG or WebP, max 5MB</p>
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
      </div>

      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="firstName" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">First Name <span className="text-destructive">*</span></label>
          <Input id="firstName" name="firstName" required defaultValue={props.firstName} className="bg-card border-foreground/10 text-foreground" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="lastName" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Last Name <span className="text-destructive">*</span></label>
          <Input id="lastName" name="lastName" required defaultValue={props.lastName} className="bg-card border-foreground/10 text-foreground" />
        </div>
      </div>

      {/* Date of Birth */}
      <div className="space-y-1.5">
        <label htmlFor="dateOfBirth" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Date of Birth</label>
        <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={dobValue} className="bg-card border-foreground/10 text-foreground" />
      </div>

      {/* Mobile */}
      <div className="space-y-1.5">
        <label htmlFor="mobile" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Mobile <span className="text-foreground/40 normal-case font-normal">(optional)</span></label>
        <Input id="mobile" name="mobile" type="tel" defaultValue={props.mobile ?? ''} placeholder="+1 234 567 8900" className="bg-card border-foreground/10 text-foreground" />
      </div>

      {/* Address */}
      <div className="space-y-1.5">
        <label htmlFor="address" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Address <span className="text-foreground/40 normal-case font-normal">(optional)</span></label>
        <Input id="address" name="address" defaultValue={props.address ?? ''} className="bg-card border-foreground/10 text-foreground" />
      </div>

      {/* Sex */}
      <div className="space-y-1.5">
        <label htmlFor="sex" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Sex</label>
        <select id="sex" name="sex" defaultValue={props.sex ?? ''} className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
          <option value="">-- Select --</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      {/* Fitness Goal */}
      <div className="space-y-1.5">
        <label htmlFor="fitnessGoal" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Fitness Goal</label>
        <select id="fitnessGoal" name="fitnessGoal" defaultValue={props.fitnessGoal ?? ''} className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
          <option value="">-- Select --</option>
          {FITNESS_GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </div>

      {/* Fitness Level */}
      <div className="space-y-1.5">
        <label htmlFor="fitnessLevel" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Fitness Level</label>
        <select id="fitnessLevel" name="fitnessLevel" defaultValue={props.fitnessLevel ?? ''} className="w-full rounded-md border border-foreground/10 bg-card px-3 py-2 text-sm text-foreground">
          <option value="">-- Select --</option>
          {FITNESS_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex justify-end">
        <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 5.7: Update member settings actions**

Replace `src/app/(dashboard)/member/settings/actions.ts`:

```typescript
'use server';

import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { validateMobile } from '@/lib/validation/user';
import type { UploadConfig } from '@/lib/storage/types';

export interface UpdateProfileState {
  error: string;
}

export async function getAvatarSignatureAction(): Promise<UploadConfig> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const folder = 'avatars';
  const provider = process.env.UPLOAD_PROVIDER;

  if (provider === 'cloudinary') {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
    const apiKey = process.env.CLOUDINARY_API_KEY!;
    const secret = process.env.CLOUDINARY_API_SECRET!;
    const timestamp = Math.floor(Date.now() / 1000);
    const crypto = await import('crypto');
    const signature = crypto
      .createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}${secret}`)
      .digest('hex');
    return { provider: 'cloudinary', uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, apiKey, signature, timestamp, folder, cloudName };
  }

  return { provider: 'local', uploadUrl: '/api/upload', folder };
}

export async function updateMemberProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const firstName = (formData.get('firstName') as string | null)?.trim() || null;
  const lastName = (formData.get('lastName') as string | null)?.trim() || null;
  const mobile = (formData.get('mobile') as string | null) || null;
  const address = (formData.get('address') as string | null)?.trim() || null;
  const avatarUrl = (formData.get('avatarUrl') as string | null) || null;
  const sex = (formData.get('sex') as 'male' | 'female' | null) || null;
  const dateOfBirthRaw = formData.get('dateOfBirth') as string | null;
  const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;
  const fitnessGoal = (formData.get('fitnessGoal') as 'lose_fat' | 'build_muscle' | 'maintain' | 'improve_performance' | null) || null;
  const fitnessLevel = (formData.get('fitnessLevel') as 'beginner' | 'intermediate' | 'advanced' | null) || null;

  if (!firstName || !lastName) return { error: 'First and last name are required' };

  if (mobile) {
    const mobileError = validateMobile(mobile);
    if (mobileError) return { error: mobileError };
  }

  try {
    await connectDB();
    await Promise.all([
      new MongoUserRepository().updateName(session.user.id, firstName, lastName),
      new MongoUserProfileRepository().upsert(session.user.id, {
        mobile,
        address,
        avatarUrl,
        sex,
        fitnessGoal,
        fitnessLevel,
        ...(dateOfBirth !== null && { dateOfBirth }),
      }),
    ]);
    return { error: '' };
  } catch {
    return { error: 'Failed to save profile' };
  }
}
```

- [ ] **Step 5.8: Create account tab (shared across all roles)**

Create `src/app/(dashboard)/member/settings/_components/account-tab.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Props {
  currentEmail: string;
}

export function AccountTab({ currentEmail }: Props) {
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/account/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update email');
      } else {
        toast.success('Email updated — please sign in again to refresh your session');
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-3">Email Address</p>
        {!editing ? (
          <div className="flex items-center justify-between rounded-lg border border-foreground/10 bg-card px-4 py-3">
            <span className="text-sm text-foreground">{currentEmail}</span>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} className="text-foreground/65 hover:text-foreground text-xs cursor-pointer">
              Change
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="new@email.com"
              autoFocus
              className="bg-card border-foreground/10 text-foreground"
            />
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving || !email} size="sm" className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50 cursor-pointer">
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="text-foreground/65 cursor-pointer">
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5.9: Create security tab (shared across all roles)**

Create `src/app/(dashboard)/member/settings/_components/security-tab.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update password');
      } else {
        toast.success('Password updated');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65 mb-4">Change Password</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="currentPassword" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Current Password</label>
            <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required autoComplete="current-password" className="bg-card border-foreground/10 text-foreground" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">New Password</label>
            <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" className="bg-card border-foreground/10 text-foreground" />
            <p className="text-xs text-foreground/65">Min 8 characters, 1 uppercase, 1 number</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Confirm New Password</label>
            <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required autoComplete="new-password" className="bg-card border-foreground/10 text-foreground" />
          </div>
          <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex justify-end">
            <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50 cursor-pointer">
              {saving ? 'Saving...' : 'Update Password'}
            </Button>
          </div>
        </form>
        <p className="mt-4 text-xs text-foreground/65">
          Forgot your password?{' '}
          <Link href="/forgot-password" className="underline text-foreground/80 hover:text-foreground">
            Reset it here
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 5.10: Create trainer settings page + components**

Create `src/app/(dashboard)/trainer/settings/page.tsx` (same structure as member, but with trainer-specific Profile tab fields: bio, specializations, certifications). Follow the exact same pattern as Step 5.5.

Create `src/app/(dashboard)/trainer/settings/_components/profile-tab.tsx` — same as member profile tab but with Bio (textarea), Specializations (comma-separated input), and Certifications (comma-separated input) replacing fitnessGoal/fitnessLevel/sex fields.

Replace `src/app/(dashboard)/trainer/settings/actions.ts` — same pattern as member actions, but upserts `bio`, `specializations`, `certifications` instead of fitness fields.

Copy `account-tab.tsx` and `security-tab.tsx` from the member folder (same components). In `page.tsx`, import them from the same path structure.

- [ ] **Step 5.11: Create owner settings page + components**

Create `src/app/(dashboard)/owner/settings/page.tsx` — tabs: Profile | Account | Security | Gym Info.

```typescript
const TABS = [
  { value: 'profile', label: 'Profile' },
  { value: 'account', label: 'Account' },
  { value: 'security', label: 'Security' },
  { value: 'gym-info', label: 'Gym Info' },
];
```

Owner profile tab: avatar, firstName, lastName, dateOfBirth, mobile, address, certifications. No fitness fields.

Create `src/app/(dashboard)/owner/settings/_components/gym-info-tab.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { updateGymInfoAction } from '../actions';
import type { GymInfoState } from '../actions';
import type { IGymInfo } from '@/lib/db/models/user-profile.model';

interface Props {
  gymInfo: IGymInfo | null;
}

export function GymInfoTab({ gymInfo }: Props) {
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    const result: GymInfoState = await updateGymInfoAction({ error: '' }, formData);
    setSaving(false);
    if (result.error) toast.error(result.error);
    else toast.success('Gym info saved');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {[
        { id: 'gymName', label: 'Gym Name', value: gymInfo?.name },
        { id: 'gymAddress', label: 'Address', value: gymInfo?.address },
        { id: 'gymPhone', label: 'Phone', value: gymInfo?.phone },
        { id: 'gymEmail', label: 'Email', value: gymInfo?.email },
        { id: 'gymWebsite', label: 'Website', value: gymInfo?.website },
      ].map(({ id, label, value }) => (
        <div key={id} className="space-y-1.5">
          <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">{label}</label>
          <Input id={id} name={id} defaultValue={value ?? ''} className="bg-card border-foreground/10 text-foreground" />
        </div>
      ))}
      <div className="space-y-1.5">
        <label htmlFor="gymHours" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Hours</label>
        <Input id="gymHours" name="gymHours" defaultValue={gymInfo?.hours ?? ''} placeholder="Mon–Fri 6am–10pm, Sat–Sun 8am–8pm" className="bg-card border-foreground/10 text-foreground" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="gymDescription" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Description</label>
        <Textarea id="gymDescription" name="gymDescription" defaultValue={gymInfo?.description ?? ''} rows={3} className="bg-card border-foreground/10 text-foreground" />
      </div>
      <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex justify-end">
        <Button type="submit" disabled={saving} className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50 cursor-pointer">
          {saving ? 'Saving...' : 'Save Gym Info'}
        </Button>
      </div>
    </form>
  );
}
```

Replace `src/app/(dashboard)/owner/settings/actions.ts` — add `updateGymInfoAction` and `getAvatarSignatureAction`; remove old `updateOwnerProfileAction` (or rename to `updateOwnerProfileAction` with new fields). Export `GymInfoState` interface.

- [ ] **Step 5.12: Run lint**

```bash
pnpm lint
```

Fix any TypeScript errors.

- [ ] **Step 5.13: Commit**

```bash
git add -A
git commit -m "feat(settings): restructure settings pages with Profile/Account/Security/GymInfo tabs"
```

---

## Stage 6: Sidebar User Popover

**Files:**
- Modify: `src/components/shared/app-shell.tsx`

- [ ] **Step 6.1: Add Popover to AppShell**

In `src/components/shared/app-shell.tsx`, add the Popover import and replace the bottom user area + logoutSlot pattern.

Add imports:
```typescript
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Settings, LogOut } from 'lucide-react';
```

Remove the `ACCOUNT` group from all three role nav configs (member, trainer, owner).

Replace the bottom user area in `SidebarContent`:

```tsx
<div className="border-t border-[#161616] px-3 py-3">
  <Popover>
    <PopoverTrigger asChild>
      <button
        className="flex w-full items-center gap-3 rounded-md px-2 py-2 cursor-pointer hover:bg-[#141414] transition-colors"
        aria-label="User menu"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={userName} className="h-8 w-8 shrink-0 rounded-full object-cover border border-[#222]" />
        ) : (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#222] bg-[#1a1a1a] text-[11px] font-semibold text-[#666]">
            {userInitials}
          </div>
        )}
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[12px] font-medium text-[#888] truncate">{userName}</div>
          <div className="text-[10px] capitalize text-[#555]">{role}</div>
        </div>
      </button>
    </PopoverTrigger>
    <PopoverContent
      side="top"
      align="start"
      className="w-60 p-0 bg-[#141414] border-[#2a2a2a]"
    >
      {/* User info header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#222]">
        {avatarUrl ? (
          <img src={avatarUrl} alt={userName} className="h-9 w-9 shrink-0 rounded-full object-cover border border-[#333]" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#333] bg-[#2a2a2a] text-[12px] font-semibold text-[#777]">
            {userInitials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[#e5e5e5] truncate">{userName}</p>
          <p className="text-[11px] text-[#666] truncate">{userEmail}</p>
        </div>
      </div>
      {/* Menu items */}
      <div className="py-1">
        <a
          href={`/${role}/settings`}
          className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-[#ccc] hover:bg-[#1e1e1e] hover:text-white transition-colors cursor-pointer"
        >
          <Settings className="h-4 w-4 shrink-0 text-[#666]" />
          Profile & Settings
        </a>
        <div className="my-1 border-t border-[#222]" />
        {logoutSlot && (
          <div className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-red-400 hover:bg-[#1e1e1e] transition-colors cursor-pointer">
            <LogOut className="h-4 w-4 shrink-0" />
            {logoutSlot}
          </div>
        )}
      </div>
    </PopoverContent>
  </Popover>
</div>
```

Note: The `LogoutButton` renders a form/button itself. Wrap it in the div above so the LogOut icon shows beside it. You may need to update `LogoutButton` to accept a `className` prop or render as a plain button without its own padding.

- [ ] **Step 6.2: Update app-shell test**

In `__tests__/components/shared/app-shell-active-state.test.tsx`, the test passes `logoutSlot` — verify it still works with the new structure. The test checks nav link active states, not the user menu, so it should pass without changes. Run it to confirm.

```bash
pnpm test -- --testPathPattern="app-shell"
```

- [ ] **Step 6.3: Run lint**

```bash
pnpm lint
```

- [ ] **Step 6.4: Commit**

```bash
git add -A
git commit -m "feat(sidebar): replace ACCOUNT nav link with user Popover menu"
```

---

## Stage 7: Forgot Password + Reset Password Pages

**Files:**
- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`

- [ ] **Step 7.1: Create forgot-password page**

Create `src/app/(auth)/forgot-password/page.tsx`:

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030303] px-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-white mb-1">POWER GYM</div>
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-white">Forgot password</h1>
          <p className="mt-1 text-[13px] text-[#888]">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <p className="text-[13px] text-[#aaa]">
              If that email exists, you'll receive a reset link shortly. Check your inbox.
            </p>
            <Link href="/login" className="text-[13px] text-white underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555] focus-visible:ring-white"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>
            <Link href="/login" className="block text-center text-[13px] text-[#666] hover:text-[#999]">
              Back to sign in
            </Link>
          </form>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 7.2: Create reset-password page**

Create `src/app/(auth)/reset-password/page.tsx`:

```tsx
'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';
  const userId = searchParams.get('id') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, userId, newPassword }),
    });
    const data = await res.json() as { error?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? 'Reset failed. The link may have expired.');
    } else {
      router.push('/login?message=password-reset');
    }
  }

  if (!token || !userId) {
    return (
      <p className="text-[13px] text-red-400">
        Invalid reset link. Please request a new one.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="newPassword" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          New Password
        </label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
        />
        <p className="text-[11px] text-[#666]">Min 8 characters, 1 uppercase, 1 number</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white focus-visible:ring-white"
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black hover:bg-white/90 font-semibold mt-2 disabled:opacity-50 cursor-pointer"
      >
        {loading ? 'Resetting...' : 'Reset Password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#030303] px-4">
      <div className="w-full max-w-sm space-y-8">
        <div>
          <div className="text-[11px] font-bold tracking-[3px] text-white mb-1">POWER GYM</div>
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-white">Reset password</h1>
          <p className="mt-1 text-[13px] text-[#888]">Enter your new password below.</p>
        </div>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
```

- [ ] **Step 7.3: Update login page to show password-reset success message**

In `src/app/(auth)/login/page.tsx`, add a success message when `?message=password-reset`:

```tsx
// In searchParams destructuring, add:
const { error, message } = await searchParams;

// Add below the error message block:
{message === 'password-reset' && (
  <p className="text-[13px] text-green-400">Password reset successfully. Please sign in.</p>
)}
```

- [ ] **Step 7.4: Commit**

```bash
git add -A
git commit -m "feat(auth): add forgot-password and reset-password pages"
```

---

## Stage 8: Final Verification

- [ ] **Step 8.1: Run full test suite**

```bash
pnpm test
```

Expected: 100% pass. If any fail, fix them before proceeding.

- [ ] **Step 8.2: Run lint**

```bash
pnpm lint
```

Expected: no warnings or errors.

- [ ] **Step 8.3: Build check**

```bash
pnpm build
```

Expected: clean build with no TypeScript errors.

- [ ] **Step 8.4: Manual smoke test**

Start dev server: `pnpm dev`

1. Visit `/register` — confirm First Name + Last Name fields appear
2. Register as owner — confirm redirect to dashboard
3. Check sidebar bottom — confirm user popover appears with name + email
4. Click "Profile & Settings" — confirm settings page loads with Profile/Account/Security tabs
5. Upload an avatar on Profile tab — confirm it saves and shows in sidebar
6. Change password on Security tab — confirm success toast
7. Visit `/forgot-password` — enter email, confirm "If that email exists..." message
8. Owner: confirm Gym Info tab appears with all fields

- [ ] **Step 8.5: Final commit**

```bash
git add -A
git commit -m "feat(profile): complete profile & account redesign"
```
