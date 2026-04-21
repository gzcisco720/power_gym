# Auth System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Auth.js v5 authentication with three roles (owner/trainer/member), invite-link registration, and email delivery via Nodemailer.

**Architecture:** JWT session strategy (httpOnly cookie, no DB adapter). User and InviteToken models in MongoDB via Mongoose, accessed through repository interfaces for testability. Email delivered via Nodemailer behind an `IEmailService` interface, switching between MailTrap (dev) and SMTP (prod) via `EMAIL_PROVIDER` env var.

**Tech Stack:** Next.js 16 App Router, next-auth@beta (Auth.js v5), Mongoose, bcryptjs, Nodemailer, Jest + React Testing Library

---

## File Map

```text
Files to create:
  src/types/auth.ts
  src/lib/db/connect.ts
  src/lib/db/models/user.model.ts
  src/lib/db/models/invite-token.model.ts
  src/lib/repositories/user.repository.ts
  src/lib/repositories/invite.repository.ts
  src/lib/auth/auth.ts
  src/lib/auth/invite.ts
  src/lib/auth/middleware-helpers.ts
  src/lib/email/index.ts
  src/lib/email/nodemailer.ts
  src/lib/email/templates/invite.ts
  src/app/api/auth/[...nextauth]/route.ts
  src/app/api/auth/register/route.ts
  src/app/api/invites/route.ts
  src/middleware.ts
  src/app/(auth)/login/page.tsx
  src/app/(auth)/register/page.tsx
  .env.local

Tests to create:
  __tests__/lib/repositories/user.repository.test.ts
  __tests__/lib/repositories/invite.repository.test.ts
  __tests__/lib/auth/authorize.test.ts
  __tests__/lib/auth/invite.test.ts
  __tests__/lib/auth/middleware-helpers.test.ts
  __tests__/lib/email/nodemailer.test.ts
  __tests__/app/api/auth/register.test.ts
  __tests__/app/api/invites.test.ts
```

---

## Task 1: Install dependencies & create .env.local

**Files:**
- Modify: `package.json` (via pnpm)
- Create: `.env.local`

- [ ] **Step 1: Install auth and email packages**

```bash
pnpm add next-auth@beta bcryptjs nodemailer
pnpm add -D @types/bcryptjs @types/nodemailer
```

Expected: packages added with no errors.

- [ ] **Step 2: Create .env.local**

```bash
# .env.local
AUTH_SECRET=replace_with_output_of_openssl_rand_base64_32
AUTH_URL=http://localhost:3000

MONGODB_URI=mongodb://localhost:27017/power_gym

# Email — development (MailTrap)
EMAIL_PROVIDER=mailtrap
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=your_mailtrap_user
MAILTRAP_PASS=your_mailtrap_pass
SMTP_FROM=noreply@powergym.local

# Email — production (set EMAIL_PROVIDER=smtp and fill these)
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
# SMTP_FROM=noreply@yourgym.com
```

- [ ] **Step 3: Generate AUTH_SECRET and paste into .env.local**

```bash
openssl rand -base64 32
```

- [ ] **Step 4: Add .env.local to .gitignore**

Open `.gitignore` and confirm `.env.local` is listed. If not, add it.

---

## Task 2: TypeScript type definitions

**Files:**
- Create: `src/types/auth.ts`

- [ ] **Step 1: Write failing type-check test**

Create `__tests__/lib/auth/types.test.ts`:

```ts
import type { UserRole } from '@/types/auth';

describe('UserRole', () => {
  it('accepts valid roles', () => {
    const roles: UserRole[] = ['owner', 'trainer', 'member'];
    expect(roles).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=types.test
```

Expected: FAIL — cannot find module `@/types/auth`.

- [ ] **Step 3: Create src/types/auth.ts**

```ts
import type { DefaultSession } from 'next-auth';

export type UserRole = 'owner' | 'trainer' | 'member';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      trainerId: string | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: UserRole;
    trainerId: string | null;
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern=types.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/auth.ts __tests__/lib/auth/types.test.ts .env.local .gitignore
git commit -m "feat: add auth types and environment setup"
```

---

## Task 3: MongoDB connection singleton

**Files:**
- Create: `src/lib/db/connect.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/db/connect.test.ts`:

```ts
import mongoose from 'mongoose';

jest.mock('mongoose', () => ({
  connect: jest.fn().mockResolvedValue(undefined),
  connection: { readyState: 0 },
}));

describe('connectDB', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('calls mongoose.connect with MONGODB_URI when not connected', async () => {
    process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
    (mongoose.connection as { readyState: number }).readyState = 0;

    const { connectDB } = await import('@/lib/db/connect');
    await connectDB();

    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://localhost:27017/test');
  });

  it('does not call mongoose.connect when already connected', async () => {
    (mongoose.connection as { readyState: number }).readyState = 1;

    const { connectDB } = await import('@/lib/db/connect');
    await connectDB();

    expect(mongoose.connect).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=connect.test
```

