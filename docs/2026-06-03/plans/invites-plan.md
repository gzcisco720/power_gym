# Invites (Mobile) Implementation Plan

## Goal
Owners and Trainers can view their own sent invites, create new invite tokens (with role-appropriate options), copy the invite link, and revoke unused invites — from the mobile app.

## Application
cross-app: `backend/` (new invites module) + `mobile/` (data layer, screens, Detox E2E). No `web/` changes.

## Scope
**In scope:**
- Backend `invites` module: `GET /invites`, `POST /invites`, `DELETE /invites/:id`, `GET /invites/trainers` (owner-only trainer list for the assignment picker).
- Role rules enforced in the service: Owner may create `trainer` or `member` invites; Trainer may create `member` invites only; a `member` invite requires a `trainerId`.
- Invite token generated server-side (`crypto.randomUUID()`), `expiresAt` set to now + 48h, `usedAt: null`, `invitedBy` = current user.
- Mobile data layer: `Invite` types, `invites.api.ts`, `invites.store.ts` (Zustand).
- Mobile screens: `InvitesScreen` (list with pending/expired/used status), `CreateInviteBottomSheet` (role picker, email, owner-only trainer picker), per-card copy-link and revoke.
- Wire `InvitesScreen` into the navigation registry, replacing the placeholder.
- Detox E2E for Owner and Trainer invite flows.

**Out of scope:**
- Editing an existing invite (no PATCH).
- Resend / regenerate flows (web-only feature).
- Email delivery of invites (mobile uses copy-link only).
- The public registration/accept flow that consumes a token.
- Any `web/` changes.
- Stat-card counters (web has them; mobile list groups by status only).

## Affected Files

### Stage 1 — Backend (`backend/`)
Create:
- `src/modules/invites/invites.module.ts`
- `src/modules/invites/invites.controller.ts`
- `src/modules/invites/invites.service.ts`
- `src/modules/invites/dto/create-invite.dto.ts`
- `src/modules/invites/invites.service.spec.ts`
- `src/modules/invites/invites.controller.spec.ts`
- `test/invites.e2e-spec.ts`
Modify:
- `src/app.module.ts` (register `InvitesModule`)

### Stage 2 — Mobile data layer (`mobile/`)
Create:
- `src/types/invites.ts`
- `src/lib/api/invites.api.ts`
- `src/lib/api/invites.api.spec.ts`
- `src/stores/invites.store.ts`
- `src/stores/invites.store.spec.ts`

### Stage 3 — Mobile screens + E2E (`mobile/`)
Create:
- `src/screens/invites/InvitesScreen.tsx`
- `src/screens/invites/InvitesScreen.spec.tsx`
- `src/screens/invites/CreateInviteBottomSheet.tsx`
- `src/screens/invites/CreateInviteBottomSheet.spec.tsx`
- `e2e/owner/invites.spec.ts`
- `e2e/trainer/invites.spec.ts`
Modify:
- `src/navigation/index.tsx` (import real `InvitesScreen`, register in `SCREEN_REGISTRY`)
- `src/screens/placeholders/index.ts` (remove `InvitesScreen` placeholder export)

---

## Stage 1: Backend invites module

**Goal**: A NestJS `invites` module exposing list, create, revoke, and owner trainer-list endpoints, guarded by JWT + role guard with role-specific creation rules enforced in the service.

**Reference patterns**: `backend/src/modules/service-types/` (controller/service/module/dto + spec layout); `backend/test/service-types.e2e-spec.ts` (e2e harness with `MongoMemoryServer`, `seed-user-role`-style user creation, login-for-token). Model already exists at `src/common/models/invite-token.model.ts`. `User` model at `src/common/models/user.model.ts`.

