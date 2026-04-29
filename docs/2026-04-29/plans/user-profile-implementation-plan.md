# User Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a separate `UserProfile` document (1:1 with `User`) that stores role-specific profile data — member fitness info, trainer bio/specializations, owner gym info — and pre-populate the body test form's `sex`/`age` fields from the member's profile.

**Architecture:** A single `UserProfile` Mongoose model with `userId` as a unique index and optional role-specific fields (avoids a per-role collection proliferation). A new `IUserProfileRepository` handles upsert-style writes. Two API route families expose the profile: `/api/profile` for self-service CRUD and `/api/members/[memberId]/profile` for trainer/owner read access. Each role gets a `/settings` page for editing its own profile fields.

**Tech Stack:** Next.js App Router, Mongoose/MongoDB, Auth.js v5 session, Server Actions for form mutations, Jest + RTL for unit/integration tests.

---

## File Map

### New files
| File | Purpose |
|---|---|
| `src/lib/db/models/user-profile.model.ts` | Mongoose schema + `IUserProfile` interface |
| `src/lib/repositories/user-profile.repository.ts` | `IUserProfileRepository` interface + `MongoUserProfileRepository` |
| `src/app/api/profile/route.ts` | `GET` / `PATCH` own profile |
| `src/app/api/members/[memberId]/profile/route.ts` | `GET` member profile (trainer/owner read) |
| `src/app/(dashboard)/member/settings/page.tsx` | Member profile settings server page |
| `src/app/(dashboard)/member/settings/_components/member-profile-form.tsx` | Member profile form (client) |
| `src/app/(dashboard)/member/settings/actions.ts` | Server Action: update member profile |
| `src/app/(dashboard)/trainer/settings/page.tsx` | Trainer profile settings server page |
| `src/app/(dashboard)/trainer/settings/_components/trainer-profile-form.tsx` | Trainer profile form (client) |
| `src/app/(dashboard)/trainer/settings/actions.ts` | Server Action: update trainer profile |
| `src/app/(dashboard)/owner/settings/page.tsx` | Owner profile settings server page |
| `src/app/(dashboard)/owner/settings/_components/owner-profile-form.tsx` | Owner profile form (client) |
| `src/app/(dashboard)/owner/settings/actions.ts` | Server Action: update owner profile |

### Test files (new)
| File | What it tests |
|---|---|
| `__tests__/lib/db/models/user-profile.model.test.ts` | Schema validation |
| `__tests__/lib/repositories/user-profile.repository.test.ts` | Repository methods |
| `__tests__/app/api/profile.test.ts` | `GET`/`PATCH /api/profile` |
| `__tests__/app/api/members-profile.test.ts` | `GET /api/members/[memberId]/profile` |
| `__tests__/app/member/member-profile-form.test.tsx` | Member settings form rendering + submission |
| `__tests__/app/trainer/trainer-profile-form.test.tsx` | Trainer settings form |
| `__tests__/app/owner/owner-profile-form.test.tsx` | Owner settings form |

### Modified files
| File | Change |
|---|---|
| `src/components/shared/app-shell.tsx` | Add Settings nav link for each role |
| `src/app/(dashboard)/trainer/members/[id]/body-tests/page.tsx` | Fetch member profile; pass to client |
| `src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx` | Accept pre-filled `defaultSex`/`defaultAge`; initialise state from them |

---

## Task 1: UserProfile Mongoose Model

**Files:**
- Create: `src/lib/db/models/user-profile.model.ts`
- Test: `__tests__/lib/db/models/user-profile.model.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/lib/db/models/user-profile.model.test.ts
/** @jest-environment node */

describe('UserProfileModel schema', () => {
  it('requires userId field', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({});
    const err = doc.validateSync();
    expect(err?.errors['userId']).toBeDefined();
  });

  it('accepts valid member profile data', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      role: 'member',
      sex: 'female',
      dateOfBirth: new Date('1995-06-15'),
      height: 165,
      fitnessGoal: 'lose_fat',
      fitnessLevel: 'intermediate',
      phone: '13800138000',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  it('rejects invalid fitnessGoal', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      role: 'member',
      fitnessGoal: 'get_rich',
    });
    const err = doc.validateSync();
    expect(err?.errors['fitnessGoal']).toBeDefined();
  });

  it('rejects invalid fitnessLevel', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      fitnessLevel: 'elite',
    });
    const err = doc.validateSync();
    expect(err?.errors['fitnessLevel']).toBeDefined();
  });

  it('accepts valid trainer profile data', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      role: 'trainer',
      bio: 'NSCA-CPT certified, 5 years experience',
      specializations: ['strength', 'rehabilitation'],
      phone: '13900139000',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });

  it('accepts valid owner profile data', async () => {
    const { UserProfileModel } = await import('@/lib/db/models/user-profile.model');
    const doc = new UserProfileModel({
      userId: '507f1f77bcf86cd799439011',
      role: 'owner',
      gymName: 'Power Gym Beijing',
      phone: '01082345678',
    });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=user-profile.model
```
Expected: FAIL — "Cannot find module '@/lib/db/models/user-profile.model'"

