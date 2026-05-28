# Profile & Account Redesign

**Date**: 2026-05-13  
**Status**: Approved

---

## Goals

1. Split `User.name` → `firstName + lastName` (schema refactor, Approach B)
2. Add common profile fields for all roles: birthday, mobile, address, avatar
3. Replace sidebar "Settings" nav link with a Popover user menu (avatar + name + email header, Profile & Settings + Sign Out)
4. Unified Settings page: full-page with tabs — **Profile | Account | Security** (Owner adds **Gym Info**)
5. Avatar upload via existing MinIO/Cloudinary infrastructure
6. Change password while logged in (Security tab)
7. Forgot password email flow (from login page)
8. Proper email + mobile validation
9. Fix all tests and seed scripts to reflect schema changes

---

## 1. Data Model Changes

### 1a. `User` model — split `name`

Remove `name: string`. Add:
- `firstName: string` (required)
- `lastName: string` (required)
- Virtual `name` getter: `${firstName} ${lastName}` (for backward-compat display in non-critical paths; auth session derives display name from firstName+lastName directly)

Auth `authorizeCredentials` returns `{ name: firstName + ' ' + lastName, ... }`. Session `user.name` still works unchanged for any UI that reads it.

### 1b. `UserProfile` model — schema changes

**Common fields (all roles)** — add/rename:
| Field | Change | Notes |
|---|---|---|
| `mobile` | rename from `phone` | format-validated on save |
| `address` | new `string \| null` | free-text |
| `dateOfBirth` | was member-only → now common | |
| `avatarUrl` | new `string \| null` | URL from storage provider |

**Remove**: `role` field from UserProfile (redundant with User.role).

**Trainer-specific** (keep existing): `bio`, `specializations`. Add: `certifications: string[]`

**Owner-specific** (keep existing): none (gymName moves to GymInfo). Add: `certifications: string[]`

**Member-specific** (keep existing): `sex`, `height`, `fitnessGoal`, `fitnessLevel`

### 1c. New `GymInfo` embedded object on `UserProfile` (owner only)

Rather than a separate model, add a `gymInfo` sub-document to `UserProfile`:

```typescript
interface IGymInfo {
  name: string | null;        // migrated from gymName
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;       // free-text e.g. "Mon–Fri 6am–10pm"
  description: string | null;
}
```

Migrate existing `gymName` → `gymInfo.name` during seed/migration.

### 1d. New `PasswordResetToken` model

```typescript
interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;          // bcrypt hash of the random token
  expiresAt: Date;            // 1 hour from creation
  usedAt: Date | null;
}
```

Index: `{ tokenHash: 1 }`, TTL index on `expiresAt` (auto-cleanup).

---

## 2. Repository Changes

### `IUserRepository` — updated

```typescript
interface CreateUserData {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  trainerId: string | null;
}

// new methods
updatePassword(userId: string, passwordHash: string): Promise<void>
updateEmail(userId: string, email: string): Promise<void>
updateName(userId: string, firstName: string, lastName: string): Promise<void>
```

### `IUserProfileRepository` — updated `UpdateProfileData`

Add: `mobile`, `address`, `dateOfBirth`, `avatarUrl`, `certifications`, `gymInfo`.  
Remove: `phone` (renamed), `gymName` (moved to `gymInfo.name`).

### New `IPasswordResetTokenRepository`

```typescript
create(userId: string, tokenHash: string, expiresAt: Date): Promise<IPasswordResetToken>
findByTokenHash(hash: string): Promise<IPasswordResetToken | null>
markUsed(id: string): Promise<void>
```

---

## 3. Auth Session

`types/auth.ts` session type unchanged — `session.user.name` still comes from `DefaultSession['user']` which NextAuth populates from `authorizeCredentials` return value.

`auth.config.ts` `AuthorizedUser` interface:  
- Remove `name: string`  
- Add `firstName: string`, `lastName: string`  
- `jwt` callback: `token.firstName`, `token.lastName`  
- `session` callback: `session.user.name = token.firstName + ' ' + token.lastName`

---

## 4. API Routes

### New routes under `src/app/api/auth/`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/forgot-password` | public | Accept email, send reset link |
| POST | `/api/auth/reset-password` | public | Accept token + new password |

### Updated routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| PATCH | `/api/profile` | session | Update profile fields (extended) |
| PATCH | `/api/account/email` | session | Change email with validation |
| PATCH | `/api/account/password` | session | Change password (requires current) |
| POST | `/api/upload` | session | Existing — add `avatars/` folder support |

---

## 5. Settings Page Architecture

### URL structure

All roles share the same tab layout at their existing settings URL:

```
/member/settings?tab=profile    (default)
/member/settings?tab=account
/member/settings?tab=security
/trainer/settings?tab=profile
/trainer/settings?tab=account
/trainer/settings?tab=security
/owner/settings?tab=profile
/owner/settings?tab=account
/owner/settings?tab=security
/owner/settings?tab=gym-info    (owner only)
```

### Tab contents

