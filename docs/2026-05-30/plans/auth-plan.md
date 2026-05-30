# Auth Implementation Plan

## Goal
A mobile user can sign in with email/password (or Face ID/Touch ID after first login), stay signed in via silent token refresh, and reset a forgotten password through an emailed deep link — all backed by a new NestJS auth module against the shared MongoDB.

## Application
cross-app — `backend/` (NestJS auth module + email) and `mobile/` (React Native auth screens, Zustand store, deep linking). No `web/` changes.

## Source Spec
`.superpowers/specs/2026-05-30-auth-design.md` — read it before any stage. This plan is the executable contract; the spec is the rationale.

## Scope

**In scope:**
- Backend: `RefreshToken` Mongoose model + TTL index; `User` and `PasswordResetToken` model copies for the backend (shared collections).
- Backend: `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password` endpoints.
- Backend: JWT access-token strategy + `JwtAuthGuard` wiring; refresh-token rotation with replay-revocation.
- Backend: minimal email module (Nodemailer dev / Mailgun prod) that sends the single password-reset deep-link email.
- Backend: rate limiting on `/auth/login`.
- Mobile: `auth.store.ts` Zustand store (login, biometric login, refresh, logout, biometrics toggle, hydrate).
- Mobile: Axios API client with a 401 silent-refresh interceptor and single-flight refresh queue.
- Mobile: `LoginScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`, dummy `HomeScreen`, and a Root/Auth/App navigator split.
- Mobile: biometrics first-time-setup bottom sheet after first password login.
- Mobile: `powergym://` deep-link config routing `reset-password?token=` to `ResetPasswordScreen`.
- Mobile: Detox harness setup + auth E2E spec.

**Out of scope:**
- Register screen on mobile (web-only, invite-based).
- Role-based post-login navigation — all roles land on the single dummy `HomeScreen`.
- Universal Links / App Links production config — custom `powergym://` scheme only.
- Biometrics enable/disable settings page after onboarding.
- Social login.
- HTML email templates beyond the single plain-text reset link.
- Any `web/` change (its auth/email stack stays as-is; backend gets its own copies).

## Affected Files

### Backend (`backend/`)
Created:
- `src/modules/auth/auth.module.ts`
- `src/modules/auth/auth.controller.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/dto/login.dto.ts`
- `src/modules/auth/dto/refresh.dto.ts`
- `src/modules/auth/dto/forgot-password.dto.ts`
- `src/modules/auth/dto/reset-password.dto.ts`
- `src/modules/auth/strategies/jwt.strategy.ts`
- `src/modules/auth/models/refresh-token.model.ts` (schema + provider)
- `src/modules/auth/auth.service.spec.ts`
- `src/modules/auth/auth.controller.spec.ts`
- `src/common/models/user.model.ts` (backend copy of shared User schema)
- `src/common/models/password-reset-token.model.ts` (backend copy)
- `src/common/email/email.module.ts`
- `src/common/email/email.service.ts` (interface + provider selection)
- `src/common/email/nodemailer.email.service.ts`
- `src/common/email/mailgun.email.service.ts`
- `src/common/email/email.service.spec.ts`
- `test/auth.e2e-spec.ts`
Modified:
- `src/app.module.ts` (register `JwtModule`, `MongooseModule.forFeature`, `AuthModule`, `EmailModule`, throttler)
- `src/common/guards/jwt-auth.guard.ts` (only if strategy registration requires it — keep existing `AuthGuard('jwt')` shape)
- `backend/package.json` (add `@nestjs/throttler`, `nodemailer`, `mailgun.js`/`form-data`, `@types/nodemailer`)

