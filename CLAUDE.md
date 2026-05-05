# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🔴 CRITICAL: TEST-DRIVEN DEVELOPMENT 🔴

**This project follows TDD. Never write implementation code before writing a failing test.**

TDD mechanics (Red-Green-Refactor cadence, stop points) are governed by the **`superpowers:test-driven-development` skill**, which takes precedence over any TDD instructions below.

---

## Project Overview

POWER_GYM is a gym management web application built with Next.js. It supports three user roles (owner, trainer, member) and provides workout plan management, nutrition plan management, body composition testing, and performance tracking.

### Tech Stack

- **Framework**: Next.js (App Router)
- **UI**: Shadcn/ui + TailwindCSS
- **Database**: MongoDB (via Mongoose or MongoDB driver)
- **Auth**: Auth.js (NextAuth v5) — session via httpOnly cookie, credentials provider, custom role callbacks
- **Package Manager**: `pnpm`
- **Testing**: Jest + React Testing Library (unit/integration), Playwright (E2E)
- **Language**: TypeScript (strict mode, NO `any` or `unknown` in production code)

---

## Development Commands

```bash
pnpm dev              # Start dev server (localhost:3000)
pnpm build            # Production build
pnpm lint             # ESLint check
pnpm lint --fix       # ESLint auto-fix
pnpm format           # Prettier format
pnpm test             # Run all unit/integration tests (Jest)
pnpm test --watch     # Watch mode
pnpm test -- --testPathPattern=<path>   # Run a single test file
pnpm test:e2e         # Playwright E2E tests
pnpm test:coverage    # Coverage report
```

---

## User Roles & Access Control

| Role    | Can Do                                                                         |
| ------- | ------------------------------------------------------------------------------ |
| Owner   | Manage trainers, assign members to trainers/self, full plan & body test access |
| Trainer | Invite members, create/edit plans & body tests for own members                 |
| Member  | View own current training plan, nutrition plan, body test history              |

Ownership hierarchy: Owner > Trainer > Member. A member belongs to exactly one trainer (or the owner directly).

---

## Core Feature Domains

Feature names are stable; implementation details live in the code and design docs (`docs/INDEX.md`).

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

---

## Architecture

### Directory Structure (App Router)

For current structure run:
```bash
find src/app/api -type d | sort      # API routes
find src/lib -type d | sort          # lib layer
find src/components -type d | sort   # components
```

**Conventions that don't change:**

- Pages live under `src/app/(dashboard)/{owner|trainer|member}/`
- API routes grouped by domain under `src/app/api/`; owner-only routes under `src/app/api/owner/`
- `src/lib/db/models/` — one Mongoose model file per entity
- `src/lib/repositories/` — one repository file per model (interface + MongoDB impl)
- `src/components/ui/` — Shadcn primitives, do not modify
- `__tests__/` mirrors `src/` for Jest; `e2e/` contains Playwright specs grouped by role

### Key Patterns

- **Repository pattern**: Define interfaces (e.g., `IPlanTemplateRepository`) in `lib/repositories/`, implement with MongoDB. Enables mocking in tests.
- **Server Actions vs Route Handlers**: Prefer Next.js Server Actions for form mutations; use Route Handlers for REST-style API calls consumed by client components.
- **Role guard**: Next.js Middleware reads Auth.js session cookie, checks role, and redirects unauthorized requests before rendering.
- **MongoDB singleton**: Connection is established once via `lib/db/connect.ts`; never open connections in component files.

---

## TypeScript Standards

- **STRICTLY FORBIDDEN**: `any`, `unknown` in production code
- Always define explicit interfaces for all data shapes
- Use `Partial`, `Pick`, `Omit`, type unions/intersections instead of loose types

```typescript
// ✅ GOOD
interface MemberProfile {
  id: string;
  name: string;
  role: 'member';
  trainerId: string;
}

// ❌ BAD
const profile: any = {};
```

---

## TDD Workflow

TDD cadence is handled by the `superpowers:test-driven-development` skill. Core principles that always apply regardless of skill:

- Tests cover typical cases, edge cases, and error cases
- Run tests after each implementation step to confirm state
- Unit/integration tests via Jest; E2E coverage via Playwright

---

## Planning Complex Features