Expected: FAIL — cannot find module `@/lib/db/connect`.

- [ ] **Step 3: Create src/lib/db/connect.ts**

```ts
import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState >= 1) return;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not defined');

  await mongoose.connect(uri);
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern=connect.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/connect.ts __tests__/lib/db/connect.test.ts
git commit -m "feat: add MongoDB connection singleton"
```

---

## Task 4: Mongoose models

**Files:**
- Create: `src/lib/db/models/user.model.ts`
- Create: `src/lib/db/models/invite-token.model.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/db/models.test.ts`:

```ts
import mongoose from 'mongoose';

describe('UserModel schema', () => {
  it('requires email and role fields', async () => {
    const { UserModel } = await import('@/lib/db/models/user.model');
    const user = new UserModel({});
    const err = user.validateSync();
    expect(err?.errors['email']).toBeDefined();
    expect(err?.errors['role']).toBeDefined();
  });

  it('rejects invalid role', async () => {
    const { UserModel } = await import('@/lib/db/models/user.model');
    const user = new UserModel({
      name: 'Test',
      email: 'test@test.com',
      passwordHash: 'hash',
      role: 'superadmin',
    });
    const err = user.validateSync();
    expect(err?.errors['role']).toBeDefined();
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

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=models.test
```

Expected: FAIL — cannot find modules.

- [ ] **Step 3: Create src/lib/db/models/user.model.ts**

```ts
import mongoose, { Document, Model, Schema } from 'mongoose';
import type { UserRole } from '@/types/auth';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  trainerId: mongoose.Types.ObjectId | null;
  gymId: mongoose.Types.ObjectId | null;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['owner', 'trainer', 'member'], required: true },
    trainerId: { type: Schema.Types.ObjectId, default: null },
    gymId: { type: Schema.Types.ObjectId, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const UserModel: Model<IUser> =
  mongoose.models.User ?? mongoose.model<IUser>('User', UserSchema);
```

- [ ] **Step 4: Create src/lib/db/models/invite-token.model.ts**

```ts
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IInviteToken extends Document {
  token: string;
  role: 'trainer' | 'member';
  invitedBy: mongoose.Types.ObjectId;
  recipientEmail: string;
  expiresAt: Date;
  usedAt: Date | null;
}

const InviteTokenSchema = new Schema<IInviteToken>({
  token: { type: String, required: true, unique: true },
  role: { type: String, enum: ['trainer', 'member'], required: true },
  invitedBy: { type: Schema.Types.ObjectId, required: true },
  recipientEmail: { type: String, required: true, lowercase: true, trim: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
});

export const InviteTokenModel: Model<IInviteToken> =
  mongoose.models.InviteToken ??
  mongoose.model<IInviteToken>('InviteToken', InviteTokenSchema);
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern=models.test
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/db/models/ __tests__/lib/db/models.test.ts
git commit -m "feat: add User and InviteToken Mongoose models"
```

---

## Task 5: User Repository

**Files:**
- Create: `src/lib/repositories/user.repository.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/repositories/user.repository.test.ts`:

```ts
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { UserModel } from '@/lib/db/models/user.model';

jest.mock('@/lib/db/models/user.model', () => ({
  UserModel: {
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  },
}));

const mockUserModel = jest.mocked(UserModel);

describe('MongoUserRepository', () => {
  let repo: MongoUserRepository;

  beforeEach(() => {
    repo = new MongoUserRepository();
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('returns user when found', async () => {
      const mockUser = { _id: 'id1', email: 'test@test.com', role: 'owner' };
      mockUserModel.findOne.mockResolvedValue(mockUser as never);

      const result = await repo.findByEmail('test@test.com');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({ email: 'test@test.com' });
      expect(result).toEqual(mockUser);
    });

    it('returns null when not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null as never);

      const result = await repo.findByEmail('nobody@test.com');

      expect(result).toBeNull();
    });
  });

  describe('count', () => {
    it('returns number of users', async () => {
      mockUserModel.countDocuments.mockResolvedValue(3 as never);

      const result = await repo.count();

      expect(result).toBe(3);
    });
  });

  describe('create', () => {
    it('saves and returns a new user', async () => {
      const saveMock = jest.fn().mockResolvedValue({ _id: 'new', email: 'new@test.com' });
      (UserModel as unknown as jest.Mock).mockImplementation(() => ({ save: saveMock }));

      await repo.create({
        name: 'New',
        email: 'new@test.com',
        passwordHash: 'hash',
        role: 'owner',
        trainerId: null,
      });

      expect(saveMock).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=user.repository.test
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Create src/lib/repositories/user.repository.ts**

```ts
import type { IUser } from '@/lib/db/models/user.model';
import { UserModel } from '@/lib/db/models/user.model';
import type { UserRole } from '@/types/auth';