### Mobile (`mobile/`)
Created:
- `src/stores/auth.store.ts`
- `src/stores/auth.store.spec.ts`
- `src/lib/api/client.ts` (Axios instance + interceptor)
- `src/lib/api/client.spec.ts`
- `src/lib/secure-store.ts` (typed wrapper over `expo-secure-store`)
- `src/screens/LoginScreen.tsx`
- `src/screens/ForgotPasswordScreen.tsx`
- `src/screens/ResetPasswordScreen.tsx`
- `src/screens/HomeScreen.tsx`
- `src/components/BiometricsPrompt.tsx` (bottom sheet)
- `src/components/FaceIdIcon.tsx` (SVG icon)
- `mobile/.detoxrc.js`
- `mobile/e2e/auth.spec.ts`
- `mobile/e2e/jest.config.js`
Modified:
- `src/navigation/index.tsx` (Root → Auth/App split, linking config)
- `mobile/App.tsx` (pass `linking` to `NavigationContainer`, call `hydrate()` on launch)
- `mobile/app.json` (add `"scheme": "powergym"`, `expo-local-authentication` plugin)
- `mobile/package.json` (add `axios`, `expo-local-authentication`, `react-native-svg`; dev: `detox`, `@types/detox`, `jest-circus`)

---

## Stage 1: Backend — Models, Email Module & Auth Scaffold

**Goal**: The backend has the `RefreshToken` model, backend copies of the `User` and `PasswordResetToken` schemas, a working email module (Nodemailer/Mailgun selection), and an `AuthModule` registered in `AppModule` with `JwtModule` and `MongooseModule.forFeature` wired — compiling and unit-tested. No endpoints implemented yet (controller exists but returns nothing meaningful).

**Scope (files)**: `src/modules/auth/models/refresh-token.model.ts`, `src/common/models/user.model.ts`, `src/common/models/password-reset-token.model.ts`, `src/common/email/email.service.ts`, `src/common/email/nodemailer.email.service.ts`, `src/common/email/mailgun.email.service.ts`, `src/common/email/email.module.ts`, `src/common/email/email.service.spec.ts`, `src/modules/auth/auth.module.ts`, `src/modules/auth/auth.controller.ts` (empty controller), `src/app.module.ts` (modified), `backend/package.json` (add deps).

**Sprint Contract**:

*Unit tests:*
- [ ] `RefreshTokenSchema > schema > defines userId, tokenHash, expiresAt, createdAt fields with a TTL index on expiresAt`
- [ ] `EmailService > getEmailService > returns NodemailerEmailService when EMAIL_PROVIDER is unset`
- [ ] `EmailService > getEmailService > returns MailgunEmailService when EMAIL_PROVIDER is "mailgun"`
- [ ] `NodemailerEmailService > sendPasswordReset > calls transporter.sendMail with the reset deep-link in the body and the recipient as "to"`

*Integration:*
- [ ] App boots: `Test.createTestingModule({ imports: [AppModule] }).compile()` resolves and `app.init()` succeeds with `AuthModule`, `JwtModule`, and `EmailModule` registered (no missing-provider errors).
- [ ] `RefreshTokenModel` is injectable in `AuthModule` — a test module that injects `getModelToken('RefreshToken')` resolves the model.

**TDD sequence**:
1. Write failing unit tests for the schema shape, email-provider selection, and `sendPasswordReset` → Red
2. Add deps, implement models + email module + auth module scaffold, wire `AppModule` → Green
3. Write the boot/injectability integration check against the real Nest test harness → passes

**Status**: Complete

### Stage 1 Checkpoint
- [x] `src/modules/auth/models/refresh-token.model.ts` — RefreshToken schema with userId, tokenHash, expiresAt, createdAt + TTL index
- [x] `src/common/models/user.model.ts` — backend copy of User schema
- [x] `src/common/models/password-reset-token.model.ts` — backend copy of PasswordResetToken schema
- [x] `src/common/email/email.service.ts` — IEmailService interface + EMAIL_SERVICE token
- [x] `src/common/email/nodemailer.email.service.ts` — NodemailerEmailService (sendPasswordReset)
- [x] `src/common/email/mailgun.email.service.ts` — MailgunEmailService (sendPasswordReset)
- [x] `src/common/email/email.module.ts` — EmailModule with provider selection
- [x] `src/common/email/email.service.spec.ts` — unit tests for provider selection + sendPasswordReset
- [x] `src/modules/auth/auth.module.ts` — AuthModule with JwtModule + MongooseModule.forFeature + EmailModule
- [x] `src/modules/auth/auth.controller.ts` — empty controller scaffold
- [x] `src/modules/auth/auth.service.ts` — empty service scaffold
- [x] `src/app.module.ts` — AuthModule, EmailModule, ThrottlerModule registered
- [x] `src/app.module.spec.ts` — boot + injectability integration tests
- [x] `src/modules/auth/models/refresh-token.model.spec.ts` — schema field + TTL index tests