**Endpoint contract**:
- `GET /invites` — returns invites where `invitedBy = req.user.sub`, sorted `expiresAt: -1`. Roles: owner, trainer.
- `GET /invites/trainers` — returns `[{ _id, name }]` for all users with `role: 'trainer'` (for owner's assignment picker). Roles: owner only.
- `POST /invites` — body `{ role, recipientEmail, trainerId? }`. Roles: owner, trainer. Service sets `token = crypto.randomUUID()`, `expiresAt = now + 48h`, `usedAt = null`, `invitedBy = req.user.sub`. Returns 201 with the created document.
- `DELETE /invites/:id` — deletes the invite only if it belongs to `req.user.sub` and `usedAt === null`. Returns 200. Roles: owner, trainer.

**Service rules** (enforced in `invites.service.ts`, taking the creating user's role + sub):
- Owner: `role` must be `'trainer'` or `'member'`. If `role === 'member'`, `trainerId` is required (else `BadRequestException`).
- Trainer: `role` must be `'member'` (else `ForbiddenException`); `trainerId` is forced to the trainer's own `sub` regardless of body.
- Delete: `findOne({ _id, invitedBy })` → if not found `NotFoundException`; if `usedAt !== null` `BadRequestException` ("Cannot revoke a used invite").

**DTO** (`create-invite.dto.ts`): `role: @IsIn(['trainer','member'])`; `recipientEmail: @IsEmail`; `trainerId?: @IsOptional @IsMongoId`.

**Sprint Contract**:

*Unit tests:*
- [x] `InvitesService > create > owner with role:"member" and no trainerId throws BadRequestException`
- [x] `InvitesService > create > owner with role:"member" and a trainerId calls model.create with token (uuid), expiresAt ~48h ahead, usedAt:null, invitedBy from userId, and the given trainerId`
- [x] `InvitesService > create > owner with role:"trainer" calls model.create with role:"trainer" and trainerId:null`
- [x] `InvitesService > create > trainer with role:"trainer" throws ForbiddenException`
- [x] `InvitesService > create > trainer with role:"member" forces trainerId to the trainer's own userId (ignoring any body trainerId)`
- [x] `InvitesService > findMine > calls find({ invitedBy: userId }) then sort({ expiresAt: -1 }) and returns the result`
- [x] `InvitesService > listTrainers > calls find({ role:"trainer" }) and returns mapped {_id, name} entries`
- [x] `InvitesService > revoke > throws NotFoundException when no invite matches { _id, invitedBy }`
- [x] `InvitesService > revoke > throws BadRequestException when the matched invite has a non-null usedAt`
- [x] `InvitesService > revoke > deletes and resolves when the invite belongs to the user and usedAt is null`
- [x] `InvitesController > create > passes req.user.role and req.user.sub to service.create alongside the dto`
- [x] `InvitesController > findMine > passes req.user.sub to service.findMine`

*Integration / E2E (`test/invites.e2e-spec.ts`, full request cycle vs MongoMemoryServer):*
- [x] `POST /invites` as owner with `{role:"trainer", recipientEmail:"t@x.com"}` → 201 with `_id`, `token` (non-empty), `usedAt:null`, `invitedBy` present
- [x] `POST /invites` as owner with `{role:"member", recipientEmail:"m@x.com"}` (no trainerId) → 400
- [x] `POST /invites` as trainer with `{role:"trainer", recipientEmail:"t@x.com"}` → 403
- [x] `POST /invites` as member token → 403; with no token → 401
- [x] `GET /invites` as owner → 200 array containing only invites created by that owner, sorted by `expiresAt` descending
- [x] `GET /invites/trainers` as owner → 200 array of `{_id, name}`; as trainer → 403
- [x] `DELETE /invites/:id` as the creating owner on an unused invite → 200, and a subsequent `GET /invites` no longer includes it
- [x] `DELETE /invites/:id` with an id belonging to another user → 404

**TDD sequence**:
1. Write `invites.service.spec.ts` + `invites.controller.spec.ts` → Red
2. Implement `invites.service.ts`, `invites.controller.ts`, dto, module; register in `app.module.ts` → Green
3. Write `test/invites.e2e-spec.ts` against the real Nest app + MongoMemoryServer → passes

**Status**: Complete

---

## Stage 2: Mobile data layer

**Goal**: Typed API functions and a Zustand store for invites that the screens consume, mirroring the `service-types` data layer.

**Reference patterns**: `mobile/src/lib/api/service-types.api.ts` + `.spec.ts`; `mobile/src/stores/service-types.store.ts`; `mobile/src/types/service-types.ts`. API client at `mobile/src/lib/api/client.ts`.

**Types** (`src/types/invites.ts`):
- `InviteRole = 'trainer' | 'member'`
- `InviteStatus = 'pending' | 'expired' | 'used'` (derived client-side)
- `Invite { _id; token; role: InviteRole; recipientEmail; expiresAt: string; usedAt: string | null; trainerId: string | null; invitedBy: string }`
- `CreateInviteDto { role: InviteRole; recipientEmail: string; trainerId?: string }`
- `TrainerOption { _id: string; name: string }`
- A pure helper `inviteStatus(invite: Invite, now?: Date): InviteStatus` — `used` if `usedAt` set, else `expired` if `expiresAt <= now`, else `pending`.

**API** (`src/lib/api/invites.api.ts`):
- `fetchInvites(): Promise<Invite[]>` → GET `/invites`
- `fetchTrainerOptions(): Promise<TrainerOption[]>` → GET `/invites/trainers`
- `createInvite(dto): Promise<Invite>` → POST `/invites`
- `revokeInvite(id): Promise<void>` → DELETE `/invites/:id`

**Store** (`src/stores/invites.store.ts`): `{ items, trainers, loading, error, fetchInvites(), fetchTrainers(), addItem(invite), removeItem(id) }`. `fetchInvites` sets `loading`, populates `items`, clears `loading` on success, sets `error` on failure. `addItem` prepends. `removeItem` filters by `_id`.

**Sprint Contract**:

*Unit tests:*
- [x] `inviteStatus > returns "used" when usedAt is a non-null ISO string regardless of expiry`
- [x] `inviteStatus > returns "expired" when usedAt is null and expiresAt is in the past`
- [x] `inviteStatus > returns "pending" when usedAt is null and expiresAt is in the future`
- [x] `invites.api > fetchInvites > calls apiClient.get("/invites") and returns response.data`
- [x] `invites.api > createInvite > calls apiClient.post("/invites", dto) and returns response.data`
- [x] `invites.api > revokeInvite > calls apiClient.delete("/invites/:id")`
- [x] `invites.api > fetchTrainerOptions > calls apiClient.get("/invites/trainers") and returns response.data`
- [x] `useInvitesStore > fetchInvites > populates items and sets loading false on success`
- [x] `useInvitesStore > fetchInvites > sets error and loading false when the api rejects`
- [x] `useInvitesStore > addItem > prepends the new invite to items`
- [x] `useInvitesStore > removeItem > removes the invite with the matching _id`

*Integration / E2E:* (none — this is a non-UI data layer; covered end-to-end in Stage 3)

**TDD sequence**:
1. Write `invites.api.spec.ts` (mocking `apiClient`) and `invites.store.spec.ts` → Red
2. Implement `invites.ts` types + `inviteStatus`, `invites.api.ts`, `invites.store.ts` → Green

**Status**: Complete

---

## Stage 3: Mobile screens + Detox E2E

**Goal**: A working `InvitesScreen` (status-grouped list, copy-link, revoke-with-confirm) and `CreateInviteBottomSheet` (role-aware form), wired into navigation, verified by Detox for Owner and Trainer.

**Reference patterns**: `mobile/src/screens/services/ServicesScreen.tsx` + `ServiceBottomSheet.tsx` (header `+` button, Modal bottom sheet, footer save bar, dirty/feedback handling); `mobile/e2e/owner/services.spec.ts` and `mobile/e2e/owner/body-tests.spec.ts` (Detox harness: `seed-user-role`, login, drawer navigation, prefix-matched card IDs). Design rules: `.claude/instructions/design.md` (mobile section) — tokens only, `text-foreground/65`, `accessibilityLabel` on every touchable, no `Alert.alert` confirmations (use a Dialog/Modal), `Clipboard` for copy.

**Screen behavior**:
- `InvitesScreen`: header title "Invites", subtitle, `+ Create Invite` button (`testID="invites-create-button"`) opening the bottom sheet. List grouped by status (pending, expired, used) using `inviteStatus`. Each card (`testID="invite-card-<id>"`) shows recipientEmail, a role badge, a status badge (pending=emerald, expired=muted, used=primary), expiry/used date, a copy-link button (`testID="invite-copy-<id>"`, uses `expo-clipboard`, shows transient "Copied" feedback), and a revoke button (`testID="invite-revoke-<id>"`) — revoke shown only for pending invites. Skeleton rows while loading. Calls `fetchInvites` on mount; owner also calls `fetchTrainers`.
- Revoke uses a confirmation Dialog/Modal (`testID="invite-revoke-confirm"`) — never `Alert.alert`. On confirm calls `revokeInvite` then `removeItem`.
- `CreateInviteBottomSheet`: role picker — owner sees `trainer` + `member` options (`testID="invite-role-trainer"`, `invite-role-member`); trainer sees `member` only (role fixed, picker hidden or single-option). Email input (`testID="invite-email-input"`). Trainer picker (`testID="invite-trainer-picker"`) visible only for owner when `role === 'member'`; selecting required before save. Save button (`testID="invite-save-button"`) disabled until required fields valid (valid email; trainerId when owner+member). On success calls `createInvite` → `addItem` → closes; shows error feedback on failure. The creating user's role comes from `useAuthStore`.

**Sprint Contract**:

*Unit tests (Jest + RNTL, store/api mocked):*
- [ ] `InvitesScreen > renders a card per invite returned by the store with its recipientEmail`
- [ ] `InvitesScreen > shows a revoke button only on pending invites (not on used or expired)`
- [ ] `InvitesScreen > tapping the revoke confirm button calls revokeInvite then removeItem for that id`
- [ ] `CreateInviteBottomSheet > owner sees both trainer and member role options`
- [ ] `CreateInviteBottomSheet > trainer sees member role only and no trainer picker`
- [ ] `CreateInviteBottomSheet > owner selecting role "member" reveals the trainer picker and keeps save disabled until a trainer is chosen`
- [ ] `CreateInviteBottomSheet > save button is disabled when the email is empty/invalid`
- [ ] `CreateInviteBottomSheet > successful save calls createInvite with the form values and addItem with the result`

*E2E (Detox, real simulator + backend):*
- [ ] `Owner: invites.spec.ts` golden path → log in as owner, open Invites, tap Create Invite, pick role "trainer", type an email, save → a new `invite-card-*` appears in the list
- [ ] `Owner: invites.spec.ts` revoke → tap copy-link on a pending card (shows "Copied"), tap revoke, confirm in the dialog → that card is gone
- [ ] `Owner: invites.spec.ts` member-invite gating → pick role "member" with no trainer selected → save button stays disabled until a trainer is chosen
- [ ] `Trainer: invites.spec.ts` golden path → log in as trainer, open Invites, tap Create Invite (role is member, no trainer picker shown), type an email, save → a new `invite-card-*` appears

**TDD sequence**:
1. Write `InvitesScreen.spec.tsx` + `CreateInviteBottomSheet.spec.tsx` → Red
2. Implement both components, swap the navigation registry to the real screen, remove the placeholder export → Green (Jest + lint pass)
3. Write `e2e/owner/invites.spec.ts` and `e2e/trainer/invites.spec.ts`, build Detox, run against a booted simulator + running backend → passes

**Status**: In Progress

### Stage 3 Checkpoint
- [x] `InvitesScreen.tsx` + `InvitesScreen.spec.tsx`
- [x] `CreateInviteBottomSheet.tsx` + `CreateInviteBottomSheet.spec.tsx`
- [x] Navigation wiring (index.tsx + placeholders/index.ts)
- [x] `e2e/owner/invites.spec.ts`
- [x] `e2e/trainer/invites.spec.ts`