For multi-stage work, create `docs/YYYY-MM-DD/plans/IMPLEMENTATION_PLAN.md`:

```markdown
## Stage N: [Name]

**Goal**: [Specific deliverable]
**Success Criteria**: [Testable outcomes]
**Tests**: [List of TDD test cases]
**Status**: [Not Started|In Progress|Complete]
```

---

## Generated Document Management

> **IMPORTANT — Path override**: These rules take precedence over any skill's default output path (e.g. `docs/superpowers/specs/`). Always use the layout below regardless of what a skill instructs.

### Finding existing documents

**Always check [`docs/INDEX.md`](docs/INDEX.md) first.** It is the single source of truth for all generated documents. Every time you create or delete a doc, update the index.

### Directory Layout

```text
docs/
  INDEX.md          # ← Central registry — check here first
  superseded.md     # Permanent audit trail of superseded design docs
  roadmap.md        # Feature backlog (ideas not yet started)
  YYYY-MM-DD/       # One folder per work date
    plans/          # Implementation plans and design specs
```

Project root files that never move: `CLAUDE.md`, `README.md`.

### File Naming

All generated markdown files use **lowercase kebab-case**:

```text
✅  body-fat-formula-research.md
✅  jwt-auth-implementation-plan.md
❌  BodyFatFormula.md
❌  PLAN.md
```

### Document Types & Where They Go

| Document type       | Folder    | When to create                          |
| ------------------- | --------- | --------------------------------------- |
| Implementation plan | `plans/`  | Before starting any multi-stage feature |
| Design spec         | `plans/`  | When designing a new feature area       |

### Lifecycle Rules

**Create** a new date folder (`docs/YYYY-MM-DD/`) at the start of each distinct work session.

**Update** an existing doc in the same date folder if work continues on the same day.

**Close** an implementation plan by marking all stages `Complete`, then **deleting the file and its INDEX.md row**. The code is the source of truth; no graveyard rows.

**Keep** design docs as long as they accurately reflect the implementation — there is no expiry based on feature completion. A doc becomes a candidate for superseding only when it drifts from reality, not when the feature ships.

**Supersede** a design doc when it no longer accurately reflects the implementation:
1. Remove its row from `INDEX.md`
2. Append a row to [`docs/superseded.md`](superseded.md) with: doc name, original path, date, and reason
3. Delete the file

**INDEX.md hygiene** — keep under 60 lines total:
- Implementation plan rows: delete when the plan file is deleted
- Design doc rows: keep as long as the doc exists and is accurate
- Use `find docs/ -name "*.md" | wc -l` to spot file creep

**Never**:

- Write plan content directly into `CLAUDE.md`
- Leave stale plans with all stages marked Complete
- Place files in a path dictated by a skill if it conflicts with the layout above
- Keep a row in INDEX.md for a file that no longer exists

### Keeping Docs Current

**Before starting work on an existing feature area**, check if it has a design doc in `INDEX.md`. If it does:
- Skim the doc against the current code
- If it still reflects reality → proceed
- If it has drifted → supersede it (follow the Supersede rule above) before writing new code

**After any significant code change**, check:

- [ ] `docs/INDEX.md` — add/update the row for any new or changed doc
- [ ] `docs/superseded.md` — did any existing doc become inaccurate? Supersede it
- [ ] `CLAUDE.md` — does it reflect new patterns, commands, or conventions?
- [ ] `plans/` — mark completed stages, delete file when all done

Out-of-date documentation is worse than no documentation.

---

## Code Quality Gates

**Every commit must**:

- Pass `pnpm test` (100% pass rate)
- Pass `pnpm lint` (no warnings, no errors)
- Use no `any`/`unknown` types

**Before every push**:

- `pnpm build` must pass cleanly

**Never**:

- Use `--no-verify` to bypass hooks
- Disable or skip failing tests
- Commit code with TypeScript errors or lint warnings

---

## When Stuck (After 3 Attempts)

1. Document what failed (exact error, what was tried, why it failed)
2. **Search online** — DO NOT GUESS. Use web search for error messages, Stack Overflow, GitHub issues, official docs.
3. Question the abstraction level — can this be split smaller?
4. Try a different approach (different pattern, remove abstraction, simpler library feature)