---

## Stage 2: Backend — Login, Refresh & Logout Endpoints

**Goal**: `/auth/login`, `/auth/refresh`, and `/auth/logout` are fully implemented with JWT access tokens, hashed refresh tokens, rotation, replay-revocation, and rate-limited login. The JWT strategy validates access tokens and `JwtAuthGuard` protects `/auth/logout`.

**Scope (files)**: `src/modules/auth/auth.service.ts`, `src/modules/auth/auth.controller.ts`, `src/modules/auth/dto/login.dto.ts`, `src/modules/auth/dto/refresh.dto.ts`, `src/modules/auth/strategies/jwt.strategy.ts`, `src/common/guards/jwt-auth.guard.ts` (verify), `src/modules/auth/auth.service.spec.ts`, `src/modules/auth/auth.controller.spec.ts`, `test/auth.e2e-spec.ts` (login/refresh/logout sections), `src/app.module.ts` (throttler config if not added in Stage 1).

**Dependencies**: Stage 1.

**Sprint Contract**:

*Unit tests:*
- [x] `AuthService > login > returns access + refresh tokens and user payload when email and password are valid`
- [x] `AuthService > login > throws UnauthorizedException when password does not match passwordHash`
- [x] `AuthService > login > throws UnauthorizedException when email is unknown`
- [x] `AuthService > refresh > deletes the old refresh token and issues a new access+refresh pair when the presented token hash matches a stored token`
- [x] `AuthService > refresh > revokes all of the user's refresh tokens and throws Unauthorized when a replayed (already-deleted) token is presented`
- [x] `AuthService > logout > deletes the matching refresh token document for the user`
- [x] `JwtStrategy > validate > returns { sub, firstName, lastName, role, trainerId } from a decoded access-token payload`

*Integration (`test/auth.e2e-spec.ts`):*
- [x] `POST /auth/login` with valid seeded credentials → 201 with `accessToken`, `refreshToken`, and `user` in the body; wrong password → 401; unknown email → 401; malformed body (missing email) → 400.
- [x] `POST /auth/refresh` with a valid refresh token → 200/201 with a new `accessToken` + `refreshToken`; replaying the now-deleted token → 401 and a subsequent valid refresh for that user also fails (all revoked).
- [x] `POST /auth/logout` with a valid `Authorization: Bearer` access token → 200/201 and the refresh token is gone; no token → 401.
- [x] `POST /auth/login` exceeding the rate limit returns 429.

**TDD sequence**:
1. Write failing service unit tests (login/refresh/logout/strategy) → Red
2. Implement service, DTOs, strategy, controller, guard wiring → Green
3. Write/extend `auth.e2e-spec.ts` for login/refresh/logout/rate-limit against the real Nest stack → passes

**Status**: Complete

### Stage 2 Checkpoint
- [x] `src/modules/auth/auth.service.spec.ts` — unit tests for login/refresh/logout
- [x] `src/modules/auth/strategies/jwt.strategy.ts` — JwtStrategy validate
- [x] `src/modules/auth/strategies/jwt.strategy.spec.ts` — JwtStrategy unit test
- [x] `src/modules/auth/dto/login.dto.ts` — LoginDto with validation
- [x] `src/modules/auth/dto/refresh.dto.ts` — RefreshDto with validation
- [x] `src/modules/auth/auth.service.ts` — login, refresh, logout implementation
- [x] `src/modules/auth/auth.controller.ts` — login, refresh, logout routes
- [x] `src/modules/auth/auth.module.ts` — PassportModule + JwtStrategy added
- [x] `src/app.module.ts` — ThrottlerGuard as APP_GUARD
- [x] `test/auth.e2e-spec.ts` — integration tests for all endpoints + rate limit

---

## Stage 3: Backend — Forgot & Reset Password Endpoints

**Goal**: `/auth/forgot-password` creates a `PasswordResetToken` and sends the reset deep-link email; `/auth/reset-password` validates the token, updates the user's `passwordHash`, marks the token used, and revokes all refresh tokens for that user. Unknown emails do not leak existence.

