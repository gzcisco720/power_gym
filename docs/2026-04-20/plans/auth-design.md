# Auth System Design — POWER_GYM

**Date**: 2026-04-20
**Status**: Approved

---

## Overview

Authentication is handled by **Auth.js (NextAuth v5)** using the Credentials provider and a **database session strategy** backed by MongoDB. Session tokens are stored in httpOnly cookies. There are three roles: `owner`, `trainer`, `member`.

- The **first registered user** in the system becomes `owner` automatically.
- All subsequent users must register via a **signed invite link** sent by email.
- Invite links are single-use and expire after 48 hours.
- Email delivery uses **Nodemailer** behind an `IEmailService` interface: MailTrap in development, any SMTP (e.g. Gmail) in production, switched via `EMAIL_PROVIDER` env var.

---

## Data Models

### User

```ts
{
  _id: ObjectId,
  name: string,
  email: string,           // unique index
  passwordHash: string,    // bcrypt
  role: 'owner' | 'trainer' | 'member',
  trainerId: ObjectId | null,  // the owner/trainer this member belongs to
  gymId: ObjectId,             // reserved for multi-gym future use
  createdAt: Date
}
```

### InviteToken

```ts
{
  _id: ObjectId,
  token: string,           // crypto.randomUUID(), unique index
  role: 'trainer' | 'member',
  invitedBy: ObjectId,     // _id of the owner/trainer who created the invite
  recipientEmail: string,  // email the invite was sent to; must match on register
  expiresAt: Date,         // createdAt + 48h
  usedAt: Date | null      // set on use; null = still valid
}
```

### Auth.js managed collections

Auth.js (database strategy) automatically manages `sessions` and `accounts` collections. No manual handling required.

---

## Registration Flows

### Path A — First user (owner)

1. `POST /api/auth/register` with `{ name, email, password }`, no token param.
2. Server checks: is `users` collection empty?
   - Yes → hash password, create user with `role: 'owner'`, auto-login via `signIn`.
   - No → return `403 Must use an invite link`.

### Path B — Invited user

1. Owner/Trainer creates invite → `POST /api/invites` → writes `InviteToken` doc → sends invite email with link `https://<host>/register?token=<uuid>`.
2. User opens link → `GET /register?token=<uuid>`:
   - Server validates token: exists, `usedAt === null`, `expiresAt > now`.
   - Invalid/expired → redirect `/login?error=invalid-invite`.
   - Valid → render registration form (name, email, password); role is fixed by token.
3. User submits form → `POST /api/auth/register?token=<uuid>`:
   - Re-validate token (prevent TOCTOU).
   - Hash password, create user with role from token, set `trainerId = token.invitedBy`.
   - Mark `token.usedAt = now`.
   - Auto-login via `signIn`.

---

## Login Flow

Uses Auth.js Credentials provider:

1. `POST /api/auth/callback/credentials` with `{ email, password }`.
2. `authorize` callback: find user by email → `bcrypt.compare` → return `{ id, name, email, role, trainerId }`.
3. Auth.js writes session to MongoDB, sets httpOnly session cookie.
4. `jwt` callback (if needed for session enrichment) encodes `role` and `trainerId` into the session token.

---

## Invite Creation

```text
POST /api/invites
Body: { role: 'trainer' | 'member', recipientEmail: string }
Auth: must be owner (for trainer invites) or owner/trainer (for member invites)

→ Creates InviteToken (48h TTL) — recipientEmail stored on token for validation
→ Calls IEmailService.sendInvite({ to: recipientEmail, inviterName, role, inviteUrl })
→ Returns { inviteUrl }
```

The `recipientEmail` is stored on the `InviteToken` document and re-checked on registration submit: the email the user enters must match the one the invite was sent to.

---

## Email Service

Interface in `src/lib/email/index.ts`:

```ts
interface IEmailService {
  sendInvite(params: {
    to: string;
    inviterName: string;
    role: 'trainer' | 'member';
    inviteUrl: string;
  }): Promise<void>;
}
```

Single Nodemailer implementation in `src/lib/email/nodemailer.ts`. SMTP config selected at runtime:

| `EMAIL_PROVIDER` | SMTP config used              |
| ---------------- | ----------------------------- |
| `mailtrap`       | MailTrap sandbox SMTP         |
| `smtp`           | Generic SMTP (Gmail etc.)     |

---

## Middleware & Route Protection

`middleware.ts` runs on all `/dashboard/*` routes:

1. Call `auth()` from Auth.js to read session.
2. No session → redirect `/login`.
3. Session present → enforce role-based path access:

| Role | Allowed path prefix |
| ---- | ------------------- |
| `owner` | `/dashboard/owner`, `/dashboard/trainer`, `/dashboard/member` |
| `trainer` | `/dashboard/trainer`, `/dashboard/member` |
| `member` | `/dashboard/member` |

Unauthorized path → redirect to the user's own dashboard root.

---

## File Structure

```text
src/
  app/
    (auth)/
      login/page.tsx
      register/page.tsx              # reads ?token= from searchParams
    api/
      auth/
        [...nextauth]/route.ts       # Auth.js GET/POST handler
      invites/
        route.ts                     # POST — create invite + send email
  lib/
    auth/
      auth.ts                        # NextAuth config: provider, adapter, callbacks
      invite.ts                      # createInviteToken(), validateInviteToken()
    email/
      index.ts                       # IEmailService interface + factory
      nodemailer.ts                  # Nodemailer implementation
      templates/
        invite.ts                    # HTML email template for invite
    db/
      connect.ts                     # Mongoose singleton
    repositories/
      user.repository.ts             # IUserRepository + MongoUserRepository
      invite.repository.ts           # IInviteRepository + MongoInviteRepository
  types/
    auth.ts                          # UserRole type, SessionUser (extends Auth.js types)
middleware.ts                        # Route protection
```

---

## Environment Variables

```bash
# MongoDB
MONGODB_URI=

# Auth.js
AUTH_SECRET=                         # openssl rand -base64 32

# Email — development (MailTrap)
EMAIL_PROVIDER=mailtrap
MAILTRAP_HOST=sandbox.smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USER=
MAILTRAP_PASS=

# Email — production (Generic SMTP)
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@yourgym.com
```

---

## Key Constraints

- Invite tokens are single-use: `usedAt` is set atomically on first use.
- Token validation is re-run on form submit (TOCTOU protection).
- `role` and `trainerId` are stored in the Auth.js session and available in all Server Components via `auth()`.
- No JWT stored in localStorage — all session state lives in the httpOnly cookie managed by Auth.js.