- [ ] **Step 3: Implement the model**

```ts
// src/lib/db/models/user-profile.model.ts
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
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern=user-profile.model
```
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/models/user-profile.model.ts __tests__/lib/db/models/user-profile.model.test.ts
git commit -m "feat: add UserProfile Mongoose model"
```

---

## Task 2: UserProfile Repository

**Files:**
- Create: `src/lib/repositories/user-profile.repository.ts`
- Test: `__tests__/lib/repositories/user-profile.repository.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/lib/repositories/user-profile.repository.test.ts
/** @jest-environment node */

jest.mock('@/lib/db/models/user-profile.model', () => ({
  UserProfileModel: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

import { UserProfileModel } from '@/lib/db/models/user-profile.model';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';

const mockFindOne = jest.mocked(UserProfileModel.findOne);
const mockFindOneAndUpdate = jest.mocked(UserProfileModel.findOneAndUpdate);

const USER_ID = '507f1f77bcf86cd799439011';

describe('MongoUserProfileRepository', () => {
  const repo = new MongoUserProfileRepository();

  beforeEach(() => jest.clearAllMocks());

  it('findByUserId returns null when no profile exists', async () => {
    mockFindOne.mockResolvedValue(null);
    const result = await repo.findByUserId(USER_ID);
    expect(mockFindOne).toHaveBeenCalledWith({ userId: expect.any(Object) });
    expect(result).toBeNull();
  });

  it('findByUserId returns profile when found', async () => {
    const profile = { userId: USER_ID, sex: 'female', fitnessGoal: 'lose_fat' };
    mockFindOne.mockResolvedValue(profile as never);
    const result = await repo.findByUserId(USER_ID);
    expect(result).toEqual(profile);
  });

  it('upsert calls findOneAndUpdate with upsert: true and returns updated doc', async () => {
    const updated = { userId: USER_ID, sex: 'male', height: 178 };
    mockFindOneAndUpdate.mockResolvedValue(updated as never);

    const result = await repo.upsert(USER_ID, { sex: 'male', height: 178 });

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { userId: expect.any(Object) },
      { $set: { sex: 'male', height: 178 } },
      { upsert: true, new: true },
    );
    expect(result).toEqual(updated);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=user-profile.repository
```
Expected: FAIL — "Cannot find module '@/lib/repositories/user-profile.repository'"

- [ ] **Step 3: Implement the repository**

```ts
// src/lib/repositories/user-profile.repository.ts
import mongoose from 'mongoose';
import { UserProfileModel } from '@/lib/db/models/user-profile.model';
import type { IUserProfile } from '@/lib/db/models/user-profile.model';

export type UpdateProfileData = Partial<
  Pick<
    IUserProfile,
    | 'phone'
    | 'sex'
    | 'dateOfBirth'
    | 'height'
    | 'fitnessGoal'
    | 'fitnessLevel'
    | 'bio'
    | 'specializations'
    | 'gymName'
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

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern=user-profile.repository
```
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/repositories/user-profile.repository.ts __tests__/lib/repositories/user-profile.repository.test.ts
git commit -m "feat: add UserProfile repository"
```

---

## Task 3: API — Own Profile (GET + PATCH /api/profile)

**Files:**
- Create: `src/app/api/profile/route.ts`
- Test: `__tests__/app/api/profile.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/app/api/profile.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockProfileRepo = { findByUserId: jest.fn(), upsert: jest.fn() };
jest.mock('@/lib/repositories/user-profile.repository', () => ({
  MongoUserProfileRepository: jest.fn(() => mockProfileRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

describe('GET /api/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/profile/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns null profile as empty object when no profile exists', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'member' } } as never);
    mockProfileRepo.findByUserId.mockResolvedValue(null);
    const { GET } = await import('@/app/api/profile/route');
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual(null);
  });

  it('returns existing profile', async () => {
    const profile = { userId: 'u1', sex: 'female', height: 165 };
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'member' } } as never);
    mockProfileRepo.findByUserId.mockResolvedValue(profile);
    const { GET } = await import('@/app/api/profile/route');
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual(profile);
  });
});

describe('PATCH /api/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { PATCH } = await import('@/app/api/profile/route');
    const res = await PATCH(new Request('http://localhost/', { method: 'PATCH', body: '{}' }));
    expect(res.status).toBe(401);
  });

  it('upserts profile and returns 200 with updated doc', async () => {
    const updated = { userId: 'u1', sex: 'male', height: 178 };
    mockAuth.mockResolvedValue({ user: { id: 'u1', role: 'member' } } as never);
    mockProfileRepo.upsert.mockResolvedValue(updated);

    const { PATCH } = await import('@/app/api/profile/route');
    const res = await PATCH(
      new Request('http://localhost/', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sex: 'male', height: 178 }),
      }),
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toEqual(updated);
    expect(mockProfileRepo.upsert).toHaveBeenCalledWith('u1', { sex: 'male', height: 178 });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=__tests__/app/api/profile.test
```
Expected: FAIL — "Cannot find module '@/app/api/profile/route'"

- [ ] **Step 3: Implement the route**

```ts
// src/app/api/profile/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import type { UpdateProfileData } from '@/lib/repositories/user-profile.repository';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const repo = new MongoUserProfileRepository();
  const profile = await repo.findByUserId(session.user.id);
  return Response.json(profile);
}

export async function PATCH(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const body = (await req.json()) as UpdateProfileData;
  const repo = new MongoUserProfileRepository();
  const updated = await repo.upsert(session.user.id, body);
  return Response.json(updated);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern=__tests__/app/api/profile.test
```
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/profile/route.ts __tests__/app/api/profile.test.ts
git commit -m "feat: add GET/PATCH /api/profile route"
```

---

## Task 4: API — Member Profile Read (GET /api/members/[memberId]/profile)

**Files:**
- Create: `src/app/api/members/[memberId]/profile/route.ts`
- Test: `__tests__/app/api/members-profile.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// __tests__/app/api/members-profile.test.ts
/** @jest-environment node */
jest.mock('@/lib/db/connect', () => ({ connectDB: jest.fn() }));
jest.mock('@/lib/auth/auth', () => ({ auth: jest.fn() }));

const mockProfileRepo = { findByUserId: jest.fn() };
const mockUserRepo = { findById: jest.fn() };
jest.mock('@/lib/repositories/user-profile.repository', () => ({
  MongoUserProfileRepository: jest.fn(() => mockProfileRepo),
}));
jest.mock('@/lib/repositories/user.repository', () => ({
  MongoUserRepository: jest.fn(() => mockUserRepo),
}));

import { auth } from '@/lib/auth/auth';
const mockAuth = jest.mocked(auth);

function makeParams(memberId: string) {
  return { params: Promise.resolve({ memberId }) };
}

describe('GET /api/members/[memberId]/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when member reads a different member profile', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'm1', role: 'member' } } as never);
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m2'));
    expect(res.status).toBe(403);
  });

  it('returns 404 when member user not found', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue(null);
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(404);
  });

  it('returns 403 when trainer accesses member of different trainer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't2' } });
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(403);
  });

  it('returns null when no profile exists for member', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    mockProfileRepo.findByUserId.mockResolvedValue(null);
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toBeNull();
  });

  it('returns member profile for trainer with matching trainerId', async () => {
    mockAuth.mockResolvedValue({ user: { id: 't1', role: 'trainer' } } as never);
    mockUserRepo.findById.mockResolvedValue({ trainerId: { toString: () => 't1' } });
    const profile = { userId: 'm1', sex: 'female', height: 162 };
    mockProfileRepo.findByUserId.mockResolvedValue(profile);
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(profile);
  });

  it('returns member profile for owner', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'o1', role: 'owner' } } as never);
    const profile = { userId: 'm1', sex: 'male' };
    mockProfileRepo.findByUserId.mockResolvedValue(profile);
    const { GET } = await import('@/app/api/members/[memberId]/profile/route');
    const res = await GET(new Request('http://localhost/'), makeParams('m1'));
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=members-profile
```
Expected: FAIL — "Cannot find module '@/app/api/members/[memberId]/profile/route'"

- [ ] **Step 3: Implement the route**

```ts
// src/app/api/members/[memberId]/profile/route.ts
import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();

  if (role === 'trainer') {
    const member = await new MongoUserRepository().findById(memberId);
    if (!member) return Response.json({ error: 'Not found' }, { status: 404 });
    if (member.trainerId?.toString() !== session.user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const profile = await new MongoUserProfileRepository().findByUserId(memberId);
  return Response.json(profile);
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern=members-profile
```
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/members/[memberId]/profile/route.ts __tests__/app/api/members-profile.test.ts
git commit -m "feat: add GET /api/members/[memberId]/profile route"
```

---

## Task 5: Member Settings Page + Form

**Files:**
- Create: `src/app/(dashboard)/member/settings/page.tsx`
- Create: `src/app/(dashboard)/member/settings/_components/member-profile-form.tsx`
- Create: `src/app/(dashboard)/member/settings/actions.ts`
- Test: `__tests__/app/member/member-profile-form.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/app/member/member-profile-form.test.tsx
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUpdateMemberProfileAction = jest.fn();
jest.mock(
  '@/app/(dashboard)/member/settings/actions',
  () => ({ updateMemberProfileAction: mockUpdateMemberProfileAction }),
);

import { MemberProfileForm } from '@/app/(dashboard)/member/settings/_components/member-profile-form';

const DEFAULT_PROFILE = {
  phone: null,
  sex: null as 'male' | 'female' | null,
  dateOfBirth: null as string | null,
  height: null as number | null,
  fitnessGoal: null as string | null,
  fitnessLevel: null as string | null,
};

describe('MemberProfileForm', () => {
  beforeEach(() => {
    mockUpdateMemberProfileAction.mockResolvedValue({ error: '' });
  });

  it('renders all profile fields', () => {
    render(<MemberProfileForm initialProfile={DEFAULT_PROFILE} />);
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/height/i)).toBeInTheDocument();
  });

  it('shows success toast when action returns no error', async () => {
    mockUpdateMemberProfileAction.mockResolvedValue({ error: '' });
    render(<MemberProfileForm initialProfile={DEFAULT_PROFILE} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(mockUpdateMemberProfileAction).toHaveBeenCalled());
  });

  it('shows error message when action returns error', async () => {
    mockUpdateMemberProfileAction.mockResolvedValue({ error: 'Save failed' });
    render(<MemberProfileForm initialProfile={DEFAULT_PROFILE} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByText('Save failed')).toBeInTheDocument());
  });

  it('pre-fills height field when initialProfile has height', () => {
    render(<MemberProfileForm initialProfile={{ ...DEFAULT_PROFILE, height: 170 }} />);
    expect((screen.getByLabelText(/height/i) as HTMLInputElement).value).toBe('170');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=member-profile-form
```
Expected: FAIL — "Cannot find module '@/app/(dashboard)/member/settings/_components/member-profile-form'"

- [ ] **Step 3: Implement Server Action**

```ts
// src/app/(dashboard)/member/settings/actions.ts
'use server';

import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';

export interface UpdateProfileState {
  error: string;
}

export async function updateMemberProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const phone = (formData.get('phone') as string | null) || null;
  const sex = (formData.get('sex') as 'male' | 'female' | null) || null;
  const dateOfBirthRaw = formData.get('dateOfBirth') as string | null;
  const dateOfBirth = dateOfBirthRaw ? new Date(dateOfBirthRaw) : null;
  const heightRaw = formData.get('height') as string | null;
  const height = heightRaw ? parseFloat(heightRaw) : null;
  const fitnessGoal =
    (formData.get('fitnessGoal') as
      | 'lose_fat'
      | 'build_muscle'
      | 'maintain'
      | 'improve_performance'
      | null) || null;
  const fitnessLevel =
    (formData.get('fitnessLevel') as 'beginner' | 'intermediate' | 'advanced' | null) || null;

  try {
    await connectDB();
    await new MongoUserProfileRepository().upsert(session.user.id, {
      phone,
      sex,
      dateOfBirth: dateOfBirth ?? undefined,
      height: height ?? undefined,
      fitnessGoal: fitnessGoal ?? undefined,
      fitnessLevel: fitnessLevel ?? undefined,
    });
    return { error: '' };
  } catch {
    return { error: 'Failed to save profile' };
  }
}
```

- [ ] **Step 4: Implement the form component**

```tsx
// src/app/(dashboard)/member/settings/_components/member-profile-form.tsx
'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateMemberProfileAction, type UpdateProfileState } from '../actions';

interface InitialProfile {
  phone: string | null;
  sex: 'male' | 'female' | null;
  dateOfBirth: string | null;
  height: number | null;
  fitnessGoal: string | null;
  fitnessLevel: string | null;
}

interface Props {
  initialProfile: InitialProfile;
}

const FITNESS_GOALS = [
  { value: 'lose_fat', label: '减脂' },
  { value: 'build_muscle', label: '增肌' },
  { value: 'maintain', label: '维持' },
  { value: 'improve_performance', label: '提升运动表现' },
] as const;

const FITNESS_LEVELS = [
  { value: 'beginner', label: '新手' },
  { value: 'intermediate', label: '中级' },
  { value: 'advanced', label: '进阶' },
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save Profile'}
    </Button>
  );
}

export function MemberProfileForm({ initialProfile }: Props) {
  const [state, action] = useActionState<UpdateProfileState, FormData>(
    updateMemberProfileAction,
    { error: '' },
  );

  const dobValue = initialProfile.dateOfBirth
    ? new Date(initialProfile.dateOfBirth).toISOString().split('T')[0]
    : '';

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          Phone
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initialProfile.phone ?? ''}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white placeholder:text-[#555]"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="sex" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          Sex
        </label>
        <select
          id="sex"
          name="sex"
          defaultValue={initialProfile.sex ?? ''}
          className="w-full rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white"
        >
          <option value="">-- Select --</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="dateOfBirth" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          Date of Birth
        </label>
        <Input
          id="dateOfBirth"
          name="dateOfBirth"
          type="date"
          defaultValue={dobValue}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="height" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          Height (cm)
        </label>
        <Input
          id="height"
          name="height"
          type="number"
          min={100}
          max={250}
          defaultValue={initialProfile.height ?? ''}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="fitnessGoal" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          Fitness Goal
        </label>
        <select
          id="fitnessGoal"
          name="fitnessGoal"
          defaultValue={initialProfile.fitnessGoal ?? ''}
          className="w-full rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white"
        >
          <option value="">-- Select --</option>
          {FITNESS_GOALS.map((g) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="fitnessLevel" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          Fitness Level
        </label>
        <select
          id="fitnessLevel"
          name="fitnessLevel"
          defaultValue={initialProfile.fitnessLevel ?? ''}
          className="w-full rounded-md border border-[#1e1e1e] bg-[#0c0c0c] px-3 py-2 text-sm text-white"
        >
          <option value="">-- Select --</option>
          {FITNESS_LEVELS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
```

- [ ] **Step 5: Implement the settings page**

```tsx
// src/app/(dashboard)/member/settings/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { MemberProfileForm } from './_components/member-profile-form';
import { PageHeader } from '@/components/shared/page-header';

export default async function MemberSettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const raw = await new MongoUserProfileRepository().findByUserId(session.user.id);
  const profile = {
    phone: raw?.phone ?? null,
    sex: (raw?.sex ?? null) as 'male' | 'female' | null,
    dateOfBirth: raw?.dateOfBirth ? raw.dateOfBirth.toISOString() : null,
    height: raw?.height ?? null,
    fitnessGoal: raw?.fitnessGoal ?? null,
    fitnessLevel: raw?.fitnessLevel ?? null,
  };

  return (
    <div>
      <PageHeader title="Profile Settings" subtitle="Update your personal information" />
      <div className="px-4 sm:px-8 py-7 max-w-lg">
        <MemberProfileForm initialProfile={profile} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern=member-profile-form
```
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/member/settings/ __tests__/app/member/member-profile-form.test.tsx
git commit -m "feat: add member profile settings page and form"
```

---

## Task 6: Trainer Settings Page + Form

**Files:**
- Create: `src/app/(dashboard)/trainer/settings/page.tsx`
- Create: `src/app/(dashboard)/trainer/settings/_components/trainer-profile-form.tsx`
- Create: `src/app/(dashboard)/trainer/settings/actions.ts`
- Test: `__tests__/app/trainer/trainer-profile-form.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/app/trainer/trainer-profile-form.test.tsx
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUpdateTrainerProfileAction = jest.fn();
jest.mock(
  '@/app/(dashboard)/trainer/settings/actions',
  () => ({ updateTrainerProfileAction: mockUpdateTrainerProfileAction }),
);

import { TrainerProfileForm } from '@/app/(dashboard)/trainer/settings/_components/trainer-profile-form';

const DEFAULT_PROFILE = { phone: null, bio: null, specializations: [] as string[] };

describe('TrainerProfileForm', () => {
  beforeEach(() => {
    mockUpdateTrainerProfileAction.mockResolvedValue({ error: '' });
  });

  it('renders phone, bio, and specializations fields', () => {
    render(<TrainerProfileForm initialProfile={DEFAULT_PROFILE} />);
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/specializations/i)).toBeInTheDocument();
  });

  it('pre-fills bio when initialProfile has bio', () => {
    render(<TrainerProfileForm initialProfile={{ ...DEFAULT_PROFILE, bio: 'NSCA-CPT' }} />);
    expect((screen.getByLabelText(/bio/i) as HTMLTextAreaElement).value).toBe('NSCA-CPT');
  });

  it('shows error message when action returns error', async () => {
    mockUpdateTrainerProfileAction.mockResolvedValue({ error: 'Network error' });
    render(<TrainerProfileForm initialProfile={DEFAULT_PROFILE} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByText('Network error')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=trainer-profile-form
```
Expected: FAIL — "Cannot find module '@/app/(dashboard)/trainer/settings/_components/trainer-profile-form'"

- [ ] **Step 3: Implement Server Action**

```ts
// src/app/(dashboard)/trainer/settings/actions.ts
'use server';

import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';

export interface UpdateProfileState {
  error: string;
}

export async function updateTrainerProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const phone = (formData.get('phone') as string | null) || null;
  const bio = (formData.get('bio') as string | null) || null;
  const specializationsRaw = (formData.get('specializations') as string | null) ?? '';
  const specializations = specializationsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  try {
    await connectDB();
    await new MongoUserProfileRepository().upsert(session.user.id, {
      phone,
      bio,
      specializations,
    });
    return { error: '' };
  } catch {
    return { error: 'Failed to save profile' };
  }
}
```

- [ ] **Step 4: Implement the form component**

```tsx
// src/app/(dashboard)/trainer/settings/_components/trainer-profile-form.tsx
'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { updateTrainerProfileAction, type UpdateProfileState } from '../actions';

interface InitialProfile {
  phone: string | null;
  bio: string | null;
  specializations: string[];
}

interface Props {
  initialProfile: InitialProfile;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save Profile'}
    </Button>
  );
}

export function TrainerProfileForm({ initialProfile }: Props) {
  const [state, action] = useActionState<UpdateProfileState, FormData>(
    updateTrainerProfileAction,
    { error: '' },
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          Phone
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initialProfile.phone ?? ''}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="bio" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          Bio
        </label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={initialProfile.bio ?? ''}
          rows={4}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
          placeholder="Certifications, experience, specialties..."
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="specializations" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          Specializations
        </label>
        <Input
          id="specializations"
          name="specializations"
          type="text"
          defaultValue={initialProfile.specializations.join(', ')}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
          placeholder="strength, rehabilitation, nutrition (comma-separated)"
        />
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
```

- [ ] **Step 5: Implement the settings page**

```tsx
// src/app/(dashboard)/trainer/settings/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { TrainerProfileForm } from './_components/trainer-profile-form';
import { PageHeader } from '@/components/shared/page-header';

export default async function TrainerSettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const raw = await new MongoUserProfileRepository().findByUserId(session.user.id);
  const profile = {
    phone: raw?.phone ?? null,
    bio: raw?.bio ?? null,
    specializations: raw?.specializations ?? [],
  };

  return (
    <div>
      <PageHeader title="Profile Settings" subtitle="Update your trainer profile" />
      <div className="px-4 sm:px-8 py-7 max-w-lg">
        <TrainerProfileForm initialProfile={profile} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern=trainer-profile-form
```
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/trainer/settings/ __tests__/app/trainer/trainer-profile-form.test.tsx
git commit -m "feat: add trainer profile settings page and form"
```

---

## Task 7: Owner Settings Page + Form

**Files:**
- Create: `src/app/(dashboard)/owner/settings/page.tsx`
- Create: `src/app/(dashboard)/owner/settings/_components/owner-profile-form.tsx`
- Create: `src/app/(dashboard)/owner/settings/actions.ts`
- Test: `__tests__/app/owner/owner-profile-form.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// __tests__/app/owner/owner-profile-form.test.tsx
/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUpdateOwnerProfileAction = jest.fn();
jest.mock(
  '@/app/(dashboard)/owner/settings/actions',
  () => ({ updateOwnerProfileAction: mockUpdateOwnerProfileAction }),
);

import { OwnerProfileForm } from '@/app/(dashboard)/owner/settings/_components/owner-profile-form';

const DEFAULT_PROFILE = { phone: null, gymName: null };

describe('OwnerProfileForm', () => {
  beforeEach(() => {
    mockUpdateOwnerProfileAction.mockResolvedValue({ error: '' });
  });

  it('renders phone and gymName fields', () => {
    render(<OwnerProfileForm initialProfile={DEFAULT_PROFILE} />);
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/gym name/i)).toBeInTheDocument();
  });

  it('pre-fills gymName when initialProfile has gymName', () => {
    render(<OwnerProfileForm initialProfile={{ ...DEFAULT_PROFILE, gymName: 'Power Gym' }} />);
    expect((screen.getByLabelText(/gym name/i) as HTMLInputElement).value).toBe('Power Gym');
  });

  it('shows error message when action returns error', async () => {
    mockUpdateOwnerProfileAction.mockResolvedValue({ error: 'Save failed' });
    render(<OwnerProfileForm initialProfile={DEFAULT_PROFILE} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByText('Save failed')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
pnpm test -- --testPathPattern=owner-profile-form
```
Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement Server Action**

```ts
// src/app/(dashboard)/owner/settings/actions.ts
'use server';

import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';

export interface UpdateProfileState {
  error: string;
}

export async function updateOwnerProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const session = await auth();
  if (!session?.user) return { error: 'Unauthorized' };

  const phone = (formData.get('phone') as string | null) || null;
  const gymName = (formData.get('gymName') as string | null) || null;

  try {
    await connectDB();
    await new MongoUserProfileRepository().upsert(session.user.id, { phone, gymName });
    return { error: '' };
  } catch {
    return { error: 'Failed to save profile' };
  }
}
```

- [ ] **Step 4: Implement the form component**

```tsx
// src/app/(dashboard)/owner/settings/_components/owner-profile-form.tsx
'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateOwnerProfileAction, type UpdateProfileState } from '../actions';

interface InitialProfile {
  phone: string | null;
  gymName: string | null;
}

interface Props {
  initialProfile: InitialProfile;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="bg-white text-black hover:bg-white/90 font-semibold disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save Profile'}
    </Button>
  );
}

export function OwnerProfileForm({ initialProfile }: Props) {
  const [state, action] = useActionState<UpdateProfileState, FormData>(
    updateOwnerProfileAction,
    { error: '' },
  );

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="phone" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          Phone
        </label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={initialProfile.phone ?? ''}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="gymName" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#666]">
          Gym Name
        </label>
        <Input
          id="gymName"
          name="gymName"
          type="text"
          defaultValue={initialProfile.gymName ?? ''}
          className="bg-[#0c0c0c] border-[#1e1e1e] text-white"
          placeholder="e.g. Power Gym Beijing"
        />
      </div>

      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
```

- [ ] **Step 5: Implement the settings page**

```tsx
// src/app/(dashboard)/owner/settings/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { OwnerProfileForm } from './_components/owner-profile-form';
import { PageHeader } from '@/components/shared/page-header';

export default async function OwnerSettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const raw = await new MongoUserProfileRepository().findByUserId(session.user.id);
  const profile = {
    phone: raw?.phone ?? null,
    gymName: raw?.gymName ?? null,
  };

  return (
    <div>
      <PageHeader title="Profile Settings" subtitle="Update your gym and contact info" />
      <div className="px-4 sm:px-8 py-7 max-w-lg">
        <OwnerProfileForm initialProfile={profile} />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
pnpm test -- --testPathPattern=owner-profile-form
```
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/owner/settings/ __tests__/app/owner/owner-profile-form.test.tsx
git commit -m "feat: add owner profile settings page and form"
```

---

## Task 8: Add Settings Links to Sidebar Navigation

**Files:**
- Modify: `src/components/shared/app-shell.tsx`

- [ ] **Step 1: Run existing app-shell tests to get the baseline**

```bash
pnpm test -- --testPathPattern=app-shell
```
Expected: PASS (all current tests)

- [ ] **Step 2: Add Settings items to the NAV constant**

In `src/components/shared/app-shell.tsx`, update the `NAV` constant to add Settings entries:

```ts
// In the NAV constant, update each role's groups:

member: [
  {
    group: 'TRAINING',
    items: [
      { href: '/member/plan', label: 'My Plan' },
      { href: '/member/pbs', label: 'Personal Bests' },
      { href: '/member/progress', label: 'My Progress' },
      { href: '/member/schedule', label: 'My Schedule' },
    ],
  },
  {
    group: 'HEALTH',
    items: [
      { href: '/member/nutrition', label: 'Nutrition' },
      { href: '/member/body-tests', label: 'Body Tests' },
    ],
  },
  {
    group: 'ACCOUNT',
    items: [
      { href: '/member/settings', label: 'Settings' },
    ],
  },
],
trainer: [
  {
    group: 'MEMBERS',
    items: [
      { href: '/trainer/members', label: 'Members' },
      { href: '/trainer/calendar', label: 'Calendar' },
    ],
  },
  {
    group: 'TRAINING',
    items: [{ href: '/trainer/plans', label: 'Plan Templates' }],
  },
  {
    group: 'HEALTH',
    items: [{ href: '/trainer/nutrition', label: 'Nutrition Templates' }],
  },
  {
    group: 'ACCOUNT',
    items: [
      { href: '/trainer/settings', label: 'Settings' },
    ],
  },
],
owner: [
  {
    group: 'ADMIN',
    items: [
      { href: '/owner', label: 'Dashboard' },
      { href: '/owner/trainers', label: 'Trainers' },
      { href: '/owner/members', label: 'Members' },
      { href: '/owner/invites', label: 'Invites' },
      { href: '/owner/calendar', label: 'Calendar' },
    ],
  },
  {
    group: 'TRAINING',
    items: [
      { href: '/member/plan', label: 'My Plan' },
      { href: '/member/pbs', label: 'Personal Bests' },
      { href: '/trainer/plans', label: 'Plan Templates' },
    ],
  },
  {
    group: 'HEALTH',
    items: [
      { href: '/member/nutrition', label: 'Nutrition' },
      { href: '/member/body-tests', label: 'Body Tests' },
      { href: '/trainer/nutrition', label: 'Nutrition Templates' },
    ],
  },
  {
    group: 'ACCOUNT',
    items: [
      { href: '/owner/settings', label: 'Settings' },
    ],
  },
],
```

- [ ] **Step 3: Run existing tests to confirm no regressions**

```bash
pnpm test -- --testPathPattern=app-shell
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/app-shell.tsx
git commit -m "feat: add Settings nav links for all roles"
```

---

## Task 9: Pre-populate Body Test Form from Member Profile

**Files:**
- Modify: `src/app/(dashboard)/trainer/members/[id]/body-tests/page.tsx`
- Modify: `src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx`

This task reads the member's `UserProfile` on the server and passes `defaultSex` and `defaultAge` (computed from `dateOfBirth`) to `BodyTestClient`, so the form fields come pre-filled.

- [ ] **Step 1: Run existing body-test-client tests to get the baseline**

```bash
pnpm test -- --testPathPattern=body-test-client
```
Expected: PASS (all current tests)

- [ ] **Step 2: Update the server page to fetch member profile**

```tsx
// src/app/(dashboard)/trainer/members/[id]/body-tests/page.tsx
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoBodyTestRepository } from '@/lib/repositories/body-test.repository';
import { MongoUserProfileRepository } from '@/lib/repositories/user-profile.repository';
import { BodyTestClient, type BodyTestRecord } from './_components/body-test-client';

export default async function TrainerMemberBodyTestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id: memberId } = await params;

  await connectDB();
  const [tests, memberProfile] = await Promise.all([
    new MongoBodyTestRepository().findByMember(memberId),
    new MongoUserProfileRepository().findByUserId(memberId),
  ]);
  const plain = JSON.parse(JSON.stringify(tests)) as BodyTestRecord[];

  const defaultSex = (memberProfile?.sex ?? null) as 'male' | 'female' | null;
  const defaultAge =
    memberProfile?.dateOfBirth
      ? Math.floor(
          (Date.now() - new Date(memberProfile.dateOfBirth).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25),
        )
      : null;

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">体测管理</h1>
      <BodyTestClient
        memberId={memberId}
        initialTests={plain}
        defaultSex={defaultSex}
        defaultAge={defaultAge}
      />
    </div>
  );
}
```

- [ ] **Step 3: Update BodyTestClient to accept and use the new props**

In `src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx`, update the `Props` interface and `useState` initialisers:

```tsx
// Add to Props interface:
interface Props {
  memberId: string;
  memberName?: string;
  initialTests: BodyTestRecord[];
  defaultSex?: 'male' | 'female' | null;
  defaultAge?: number | null;
}

// Update the component signature and state initialisers:
export function BodyTestClient({ memberId, memberName, initialTests, defaultSex, defaultAge }: Props) {
  // ...existing state...
  const [sex, setSex] = useState<Sex>(defaultSex ?? 'male');
  const [age, setAge] = useState(defaultAge != null ? String(defaultAge) : '');
  // rest of component unchanged
```

- [ ] **Step 4: Run tests to confirm no regressions**

```bash
pnpm test -- --testPathPattern=body-test-client
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/trainer/members/[id]/body-tests/
git commit -m "feat: pre-populate body test form sex/age from member profile"
```

---

## Task 10: Final Check — Full Test Suite + Lint

- [ ] **Step 1: Run all tests**

```bash
pnpm test
```
Expected: PASS (all tests, 0 failures)

- [ ] **Step 2: Run linter**

```bash
pnpm lint
```
Expected: No warnings, no errors

- [ ] **Step 3: Update docs index**

Add the following row to `docs/INDEX.md` under a new **Implementation Plans** section (or append to the existing table):

```markdown
| User Profile (Option B) | [user-profile-implementation-plan.md](2026-04-29/plans/user-profile-implementation-plan.md) | In Progress |
```

- [ ] **Step 4: Final commit**

```bash
git add docs/INDEX.md
git commit -m "docs: add user profile implementation plan to index"
```