**Scope (files)**: `src/modules/auth/auth.service.ts` (extend), `src/modules/auth/auth.controller.ts` (extend), `src/modules/auth/dto/forgot-password.dto.ts`, `src/modules/auth/dto/reset-password.dto.ts`, `src/modules/auth/auth.service.spec.ts` (extend), `src/modules/auth/auth.controller.spec.ts` (extend), `test/auth.e2e-spec.ts` (forgot/reset sections).

**Dependencies**: Stage 1, Stage 2.

**Sprint Contract**:

*Unit tests:*
- [ ] `AuthService > forgotPassword > creates a PasswordResetToken with a hashed token and calls email.sendPasswordReset with a powergym://reset-password?token= deep link for a known email`
- [ ] `AuthService > forgotPassword > resolves without creating a token or sending email for an unknown email (no existence leak)`
- [ ] `AuthService > resetPassword > updates the user's passwordHash, marks the token usedAt, and revokes all of the user's refresh tokens for a valid token`
- [ ] `AuthService > resetPassword > throws BadRequest/Unauthorized for an expired token`
- [ ] `AuthService > resetPassword > throws BadRequest/Unauthorized for an unknown/already-used token`

*Integration (`test/auth.e2e-spec.ts`):*
- [ ] `POST /auth/forgot-password` with a known email → 200/201 and a `PasswordResetToken` document is created; with an unknown email → same 200/201 response shape and no token created; missing email → 400.
- [ ] `POST /auth/reset-password` with a valid token + matching passwords → 200/201, the user can then log in with the new password, and any pre-existing refresh token for that user is revoked; expired token → 400/401; already-used token → 400/401.

**TDD sequence**:
1. Write failing service unit tests for forgot/reset (success, unknown email, expired, used) → Red
2. Implement service methods, DTOs, controller routes (email mocked in unit tests) → Green
3. Extend `auth.e2e-spec.ts` for both endpoints against the real stack with the email service mocked at the module boundary → passes

**Status**: Complete

### Stage 3 Checkpoint
- [x] `src/modules/auth/dto/forgot-password.dto.ts` — ForgotPasswordDto with @IsEmail
- [x] `src/modules/auth/dto/reset-password.dto.ts` — ResetPasswordDto with token + newPassword
- [x] `src/modules/auth/auth.service.ts` — forgotPassword + resetPassword methods added
- [x] `src/modules/auth/auth.controller.ts` — POST /auth/forgot-password + POST /auth/reset-password routes
- [x] `src/modules/auth/auth.service.spec.ts` — 5 new unit tests for forgotPassword + resetPassword
- [x] `test/auth.e2e-spec.ts` — forgot-password and reset-password integration test sections

---

## Stage 4: Mobile — Secure Store, API Client & Auth Store

**Goal**: The mobile app has a typed secure-store wrapper, an Axios client with a single-flight 401 silent-refresh interceptor, and a Zustand `auth.store` implementing login, biometric login, refresh, logout, biometrics toggle, and hydrate against the backend contract. No screens yet.

**Scope (files)**: `src/lib/secure-store.ts`, `src/lib/api/client.ts`, `src/lib/api/client.spec.ts`, `src/stores/auth.store.ts`, `src/stores/auth.store.spec.ts`, `mobile/app.json` (add `expo-local-authentication` plugin), `mobile/package.json` (add `axios`, `expo-local-authentication`).

**Dependencies**: Stage 2 (login/refresh/logout contract), Stage 3 (reset contract used by store error paths). The backend need not be running — store/client tests mock the HTTP layer and `expo-secure-store`/`expo-local-authentication`.

**Sprint Contract**:

*Unit tests:*
- [ ] `useAuthStore > login > on success stores accessToken + user in state and writes the raw refresh token to secure store under "refresh_token"`
- [ ] `useAuthStore > login > on 401 leaves accessToken null and surfaces an invalid-credentials error without writing the refresh token`
- [ ] `useAuthStore > refresh > returns false and clears auth state when no refresh token is in secure store`
- [ ] `useAuthStore > loginWithBiometrics > calls authenticateAsync, and on success reads refresh_token and calls refresh()`
- [ ] `useAuthStore > setBiometricsEnabled > writes "true"/"false" to secure store under "biometrics_enabled" and updates state`
- [ ] `useAuthStore > logout > clears accessToken+user from state and deletes refresh_token from secure store`
- [ ] `useAuthStore > hydrate > with biometrics disabled resolves to an unauthenticated state (no biometric prompt)`
- [ ] `apiClient > interceptor > on a 401 calls refresh once, retries the original request with the new access token, and queues concurrent 401s behind the single refresh call`
- [ ] `apiClient > interceptor > when refresh fails, calls logout and does not retry`

