# Backend V2 — NestJS API Design

**Date**: 2026-05-28
**Scope**: Migrate all backend logic from `web/` into standalone NestJS API. Web frontend untouched in this sprint.

---

## Goal

Build a complete, standalone NestJS API that replicates all business logic currently in the Next.js web app. The API will serve both the existing web frontend (future sprint) and the upcoming mobile app.

---

## Tech Stack

- **Framework**: NestJS 11 (already scaffolded in `backend/`)
- **Database**: MongoDB via `@nestjs/mongoose` — reuse existing Atlas cluster
- **Auth**: Passport.js + `@nestjs/jwt`, access + refresh token strategy
- **Validation**: `class-validator` + `class-transformer`
- **Cron**: `@nestjs/schedule`
- **Testing**: Jest (unit) + Supertest (E2E)
- **Package manager**: pnpm

---

## Module Structure

```
backend/src/
  app.module.ts

  common/
    decorators/       ← @CurrentUser(), @Roles(), @Public()
    guards/           ← JwtAuthGuard (global), RolesGuard, RefreshTokenGuard
    pipes/            ← ValidationPipe config
    filters/          ← HttpExceptionFilter
    interfaces/       ← AuthUser { userId, email, role }

  database/
    database.module.ts   ← MongooseModule.forRoot (global)
    models/              ← 27 schemas, migrated from web/src/lib/db/models/

  auth/
  users/
  training/
  nutrition/
  body-tests/
  schedule/
  check-ins/
  equipment/
  health/
  progress/
  billing/
  account/
  email/
  storage/
  cron/
```

Each domain module follows the same internal structure:

```
<domain>/
  <domain>.module.ts
  <domain>.controller.ts
  <domain>.service.ts
  <domain>.repository.ts    ← migrated from web/src/lib/repositories/
  dto/                      ← input validation classes
```

---

## Auth Design

### Tokens

| Token | Expiry | Storage |
|---|---|---|
| Access token | 15 minutes | Client memory / Authorization header |
| Refresh token | 7 days | MongoDB (for revocation) + client |

**Access token payload**: `{ sub: userId, email, role }`
**Refresh token payload**: `{ sub: userId }`

### Endpoints

```
POST /api/v1/auth/login            → { access_token, refresh_token, user }
POST /api/v1/auth/register         → owner initial registration
POST /api/v1/auth/refresh          → Bearer <refresh_token> → new access_token
POST /api/v1/auth/logout           → revoke refresh token in DB
POST /api/v1/auth/forgot-password  → send reset email
POST /api/v1/auth/reset-password   → validate token, set new password
```

### Route Protection

- **Global `JwtAuthGuard`**: all routes require valid access token by default
- **`@Public()`** decorator: skips guard for auth endpoints (login, register, forgot/reset-password)
- **`RefreshTokenGuard`**: used exclusively on `POST /api/v1/auth/refresh`
- **`@Roles('owner')`** / **`@Roles('owner', 'trainer')`**: role-based access on top of auth

### Passport Strategies

- **`JwtStrategy`**: validates access token, injects `{ userId, email, role }` into `req.user`
- **`RefreshTokenStrategy`**: validates refresh token, checks DB record not revoked

---

## Database Layer

### Connection

`DatabaseModule` uses `@nestjs/mongoose` with `MONGODB_URI` env var. Declared as global module — no repeated imports.

### Models

27 Mongoose schemas migrated directly from `web/src/lib/db/models/` — schema definitions unchanged. Each domain module registers only the models it needs via `MongooseModule.forFeature([...])`.

### Repositories

27 repository classes migrated from `web/src/lib/repositories/`. Logic unchanged; adapted to use `@Injectable()` and `@InjectModel()`. Interface definitions (`IPlanTemplateRepository` etc.) preserved for testability. Each repository is a provider scoped to its domain module.

---

## API Conventions

### Global Setup (`main.ts`)

```typescript
app.setGlobalPrefix('api/v1')
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
app.useGlobalFilters(new HttpExceptionFilter())
```

### DTOs

All request bodies validated with `class-validator`. `whitelist: true` strips unknown fields. `transform: true` auto-converts types (e.g. string → number in query params).

### Response Format

Success: return data directly (no wrapper object).
Error:
```json
{ "statusCode": 404, "message": "Member not found" }
```

### HTTP Status Conventions

- `401`: missing or invalid token
- `403`: valid token, insufficient role
- `404`: resource not found or not owned by current user (prevents enumeration)

### Cross-Domain Dependencies

Resolved via NestJS module imports — domain modules export their Service, importing modules use it directly. No cross-module repository access.

---

## Cross-Cutting Concerns

### Email (`EmailModule`)

- Providers: Nodemailer (dev) / Mailgun (prod), switched by `EMAIL_PROVIDER` env var
- 9 templates migrated from `web/src/lib/email/templates/`
- `EmailService.send(template, to, data)` injected by other modules

### Storage (`StorageModule`)

- Providers: MinIO (dev) / Cloudinary (prod), switched by `UPLOAD_PROVIDER` env var
- Logic migrated from `web/src/lib/storage/`
- `POST /api/v1/upload` — returns URL

### Cron Jobs (`CronModule`, `@nestjs/schedule`)

| Job | Schedule | Source |
|---|---|---|
| `sessionReminders()` | `0 * * * *` | `web/src/app/api/cron/session-reminders` |
| `checkInReminders()` | `0 * * * *` | `web/src/app/api/cron/check-in-reminders` |
| `extendSeries()` | `0 2 * * 1` | `web/src/app/api/cron/extend-series` |
| `sealStaleWorkouts()` | `0 3 * * *` | `web/src/app/api/cron/seal-stale-workouts` |

### FatSecret API

OAuth1 + OAuth2 logic migrated from `web/src/lib/nutrition/fatsecret-*.ts` into `NutritionModule` as private service.

---

## Environment Variables

```
PORT=3001
MONGODB_URI=

JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

EMAIL_PROVIDER=smtp|mailgun
SMTP_HOST=, SMTP_PORT=, SMTP_FROM=
MAILGUN_API_KEY=, MAILGUN_DOMAIN=

UPLOAD_PROVIDER=local|cloudinary
MINIO_ENDPOINT=, MINIO_ACCESS_KEY=, MINIO_SECRET_KEY=, MINIO_BUCKET=, MINIO_PUBLIC_URL=
CLOUDINARY_CLOUD_NAME=, CLOUDINARY_API_KEY=, CLOUDINARY_API_SECRET=

FATSECRET_CLIENT_ID=
FATSECRET_CLIENT_SECRET=
FATSECRET_CLIENT_AUTH_METHOD=oauth1
```

---

## Testing Strategy

- **Unit tests**: each Service tested in isolation with mocked Repositories
- **E2E tests**: Supertest against a real NestJS app instance + test MongoDB
- **Sprint Contract verification**: `cd backend && pnpm test:e2e`
- Evaluator checks each domain's E2E spec against the Sprint Contract criteria

---

## Out of Scope

- Web frontend changes (Next-Auth integration deferred to web migration sprint)
- Mobile app
- Deployment / infrastructure setup