export interface CreateUserData {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  trainerId: string | null;
}

export interface IUserRepository {
  findByEmail(email: string): Promise<IUser | null>;
  count(): Promise<number>;
  create(data: CreateUserData): Promise<IUser>;
}

export class MongoUserRepository implements IUserRepository {
  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email });
  }

  async count(): Promise<number> {
    return UserModel.countDocuments();
  }

  async create(data: CreateUserData): Promise<IUser> {
    const user = new UserModel(data);
    return user.save();
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern=user.repository.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/user.repository.ts __tests__/lib/repositories/user.repository.test.ts
git commit -m "feat: add IUserRepository and MongoUserRepository"
```

---

## Task 6: Invite Repository

**Files:**
- Create: `src/lib/repositories/invite.repository.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/repositories/invite.repository.test.ts`:

```ts
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { InviteTokenModel } from '@/lib/db/models/invite-token.model';

jest.mock('@/lib/db/models/invite-token.model', () => ({
  InviteTokenModel: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

const mockModel = jest.mocked(InviteTokenModel);

describe('MongoInviteRepository', () => {
  let repo: MongoInviteRepository;

  beforeEach(() => {
    repo = new MongoInviteRepository();
    jest.clearAllMocks();
  });

  describe('findByToken', () => {
    it('returns invite when found', async () => {
      const mockInvite = { token: 'abc', role: 'member' };
      mockModel.findOne.mockResolvedValue(mockInvite as never);

      const result = await repo.findByToken('abc');

      expect(mockModel.findOne).toHaveBeenCalledWith({ token: 'abc' });
      expect(result).toEqual(mockInvite);
    });

    it('returns null when not found', async () => {
      mockModel.findOne.mockResolvedValue(null as never);

      const result = await repo.findByToken('missing');

      expect(result).toBeNull();
    });
  });

  describe('markUsed', () => {
    it('sets usedAt on the token', async () => {
      mockModel.findOneAndUpdate.mockResolvedValue({} as never);

      await repo.markUsed('abc');

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { token: 'abc' },
        { $set: { usedAt: expect.any(Date) } },
      );
    });
  });

  describe('create', () => {
    it('saves and returns a new invite token', async () => {
      const saveMock = jest.fn().mockResolvedValue({ token: 'uuid' });
      (InviteTokenModel as unknown as jest.Mock).mockImplementation(() => ({
        save: saveMock,
      }));

      await repo.create({
        token: 'uuid',
        role: 'member',
        invitedBy: 'inviter-id',
        recipientEmail: 'user@test.com',
        expiresAt: new Date(),
      });

      expect(saveMock).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=invite.repository.test
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Create src/lib/repositories/invite.repository.ts**

```ts
import type { IInviteToken } from '@/lib/db/models/invite-token.model';
import { InviteTokenModel } from '@/lib/db/models/invite-token.model';

export interface CreateInviteData {
  token: string;
  role: 'trainer' | 'member';
  invitedBy: string;
  recipientEmail: string;
  expiresAt: Date;
}

export interface IInviteRepository {
  findByToken(token: string): Promise<IInviteToken | null>;
  create(data: CreateInviteData): Promise<IInviteToken>;
  markUsed(token: string): Promise<void>;
}

export class MongoInviteRepository implements IInviteRepository {
  async findByToken(token: string): Promise<IInviteToken | null> {
    return InviteTokenModel.findOne({ token });
  }

  async create(data: CreateInviteData): Promise<IInviteToken> {
    const invite = new InviteTokenModel(data);
    return invite.save();
  }

  async markUsed(token: string): Promise<void> {
    await InviteTokenModel.findOneAndUpdate({ token }, { $set: { usedAt: new Date() } });
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern=invite.repository.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/invite.repository.ts __tests__/lib/repositories/invite.repository.test.ts
git commit -m "feat: add IInviteRepository and MongoInviteRepository"
```

---

## Task 7: authorizeCredentials helper

**Files:**
- Create: `src/lib/auth/auth.ts` (the `authorizeCredentials` export only — full NextAuth config added in Task 8)

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/auth/authorize.test.ts`:

```ts
import bcrypt from 'bcryptjs';
import { authorizeCredentials } from '@/lib/auth/auth';
import type { IUserRepository } from '@/lib/repositories/user.repository';
import type { IUser } from '@/lib/db/models/user.model';

jest.mock('bcryptjs');
const mockBcrypt = jest.mocked(bcrypt);

function makeRepo(user: Partial<IUser> | null): IUserRepository {
  return {
    findByEmail: jest.fn().mockResolvedValue(user),
    count: jest.fn(),
    create: jest.fn(),
  };
}

describe('authorizeCredentials', () => {
  it('returns null when user is not found', async () => {
    const repo = makeRepo(null);
    const result = await authorizeCredentials('a@b.com', 'pass', repo);
    expect(result).toBeNull();
  });

  it('returns null when password is wrong', async () => {
    const repo = makeRepo({ passwordHash: 'hash' } as IUser);
    mockBcrypt.compare.mockResolvedValue(false as never);

    const result = await authorizeCredentials('a@b.com', 'wrong', repo);
    expect(result).toBeNull();
  });

  it('returns user object when credentials are valid', async () => {
    const mockUser = {
      _id: { toString: () => 'user-id' },
      name: 'Alice',
      email: 'alice@test.com',
      passwordHash: 'hash',
      role: 'owner',
      trainerId: null,
    } as unknown as IUser;

    const repo = makeRepo(mockUser);
    mockBcrypt.compare.mockResolvedValue(true as never);

    const result = await authorizeCredentials('alice@test.com', 'pass', repo);

    expect(result).toEqual({
      id: 'user-id',
      name: 'Alice',
      email: 'alice@test.com',
      role: 'owner',
      trainerId: null,
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=authorize.test
```

Expected: FAIL — cannot find module `@/lib/auth/auth`.

- [ ] **Step 3: Create src/lib/auth/auth.ts with authorizeCredentials**

```ts
import bcrypt from 'bcryptjs';
import type { IUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

export interface AuthorizedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  trainerId: string | null;
}

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
    name: user.name,
    email: user.email,
    role: user.role,
    trainerId: user.trainerId?.toString() ?? null,
  };
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern=authorize.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/auth.ts __tests__/lib/auth/authorize.test.ts
git commit -m "feat: add authorizeCredentials helper"
```

---

## Task 8: Auth.js config + route handler

**Files:**
- Modify: `src/lib/auth/auth.ts` (add NextAuth config)
- Create: `src/app/api/auth/[...nextauth]/route.ts`

No new tests for this task — the NextAuth wiring is integration-level and covered by the `authorizeCredentials` unit tests and future E2E tests.

- [ ] **Step 1: Add NextAuth config to src/lib/auth/auth.ts**

Replace the entire file:

```ts
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { IUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

export interface AuthorizedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  trainerId: string | null;
}

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
    name: user.name,
    email: user.email,
    role: user.role,
    trainerId: user.trainerId?.toString() ?? null,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        await connectDB();
        const repo = new MongoUserRepository();
        return authorizeCredentials(
          credentials.email as string,
          credentials.password as string,
          repo,
        );
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as AuthorizedUser;
        token.id = u.id;
        token.role = u.role;
        token.trainerId = u.trainerId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      session.user.trainerId = token.trainerId;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
```

- [ ] **Step 2: Create src/app/api/auth/[...nextauth]/route.ts**

```ts
import { handlers } from '@/lib/auth/auth';

export const { GET, POST } = handlers;
```

- [ ] **Step 3: Run existing tests to confirm nothing is broken**

```bash
pnpm test -- --testPathPattern=authorize.test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/auth/auth.ts src/app/api/auth/
git commit -m "feat: add NextAuth config and route handler"
```

---

## Task 9: Invite helpers

**Files:**
- Create: `src/lib/auth/invite.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/auth/invite.test.ts`:

```ts
import { createInviteToken, validateInviteToken } from '@/lib/auth/invite';
import type { IInviteRepository } from '@/lib/repositories/invite.repository';
import type { IInviteToken } from '@/lib/db/models/invite-token.model';

function makeRepo(): jest.Mocked<IInviteRepository> {
  return {
    findByToken: jest.fn(),
    create: jest.fn(),
    markUsed: jest.fn(),
  };
}

describe('createInviteToken', () => {
  it('creates token with 48h expiry and correct fields', async () => {
    const repo = makeRepo();
    const now = Date.now();
    repo.create.mockResolvedValue({ token: 'uuid', role: 'member' } as IInviteToken);

    await createInviteToken(
      { role: 'member', invitedBy: 'owner-id', recipientEmail: 'User@Test.com' },
      repo,
    );

    const call = repo.create.mock.calls[0][0];
    expect(call.role).toBe('member');
    expect(call.invitedBy).toBe('owner-id');
    expect(call.recipientEmail).toBe('user@test.com');
    expect(call.expiresAt.getTime()).toBeGreaterThan(now + 47 * 60 * 60 * 1000);
    expect(typeof call.token).toBe('string');
    expect(call.token.length).toBeGreaterThan(0);
  });
});

describe('validateInviteToken', () => {
  it('returns invalid when invite is null', () => {
    const result = validateInviteToken(null);
    expect(result.valid).toBe(false);
  });

  it('returns invalid when already used', () => {
    const invite = { usedAt: new Date(), expiresAt: new Date(Date.now() + 10000) } as IInviteToken;
    const result = validateInviteToken(invite);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('already-used');
  });

  it('returns invalid when expired', () => {
    const invite = { usedAt: null, expiresAt: new Date(Date.now() - 1000) } as IInviteToken;
    const result = validateInviteToken(invite);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe('expired');
  });

  it('returns valid with invite when all checks pass', () => {
    const invite = {
      usedAt: null,
      expiresAt: new Date(Date.now() + 10000),
    } as IInviteToken;
    const result = validateInviteToken(invite);
    expect(result.valid).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=invite.test
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Create src/lib/auth/invite.ts**

```ts
import crypto from 'crypto';
import type { IInviteToken } from '@/lib/db/models/invite-token.model';
import type { IInviteRepository } from '@/lib/repositories/invite.repository';

interface CreateInviteParams {
  role: 'trainer' | 'member';
  invitedBy: string;
  recipientEmail: string;
}

type ValidationResult =
  | { valid: false; reason: 'not-found' | 'already-used' | 'expired' }
  | { valid: true; invite: IInviteToken };

export async function createInviteToken(
  params: CreateInviteParams,
  repo: IInviteRepository,
): Promise<IInviteToken> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

  return repo.create({
    token,
    role: params.role,
    invitedBy: params.invitedBy,
    recipientEmail: params.recipientEmail.toLowerCase(),
    expiresAt,
  });
}

export function validateInviteToken(invite: IInviteToken | null): ValidationResult {
  if (!invite) return { valid: false, reason: 'not-found' };
  if (invite.usedAt) return { valid: false, reason: 'already-used' };
  if (invite.expiresAt < new Date()) return { valid: false, reason: 'expired' };
  return { valid: true, invite };
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern=invite.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/invite.ts __tests__/lib/auth/invite.test.ts
git commit -m "feat: add createInviteToken and validateInviteToken helpers"
```

---

## Task 10: Middleware helpers

**Files:**
- Create: `src/lib/auth/middleware-helpers.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/auth/middleware-helpers.test.ts`:

```ts
import { getRedirectForRole } from '@/lib/auth/middleware-helpers';

describe('getRedirectForRole', () => {
  it('returns null when owner accesses owner dashboard', () => {
    expect(getRedirectForRole('owner', '/dashboard/owner')).toBeNull();
  });

  it('returns null when owner accesses trainer dashboard', () => {
    expect(getRedirectForRole('owner', '/dashboard/trainer/clients')).toBeNull();
  });

  it('returns null when trainer accesses member dashboard', () => {
    expect(getRedirectForRole('trainer', '/dashboard/member/plan')).toBeNull();
  });

  it('returns member redirect when trainer accesses owner dashboard', () => {
    expect(getRedirectForRole('trainer', '/dashboard/owner')).toBe('/dashboard/trainer');
  });

  it('returns member redirect when member accesses trainer dashboard', () => {
    expect(getRedirectForRole('member', '/dashboard/trainer')).toBe('/dashboard/member');
  });

  it('returns null when member accesses member dashboard', () => {
    expect(getRedirectForRole('member', '/dashboard/member')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=middleware-helpers.test
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Create src/lib/auth/middleware-helpers.ts**

```ts
import type { UserRole } from '@/types/auth';

const ROLE_ALLOWED_PREFIXES: Record<UserRole, string[]> = {
  owner: ['/dashboard/owner', '/dashboard/trainer', '/dashboard/member'],
  trainer: ['/dashboard/trainer', '/dashboard/member'],
  member: ['/dashboard/member'],
};

export function getRedirectForRole(role: UserRole, path: string): string | null {
  const allowed = ROLE_ALLOWED_PREFIXES[role];
  const isAllowed = allowed.some((prefix) => path.startsWith(prefix));
  if (isAllowed) return null;
  return `/dashboard/${role}`;
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern=middleware-helpers.test
```

Expected: PASS.

- [ ] **Step 5: Create src/middleware.ts**

```ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/auth';
import { getRedirectForRole } from '@/lib/auth/middleware-helpers';
import type { UserRole } from '@/types/auth';

export default auth((req) => {
  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  const role = req.auth.user.role as UserRole;
  const redirect = getRedirectForRole(role, req.nextUrl.pathname);

  if (redirect) {
    return NextResponse.redirect(new URL(redirect, req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth/middleware-helpers.ts src/middleware.ts __tests__/lib/auth/middleware-helpers.test.ts
git commit -m "feat: add middleware helpers and route protection middleware"
```

---

## Task 11: Email service

**Files:**
- Create: `src/lib/email/templates/invite.ts`
- Create: `src/lib/email/nodemailer.ts`
- Create: `src/lib/email/index.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/lib/email/nodemailer.test.ts`:

```ts
import nodemailer from 'nodemailer';

jest.mock('nodemailer');
const mockNodemailer = jest.mocked(nodemailer);

describe('NodemailerEmailService', () => {
  const sendMailMock = jest.fn().mockResolvedValue({});

  beforeEach(() => {
    jest.clearAllMocks();
    mockNodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock } as never);
    process.env.EMAIL_PROVIDER = 'mailtrap';
    process.env.MAILTRAP_HOST = 'sandbox.smtp.mailtrap.io';
    process.env.MAILTRAP_PORT = '2525';
    process.env.MAILTRAP_USER = 'user';
    process.env.MAILTRAP_PASS = 'pass';
    process.env.SMTP_FROM = 'noreply@test.com';
  });

  it('calls sendMail with correct to address', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();

    await service.sendInvite({
      to: 'invited@test.com',
      inviterName: 'Coach Bob',
      role: 'member',
      inviteUrl: 'http://localhost:3000/register?token=abc',
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'invited@test.com' }),
    );
  });

  it('includes role in email subject', async () => {
    const { NodemailerEmailService } = await import('@/lib/email/nodemailer');
    const service = new NodemailerEmailService();

    await service.sendInvite({
      to: 'invited@test.com',
      inviterName: 'Coach Bob',
      role: 'trainer',
      inviteUrl: 'http://localhost:3000/register?token=abc',
    });

    const callArgs = sendMailMock.mock.calls[0][0] as { subject: string };
    expect(callArgs.subject.toLowerCase()).toContain('trainer');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=nodemailer.test
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Create src/lib/email/templates/invite.ts**

```ts
export function inviteEmailTemplate(params: {
  inviterName: string;
  role: 'trainer' | 'member';
  inviteUrl: string;
}): { subject: string; html: string } {
  const roleLabel = params.role === 'trainer' ? 'Trainer' : 'Member';

  return {
    subject: `You've been invited as a ${roleLabel} — POWER GYM`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>You've been invited to POWER GYM</h2>
        <p><strong>${params.inviterName}</strong> has invited you to join as a <strong>${roleLabel}</strong>.</p>
        <p>Click the link below to create your account. This link expires in 48 hours.</p>
        <a
          href="${params.inviteUrl}"
          style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;"
        >
          Accept Invitation
        </a>
        <p style="color:#666;font-size:12px;margin-top:24px;">
          If you weren't expecting this, you can safely ignore this email.
        </p>
      </div>
    `,
  };
}
```

- [ ] **Step 4: Create src/lib/email/index.ts**

```ts
export interface SendInviteParams {
  to: string;
  inviterName: string;
  role: 'trainer' | 'member';
  inviteUrl: string;
}

export interface IEmailService {
  sendInvite(params: SendInviteParams): Promise<void>;
}

export function getEmailService(): IEmailService {
  const { NodemailerEmailService } = require('@/lib/email/nodemailer') as {
    NodemailerEmailService: new () => IEmailService;
  };
  return new NodemailerEmailService();
}
```

- [ ] **Step 5: Create src/lib/email/nodemailer.ts**

```ts
import nodemailer from 'nodemailer';
import type { IEmailService, SendInviteParams } from '@/lib/email/index';
import { inviteEmailTemplate } from '@/lib/email/templates/invite';

function createTransport() {
  const provider = process.env.EMAIL_PROVIDER;

  if (provider === 'mailtrap') {
    return nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: Number(process.env.MAILTRAP_PORT ?? 2525),
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export class NodemailerEmailService implements IEmailService {
  async sendInvite(params: SendInviteParams): Promise<void> {
    const transporter = createTransport();
    const { subject, html } = inviteEmailTemplate({
      inviterName: params.inviterName,
      role: params.role,
      inviteUrl: params.inviteUrl,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: params.to,
      subject,
      html,
    });
  }
}
```

- [ ] **Step 6: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern=nodemailer.test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/email/ __tests__/lib/email/
git commit -m "feat: add IEmailService, NodemailerEmailService, and invite email template"
```

---

## Task 12: Register API route

**Files:**
- Create: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/app/api/auth/register.test.ts`:

```ts
import bcrypt from 'bcryptjs';

jest.mock('bcryptjs');
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ signIn: jest.fn() }));

const mockUserRepo = {
  findByEmail: jest.fn(),
  count: jest.fn(),
  create: jest.fn(),
};
const mockInviteRepo = {
  findByToken: jest.fn(),
  create: jest.fn(),
  markUsed: jest.fn(),
};

jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));
jest.mock('@/lib/repositories/invite.repository', () => ({
  MongoInviteRepository: jest.fn(() => mockInviteRepo),
}));

const mockBcrypt = jest.mocked(bcrypt);

function makeRequest(body: object) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates owner when no users exist', async () => {
    mockUserRepo.count.mockResolvedValue(0);
    mockUserRepo.create.mockResolvedValue({});
    mockBcrypt.hash.mockResolvedValue('hashed' as never);

    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(makeRequest({ name: 'Owner', email: 'owner@test.com', password: 'pass' }));
    const data = await res.json() as { success: boolean };

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'owner' }),
    );
  });

  it('returns 403 when no token and users exist', async () => {
    mockUserRepo.count.mockResolvedValue(1);

    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(makeRequest({ name: 'X', email: 'x@test.com', password: 'pass' }));

    expect(res.status).toBe(403);
  });

  it('returns 400 when invite token is invalid', async () => {
    mockInviteRepo.findByToken.mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(makeRequest({ name: 'X', email: 'x@test.com', password: 'pass', token: 'bad' }));

    expect(res.status).toBe(400);
  });

  it('returns 400 when email does not match invite', async () => {
    mockInviteRepo.findByToken.mockResolvedValue({
      usedAt: null,
      expiresAt: new Date(Date.now() + 10000),
      recipientEmail: 'other@test.com',
      role: 'member',
      invitedBy: 'inviter-id',
    });

    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(makeRequest({ name: 'X', email: 'x@test.com', password: 'pass', token: 'tok' }));

    expect(res.status).toBe(400);
  });

  it('creates user with role from invite on valid token', async () => {
    mockInviteRepo.findByToken.mockResolvedValue({
      token: 'tok',
      usedAt: null,
      expiresAt: new Date(Date.now() + 10000),
      recipientEmail: 'invited@test.com',
      role: 'member',
      invitedBy: { toString: () => 'inviter-id' },
    });
    mockUserRepo.create.mockResolvedValue({});
    mockBcrypt.hash.mockResolvedValue('hashed' as never);

    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(makeRequest({ name: 'New', email: 'invited@test.com', password: 'pass', token: 'tok' }));

    expect(res.status).toBe(200);
    expect(mockUserRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'member', trainerId: 'inviter-id' }),
    );
    expect(mockInviteRepo.markUsed).toHaveBeenCalledWith('tok');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=register.test
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Create src/app/api/auth/register/route.ts**

```ts
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { validateInviteToken } from '@/lib/auth/invite';

export async function POST(req: Request): Promise<Response> {
  const { name, email, password, token } = (await req.json()) as {
    name: string;
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
    await userRepo.create({ name, email, passwordHash, role: 'owner', trainerId: null });
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
    name,
    email,
    passwordHash,
    role: validation.invite.role,
    trainerId: validation.invite.invitedBy.toString(),
  });
  await inviteRepo.markUsed(token);

  return Response.json({ success: true });
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern=register.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/auth/register/ __tests__/app/api/auth/register.test.ts
git commit -m "feat: add register API route (owner bootstrap + invite flow)"
```

---

## Task 13: Invites API route

**Files:**
- Create: `src/app/api/invites/route.ts`

- [ ] **Step 1: Write failing test**

Create `__tests__/app/api/invites.test.ts`:

```ts
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/email/index', () => ({ getEmailService: jest.fn() }));

const mockInviteRepo = {
  findByToken: jest.fn(),
  create: jest.fn().mockResolvedValue({ token: 'new-uuid' }),
  markUsed: jest.fn(),
};
jest.mock('@/lib/repositories/invite.repository', () => ({
  MongoInviteRepository: jest.fn(() => mockInviteRepo),
}));
jest.mock('@/lib/auth/invite', () => ({
  createInviteToken: jest.fn().mockResolvedValue({ token: 'new-uuid' }),
}));

import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';

const mockAuth = jest.mocked(auth);
const mockGetEmailService = jest.mocked(getEmailService);

function makeRequest(body: object) {
  return new Request('http://localhost/api/invites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/invites', () => {
  const sendInviteMock = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEmailService.mockReturnValue({ sendInvite: sendInviteMock });
    process.env.AUTH_URL = 'http://localhost:3000';
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null as never);

    const { POST } = await import('@/app/api/invites/route');
    const res = await POST(makeRequest({ role: 'member', recipientEmail: 'a@b.com' }));

    expect(res.status).toBe(401);
  });

  it('returns 403 when trainer tries to invite trainer', async () => {
    mockAuth.mockResolvedValue({ user: { role: 'trainer', id: 't1', name: 'T' } } as never);

    const { POST } = await import('@/app/api/invites/route');
    const res = await POST(makeRequest({ role: 'trainer', recipientEmail: 'a@b.com' }));

    expect(res.status).toBe(403);
  });

  it('creates invite and sends email when owner invites trainer', async () => {
    mockAuth.mockResolvedValue({
      user: { role: 'owner', id: 'owner-id', name: 'Owner' },
    } as never);

    const { POST } = await import('@/app/api/invites/route');
    const res = await POST(makeRequest({ role: 'trainer', recipientEmail: 'trainer@test.com' }));
    const data = await res.json() as { inviteUrl: string };

    expect(res.status).toBe(200);
    expect(data.inviteUrl).toContain('new-uuid');
    expect(sendInviteMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'trainer@test.com', role: 'trainer' }),
    );
  });

  it('creates invite and sends email when trainer invites member', async () => {
    mockAuth.mockResolvedValue({
      user: { role: 'trainer', id: 'trainer-id', name: 'Trainer' },
    } as never);

    const { POST } = await import('@/app/api/invites/route');
    const res = await POST(makeRequest({ role: 'member', recipientEmail: 'member@test.com' }));

    expect(res.status).toBe(200);
    expect(sendInviteMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=invites.test
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Create src/app/api/invites/route.ts**

```ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { createInviteToken } from '@/lib/auth/invite';
import { getEmailService } from '@/lib/email/index';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import type { UserRole } from '@/types/auth';

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { role, recipientEmail } = (await req.json()) as {
    role: 'trainer' | 'member';
    recipientEmail: string;
  };

  const callerRole = session.user.role as UserRole;

  if (role === 'trainer' && callerRole !== 'owner') {
    return Response.json({ error: 'Only owners can invite trainers' }, { status: 403 });
  }
  if (role === 'member' && callerRole === 'member') {
    return Response.json({ error: 'Members cannot send invites' }, { status: 403 });
  }

  await connectDB();
  const inviteRepo = new MongoInviteRepository();
  const inviteToken = await createInviteToken(
    { role, invitedBy: session.user.id, recipientEmail },
    inviteRepo,
  );

  const baseUrl = process.env.AUTH_URL ?? 'http://localhost:3000';
  const inviteUrl = `${baseUrl}/register?token=${inviteToken.token}`;

  const emailService = getEmailService();
  await emailService.sendInvite({
    to: recipientEmail,
    inviterName: session.user.name ?? 'Your trainer',
    role,
    inviteUrl,
  });

  return Response.json({ inviteUrl });
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
pnpm test -- --testPathPattern=invites.test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/invites/ __tests__/app/api/invites.test.ts
git commit -m "feat: add invites API route"
```

---

## Task 14: Login page UI

**Files:**
- Create: `src/app/(auth)/login/page.tsx`

No separate unit test — Auth.js login form uses the `signIn` action; covered by E2E tests.

- [ ] **Step 1: Create src/app/(auth)/login/page.tsx**

```tsx
import { signIn } from '@/lib/auth/auth';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="text-sm text-muted-foreground">POWER GYM</p>
        </div>

        <form
          action={async (formData: FormData) => {
            'use server';
            await signIn('credentials', {
              email: formData.get('email'),
              password: formData.get('password'),
              redirectTo: '/dashboard',
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run build to confirm no TypeScript errors**

```bash
pnpm build
```

Expected: compiled successfully.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/login/
git commit -m "feat: add login page"
```

---

## Task 15: Register page UI

**Files:**
- Create: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Create src/app/(auth)/register/page.tsx**

```tsx
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/connect';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { validateInviteToken } from '@/lib/auth/invite';

interface Props {
  searchParams: Promise<{ token?: string }>;
}

export default async function RegisterPage({ searchParams }: Props) {
  const { token } = await searchParams;

  let isFirstUser = false;
  let inviteRole: 'trainer' | 'member' | null = null;

  if (!token) {
    await connectDB();
    const { MongoUserRepository } = await import('@/lib/repositories/user.repository');
    const userRepo = new MongoUserRepository();
    const count = await userRepo.count();

    if (count > 0) {
      redirect('/login?error=invite-required');
    }
    isFirstUser = true;
  } else {
    await connectDB();
    const inviteRepo = new MongoInviteRepository();
    const invite = await inviteRepo.findByToken(token);
    const validation = validateInviteToken(invite);

    if (!validation.valid) {
      redirect('/login?error=invalid-invite');
    }
    inviteRole = validation.invite.role;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 rounded-xl border p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Create account</h1>
          {isFirstUser && (
            <p className="text-sm text-muted-foreground">Setting up your gym as owner</p>
          )}
          {inviteRole && (
            <p className="text-sm text-muted-foreground">
              You were invited as a{' '}
              <span className="font-medium capitalize">{inviteRole}</span>
            </p>
          )}
        </div>

        <form action="/api/auth/register" method="POST" className="space-y-4">
          {token && <input type="hidden" name="token" value={token} />}

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create account
          </button>
        </form>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Run build to confirm no TypeScript errors**

```bash
pnpm build
```

Expected: compiled successfully.

- [ ] **Step 3: Run all tests to confirm nothing regressed**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/register/
git commit -m "feat: add register page (owner bootstrap + invite flow)"
```

---

## Final checks

- [ ] **Run full test suite**

```bash
pnpm test
```

Expected: all tests pass, 0 failures.

- [ ] **Run lint**

```bash
pnpm lint
```

Expected: no warnings, no errors.

- [ ] **Run build**

```bash
pnpm build
```

Expected: compiled successfully, no TypeScript errors.