*Integration (mobile uses Detox for E2E; these store-level flows are exercised end-to-end in Stage 6):*
- [ ] (Deferred to Stage 6 E2E) — this stage is unit-only by design; the two E2E criteria for the mobile auth flow live in Stage 6. The 9 unit criteria above exceed the minimum.

**TDD sequence**:
1. Write failing unit tests for the store and the interceptor (mocking `expo-secure-store`, `expo-local-authentication`, and axios) → Red
2. Implement secure-store wrapper, axios client + interceptor, Zustand store → Green
3. `/simplify` the store/client → re-run unit tests green

**Status**: Complete

### Stage 4 Checkpoint
- [x] `src/lib/secure-store.ts` — typed wrapper over expo-secure-store
- [x] `src/lib/api/client.ts` — Axios instance + single-flight 401 interceptor
- [x] `src/lib/api/client.spec.ts` — 2 interceptor unit tests (concurrent 401 queue + refresh failure)
- [x] `src/stores/auth.store.ts` — Zustand store: login, loginWithBiometrics, refresh, logout, setBiometricsEnabled, hydrate
- [x] `src/stores/auth.store.spec.ts` — 7 store unit tests
- [x] `mobile/app.json` — expo-local-authentication plugin added
- [x] `mobile/package.json` — axios, expo-local-authentication, jwt-decode added
- [x] `mobile/eslint.config.js` — ESLint v9 config (required for lint to run)

---

## Stage 5: Mobile — Auth Screens, Navigation & Deep Linking

**Goal**: Login, ForgotPassword, ResetPassword, and a dummy Home screen exist and are wired into a Root navigator that switches between an `AuthStack` and `AppStack` based on `auth.store` state. The biometrics first-time-setup bottom sheet appears after a first password login. `powergym://reset-password?token=` deep-links open `ResetPasswordScreen` with the token. Screens follow the mobile design system.

**Scope (files)**: `src/screens/LoginScreen.tsx`, `src/screens/ForgotPasswordScreen.tsx`, `src/screens/ResetPasswordScreen.tsx`, `src/screens/HomeScreen.tsx`, `src/components/BiometricsPrompt.tsx`, `src/components/FaceIdIcon.tsx`, `src/navigation/index.tsx` (modified), `mobile/App.tsx` (modified — `linking` + `hydrate()` on launch), `mobile/app.json` (add `"scheme": "powergym"`), `mobile/package.json` (add `react-native-svg`).

**Dependencies**: Stage 4 (store + client).

**Sprint Contract**:

*Unit tests (React Native Testing Library):*
- [ ] `LoginScreen > renders > shows Email + Password inputs and a Sign In button; the "Sign in with Face ID" button is hidden when biometricsEnabled is false and shown when true`
- [ ] `LoginScreen > submit > calls auth.login with the entered email and password when Sign In is pressed`
- [ ] `LoginScreen > error > renders an invalid-credentials message when auth.login rejects with an auth error`
- [ ] `ForgotPasswordScreen > submit > calls the forgot-password action and renders the "Check your email" confirmation on success`
- [ ] `ResetPasswordScreen > validation > shows an error and does not submit when New Password and Confirm Password differ`
- [ ] `ResetPasswordScreen > submit > calls the reset action with the route-param token and the new password, then navigates to Login on success`
- [ ] `BiometricsPrompt > Enable > calls setBiometricsEnabled(true); Skip > dismisses without changing biometrics state`
- [ ] `RootNavigator > renders AuthStack when unauthenticated and AppStack (HomeScreen) when an accessToken is present`

*E2E (Detox — implemented in Stage 6):*
- [ ] (Covered in Stage 6) Golden path login → HomeScreen.
- [ ] (Covered in Stage 6) Deep-link reset-password flow.

