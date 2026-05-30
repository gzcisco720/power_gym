# Architecture & Project Context

## Project Overview

POWER_GYM is a gym management application. The repository is a monorepo with four applications:

- **`web/`** — Next.js fullstack web app (active)
- **`mobile/`** — React Native + Expo mobile app (in development)
- **`backend/`** — NestJS API serving the mobile app (in development)
- **`landing/`** — Gatsby static marketing page (independent)

`web/` and `mobile/` share the same MongoDB database. `backend/` is the API layer between `mobile/` and that database.

## Tech Stack

### `web/` (Next.js fullstack)

- **Framework**: Next.js (App Router)
- **UI**: Shadcn/ui + TailwindCSS + Framer Motion
- **Database**: MongoDB (via Mongoose)
- **Auth**: NextAuth v5 — session via httpOnly cookie, credentials provider, custom role callbacks
- **Testing**: Jest + React Testing Library (unit/integration), Playwright (E2E)
- **Package manager**: pnpm

### `mobile/` (React Native)

- **Framework**: React Native + Expo
- **UI**: NativeWind + React Native Reusables
- **State**: Zustand
- **Auth**: JWT access + refresh token (via `backend/`)
- **Testing**: Jest + React Native Testing Library (unit), Detox (E2E)
- **Package manager**: pnpm

### `backend/` (NestJS API)

- **Framework**: NestJS
- **Database**: MongoDB (via Mongoose) — same database as `web/`
- **Auth**: JWT access + refresh token
- **Testing**: Jest (unit + integration)
- **Package manager**: pnpm

### `landing/` (Gatsby)

- Independent static marketing page
- No shared code with other applications

## User Roles & Access Control

| Role    | Can Do                                                                         |
| ------- | ------------------------------------------------------------------------------ |
| Owner   | Manage trainers, assign members to trainers/self, full plan & body test access |
| Trainer | Invite members, create/edit plans & body tests for own members                 |
| Member  | View own current training plan, nutrition plan, body test history              |

Ownership hierarchy: Owner > Trainer > Member. A member belongs to exactly one trainer (or the owner directly).

Roles apply across both `web/` and `mobile/`. Auth strategy differs by app:
- `web/` — NextAuth v5 session cookie
- `mobile/` — JWT access + refresh token via `backend/`

## Core Feature Domains

| # | Feature | Notes |
|---|---------|-------|
| 1 | Authentication | Roles, invite tokens, NextAuth (web), JWT (mobile) |
| 2 | Training Plans | Plan templates, workout session logging, exercise notes |
| 3 | Nutrition Plans | Nutrition templates, food items, macro tracking |
| 4 | Body Composition Testing | Skinfold protocols, Jackson-Pollock formulas |
| 5 | Performance Tracking (PBs) | Epley 1RM estimation, per-exercise history |
| 6 | Calendar & Session Scheduling | Recurring series, cron reminders |
| 7 | Check-In System | Daily check-ins, configurable schedule, email reminders |
| 8 | Equipment Management | Inventory, condition reports, image upload |
| 9 | Member Health & Injuries | Injury records, health dashboard |
| 10 | User Profiles & Settings | Per-role profile and settings pages |
| 11 | Progress Charts & Analytics | Training heatmap, 1RM trend charts |
| 12 | Email Notifications | Nodemailer (dev) / Mailgun (prod), 9 triggered templates |

## Directory Structure

```
power_gym/                  ← repo root (no package.json)
  web/                      ← Next.js fullstack web app
    src/
      app/
        (dashboard)/
          owner/
          trainer/
          member/
        api/
      lib/
        db/
          models/           ← one Mongoose model file per entity
          connect.ts
        repositories/       ← one repository file per model
        animations/
      components/
        ui/                 ← Shadcn primitives — do not modify
    __tests__/              ← Jest tests (mirrors src/)
    __mocks__/              ← Jest mocks (next-auth, next/link)
    e2e/                    ← Playwright specs grouped by role
    public/
    context/                ← seed data and dev images
    scripts/                ← migrate and seed scripts
  mobile/                   ← React Native + Expo mobile app
    src/
      components/
      screens/
      stores/               ← Zustand stores
      navigation/           ← React Navigation config
    e2e/                    ← Detox specs
  backend/                  ← NestJS API (serves mobile/)
    src/
      modules/              ← one module per feature domain
      common/               ← guards, interceptors, pipes
    test/                   ← Jest integration tests
  landing/                  ← Gatsby static page (independent)
  .claude/                  ← agent definitions and instructions
    agents/
    instructions/
  docs/                     ← Sprint Contract plans
```

## Commands

```bash
# web/
cd web && pnpm dev          # Dev server (localhost:3000)
cd web && pnpm test         # Jest unit/integration tests
cd web && pnpm test:e2e     # Playwright E2E tests
cd web && pnpm lint         # ESLint
cd web && pnpm build        # Production build

# mobile/
cd mobile && pnpm start     # Expo dev server
cd mobile && pnpm test      # Jest unit tests
cd mobile && pnpm detox test --configuration <config>  # Detox E2E

# backend/
cd backend && pnpm start:dev   # NestJS dev server
cd backend && pnpm test        # Jest unit/integration tests
cd backend && pnpm build       # Production build
```

## Key Patterns

### `web/`
- **Repository pattern**: Interfaces in `lib/repositories/`, MongoDB implementations. Enables mocking in tests.
- **Server Actions vs Route Handlers**: Prefer Next.js Server Actions for form mutations; Route Handlers for REST-style calls consumed by client components.
- **Role guard**: Next.js Middleware reads NextAuth session cookie, checks role, redirects unauthorized requests.
- **MongoDB singleton**: Connection established once via `lib/db/connect.ts`; never open connections in component files.

### `backend/`
- **Module per domain**: Each feature domain (training, nutrition, etc.) is a NestJS module under `src/modules/`.
- **JWT auth**: Access token (short-lived) + refresh token (long-lived, stored in httpOnly cookie). Guards applied at controller level.
- **Shared database**: Uses the same MongoDB instance as `web/` — Mongoose models must be kept in sync between the two apps.

### `mobile/`
- **React Navigation**: All navigation config lives in `src/navigation/`.
- **Zustand stores**: One store per feature domain in `src/stores/`.
- **Token management**: JWT access + refresh tokens stored securely via `expo-secure-store`.
