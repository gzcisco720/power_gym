# Architecture & Project Context

## Project Overview

POWER_GYM is a gym management web application. The repository is a monorepo with three independent apps: `web/` (Next.js, the main app), `landing/` (Gatsby, static marketing page), and `backend/` (NestJS, v2 API — to be scaffolded). All commands for the web app run from the `web/` directory. It supports three user roles (owner, trainer, member) and provides workout plan management, nutrition plan management, body composition testing, and performance tracking.

## Tech Stack

- **Framework**: Next.js (App Router)
- **UI**: Shadcn/ui + TailwindCSS
- **Database**: MongoDB (via Mongoose or MongoDB driver)
- **Auth**: Auth.js (NextAuth v5) — session via httpOnly cookie, credentials provider, custom role callbacks
- **Package Manager**: `pnpm`
- **Testing**: Jest + React Testing Library (unit/integration), Playwright (E2E)
- **Language**: TypeScript (strict mode, NO `any` or `unknown` in production code)

## User Roles & Access Control

| Role    | Can Do                                                                         |
| ------- | ------------------------------------------------------------------------------ |
| Owner   | Manage trainers, assign members to trainers/self, full plan & body test access |
| Trainer | Invite members, create/edit plans & body tests for own members                 |
| Member  | View own current training plan, nutrition plan, body test history              |

Ownership hierarchy: Owner > Trainer > Member. A member belongs to exactly one trainer (or the owner directly).

## Core Feature Domains

| # | Feature | Notes |
|---|---------|-------|
| 1 | Authentication | Roles, invite tokens, NextAuth session |
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
power_gym/               ← repo root (no package.json)
  web/                   ← Next.js app — run all commands from here
    src/
      app/
        (dashboard)/
          owner/
          trainer/
          member/
        api/
      lib/
        db/
          models/        ← one Mongoose model file per entity
          connect.ts
        repositories/    ← one repository file per model
        animations/
      components/
        ui/              ← Shadcn primitives — do not modify
    __tests__/           ← Jest tests (mirrors src/)
    __mocks__/           ← Jest mocks (next-auth, next/link)
    e2e/                 ← Playwright specs grouped by role
    public/
    context/             ← seed data and dev images
    scripts/             ← migrate and seed scripts
  landing/               ← Gatsby static page (independent)
  backend/               ← NestJS API v2 (to be scaffolded)
  .claude/               ← harness — covers entire repo
    agents/
    instructions/
  docs/                  ← harness Sprint Plans
  .archive/              ← historical design docs
```

For current web app structure run (from `web/`):
```bash
find src/app/api -type d | sort      # API routes
find src/lib -type d | sort          # lib layer
find src/components -type d | sort   # components
```

**Stable conventions (all paths relative to `web/`):**

- Pages live under `src/app/(dashboard)/{owner|trainer|member}/`
- API routes grouped by domain under `src/app/api/`; owner-only routes under `src/app/api/owner/`
- `src/lib/db/models/` — one Mongoose model file per entity
- `src/lib/repositories/` — one repository file per model (interface + MongoDB impl)
- `src/components/ui/` — Shadcn primitives, do not modify
- `__tests__/` mirrors `src/` for Jest; `e2e/` contains Playwright specs grouped by role

## Key Patterns

- **Repository pattern**: Define interfaces (e.g., `IPlanTemplateRepository`) in `lib/repositories/`, implement with MongoDB. Enables mocking in tests.
- **Server Actions vs Route Handlers**: Prefer Next.js Server Actions for form mutations; use Route Handlers for REST-style API calls consumed by client components.
- **Role guard**: Next.js Middleware reads Auth.js session cookie, checks role, and redirects unauthorized requests before rendering.
- **MongoDB singleton**: Connection is established once via `lib/db/connect.ts`; never open connections in component files.