**TDD sequence**:
1. Write failing RNTL tests for each screen + navigator switching + biometrics prompt → Red
2. Implement screens, SVG Face ID icon, bottom sheet, navigator split, deep-link `linking` config, `hydrate()` on launch → Green
3. `/simplify` → re-run unit tests green. Run `design-reviewer` after the Evaluator passes.

**Status**: Not Started

---

## Stage 6: Mobile — Detox E2E Harness & Auth Flows

**Goal**: Detox is configured for the project and an `auth.spec.ts` E2E suite passes against a real simulator covering the golden login path, the biometrics enable-then-relaunch path, the forgot-password flow, and the deep-link reset-password flow.

**Scope (files)**: `mobile/.detoxrc.js`, `mobile/e2e/jest.config.js`, `mobile/e2e/auth.spec.ts`, `mobile/package.json` (add `detox`, `@types/detox`, `jest-circus`; Detox build/test scripts), `testID` props added to the relevant screen elements in `src/screens/*` and `src/components/BiometricsPrompt.tsx` (test-id-only additions, no behavior change).

**Dependencies**: Stage 5 (screens + navigation). Requires the backend (Stages 1-3) reachable or a seeded test user for the golden path; document the seed/test-user requirement at the top of the spec.

**Sprint Contract**:

*Unit tests:*
- [ ] (None new — this stage adds E2E coverage; any `testID` additions are exercised by the existing Stage 5 RNTL tests, which must still pass.)

*E2E (`mobile/e2e/auth.spec.ts`, Detox on a real simulator):*
- [ ] Golden path: launch app (unauthenticated) → enter valid email + password → tap Sign In → HomeScreen is visible.
- [ ] Biometrics: after a first successful login the enable prompt appears → tap Enable → relaunch the app → Face ID prompt path resolves to HomeScreen (biometric auth mocked/stubbed at the simulator boundary as Detox requires).
- [ ] Forgot password: from Login tap "Forgot password?" → enter email → tap Send Reset Link → "Check your email" confirmation is visible.
- [ ] Deep-link reset: open `powergym://reset-password?token=<token>` → ResetPasswordScreen is shown with the token → enter matching new passwords → tap Reset Password → returns to LoginScreen with a success message.

**TDD sequence**:
1. Configure `.detoxrc.js` + e2e jest config; add `testID`s to screens (Stage 5 RNTL tests stay green).
2. Write `auth.spec.ts` covering the four flows; build and run against the simulator until green.
3. Confirm `cd mobile && pnpm test` and the Detox run both pass before marking complete.

**Status**: Not Started

---

## Architectural Notes & Risks

- **Shared Mongoose models duplicated, not imported.** `backend/` cannot import `web/src/lib/db/models/*` (separate tsconfig/package). The backend gets its own `User`, `PasswordResetToken`, and new `RefreshToken` schemas pointing at the same collections. Field names and the `mongoose.models.X ?? mongoose.model(...)` guard must match the web schemas exactly to avoid collection drift — Generator must copy field-for-field from `web/src/lib/db/models/`.
- **Password reset hashing must be cross-compatible.** Web creates/consumes `PasswordResetToken` and `User.passwordHash` with bcryptjs. The backend must use the same hashing scheme (`bcryptjs`, already a dep) so tokens/passwords created on either side validate on the other.
- **New runtime deps not yet installed.** Backend: `@nestjs/throttler`, `nodemailer`, `@types/nodemailer`, plus a Mailgun client. Mobile: `axios`, `expo-local-authentication`, `react-native-svg`, and Detox dev deps. Each stage that needs a dep installs it within that stage.
- **Detox in CI requires a native build + macOS runner** (per `.claude/instructions/testing.md`). Stage 6 sets up the harness; if no simulator/CI is available the Evaluator must run it locally before the stage can pass — it cannot be marked complete on unit tests alone.
- **Token rotation replay-revocation is security-critical** and is the easiest criterion to fake. Stage 2's e2e replay test (replay deleted token → all revoked) is the gate — do not accept a stubbed pass.
- **`scheme` and `expo-local-authentication` plugin** must be added to `app.json` (Stage 4/5); deep links and biometrics will silently no-op in a dev build otherwise.