**Profile tab** (all roles):
- Avatar upload (circular, click to upload, existing `uploadFile` utility with `folder: 'avatars'`)
- First Name, Last Name
- Date of Birth
- Mobile (with format validation)
- Address (free text)
- Role-specific section:
  - Member: Fitness Goal, Fitness Level, Sex
  - Trainer: Bio, Specializations (tag input), Certifications (tag input)
  - Owner: Certifications (tag input)

**Account tab** (all roles):
- Email display + "Change email" action → opens inline form, validates format + uniqueness, updates on submit
- Display name (read-only, derived from firstName + lastName)

**Security tab** (all roles):
- Change Password form: current password + new password + confirm new password
- "Forgot your password?" link → navigates to `/forgot-password`

**Gym Info tab** (owner only):
- Gym Name, Address, Phone, Email, Website, Hours (textarea), Description (textarea)

### Sticky save bar pattern

All tabs follow the existing `food-form.tsx` pattern: sticky bottom bar, dirty detection, "Discard changes?" dialog on dirty Cancel, `beforeunload` guard.

---

## 6. Sidebar Popover (User Menu)

Replace the bottom user display + logout slot with a `Popover` (shadcn):

**Trigger**: entire bottom user row (avatar + name + role badge) — `cursor-pointer`

**Popover content**:
```
┌────────────────────────────────┐
│  [avatar]  Eric Gong           │
│            eric@gym.com        │
├────────────────────────────────┤
│  ⚙  Profile & Settings         │
├────────────────────────────────┤
│  → Sign Out                    │
└────────────────────────────────┘
```

- "Profile & Settings" links to `/{role}/settings`
- "Sign Out" triggers `signOut()` server action
- Avatar shows uploaded image if `avatarUrl` exists, otherwise initials fallback

`AppShell` receives `userEmail` prop in addition to `userName`.

Remove the `ACCOUNT` nav group from all three role nav configs (replaced by Popover).

---

## 7. Forgot Password Flow

### Pages

- `/forgot-password` — public page, email input form
- `/reset-password` — public page, accepts `?token=` query param, new password + confirm form

### Flow

1. User submits email on `/forgot-password`
2. Server: look up user by email → generate 32-byte random token → hash with bcrypt → store `PasswordResetToken` with 1h TTL → send email (Nodemailer/Mailgun) with link `/reset-password?token=<raw-token>`
3. Always respond "If that email exists, you'll receive a link" (no user enumeration)
4. User clicks link → `/reset-password?token=X`
5. Server: hash the token → look up `PasswordResetToken` → verify not expired + not used → update user password → mark token used
6. Redirect to `/login` with success toast

---

## 8. Validation Rules

| Field | Rule |
|---|---|
| Email | RFC-5322 format; unique across all users on change |
| Mobile | Optional; if provided: digits, spaces, `+`, `-`, `()` only; 7–15 digits when stripped |
| Password (new) | Min 8 chars, at least 1 uppercase, 1 digit |
| First/Last Name | Required, 1–50 chars, trimmed |
| Address | Optional, max 200 chars |
| Avatar | JPEG/PNG/WebP only, max 5MB, stored under `avatars/{userId}.{ext}` |

---

## 9. Test & Seed Updates

### Jest unit/integration tests

All tests that call `UserModel.create({ name: ... })` or `createUser({ name: ... })` must be updated to use `firstName` + `lastName`. Tests that assert `user.name` must assert the derived value or switch to `firstName`/`lastName`.

Scope: `__tests__/` directory, `e2e/seed.ts`, `scripts/seed-dev.ts`.

### `e2e/seed.ts`

Update `UserModel.create` calls: replace `name: 'Test Owner'` → `firstName: 'Test', lastName: 'Owner'`, etc.

### `scripts/seed-dev.ts`

Same as above. Also add `UserProfileModel.create` entries with `mobile`, `address`, `dateOfBirth`, `avatarUrl: null` for all seeded users, not just member. Migrate `gymName` to `gymInfo.name` for owner profile.

---

## 10. Files Affected (non-exhaustive)

**Models**: `user.model.ts`, `user-profile.model.ts` (new: `password-reset-token.model.ts`)

**Repositories**: `user.repository.ts`, `user-profile.repository.ts` (new: `password-reset-token.repository.ts`)

**Auth**: `auth.ts`, `auth.config.ts`, `types/auth.ts`

**API routes**: `api/profile/route.ts`, new `api/account/email/route.ts`, new `api/account/password/route.ts`, new `api/auth/forgot-password/route.ts`, new `api/auth/reset-password/route.ts`

**Settings pages**: All three `{role}/settings/` directories restructured with tab layout

**Sidebar**: `components/shared/app-shell.tsx`

**Lib**: `lib/storage/` (add `avatars/` folder constant), new `lib/email/password-reset.ts` template

**Seeds**: `e2e/seed.ts`, `scripts/seed-dev.ts`

**Tests**: All `__tests__/` files referencing `user.name`, `CreateUserData.name`
