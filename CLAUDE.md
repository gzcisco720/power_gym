# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🔴 CRITICAL: STRICT TDD ENFORCEMENT 🔴

**This project follows MANDATORY Test-Driven Development (TDD).**

**Golden Rule**: NEVER write implementation code before writing a failing test.

**Red-Green-Refactor Cycle**:

1. 🔴 **RED**: Write ONE failing test → STOP and wait for user confirmation
2. 🟢 **GREEN**: Write minimal implementation → STOP and wait for "继续"
3. 🔵 **REFACTOR**: Improve code without changing behavior → Wait for "重构"

---

## Project Overview

POWER_GYM is a gym management web application built with Next.js. It supports three user roles (owner, trainer, member) and provides workout plan management, nutrition plan management, body composition testing, and performance tracking.

### Tech Stack

- **Framework**: Next.js (App Router)
- **UI**: Shadcn/ui + TailwindCSS
- **Database**: MongoDB (via Mongoose or MongoDB driver)
- **Auth**: JWT (access token + refresh token)
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

### 1. Authentication

- JWT access + refresh token flow
- Role-based middleware on all API routes
- Tokens stored in httpOnly cookies

### 2. Training Plans

- Multi-day programs (e.g., Day 1 Push, Day 2 Pull)
- Each day contains exercises with prescribed sets × reps
- Members log actual weight/reps per set; logged sets are checked off
- PBs tracked per exercise; performance history queryable

### 3. Nutrition Plans

- Named diet plans with daily macro targets (kcal, protein, carbs, fat)
- Day types supported (e.g., high day, low day)
- Meals broken down into food items with per-item macros
- Donut chart visualization for daily macro progress

### 4. Body Composition Testing

- Skinfold protocols: **3-site**, **7-site**, **9-site**, and **other** (manual BF%)
- Measurement sites: tricep, chest, sub-scap, abdominal, suprailiac, thigh, mid-axillary, bicep, lumbar
- Formulas must be sourced from published literature (Jackson-Pollock and variants)
- Tracks current weight + BF% vs goal; displays lean mass, fat mass, recomposition analysis
- History chart showing changes over time

### 5. Performance Tracking (PBs)

- 1-rep max estimation table per exercise (weight × reps → estimated 1RM)
- Exercise history per member
- First-set detection: prompts for baseline when no prior data exists

---

## Architecture

### Directory Structure (App Router)

```text
src/
  app/
    (auth)/           # Login, register pages (unauthenticated)
    (dashboard)/      # Protected routes, layout with role guard
      owner/          # Owner-only pages
      trainer/        # Trainer-only pages
      member/         # Member view pages
    api/              # Route handlers (Next.js API routes)
      auth/
      users/
      training-plans/
      nutrition-plans/
      body-tests/
  components/
    ui/               # Shadcn primitives (do not modify)
    shared/           # Shared composite components
    training/
    nutrition/
    body-test/
  lib/
    db/               # MongoDB connection singleton
    auth/             # JWT helpers, middleware
    repositories/     # Data access interfaces + MongoDB implementations
    utils/
  types/              # Shared TypeScript interfaces/enums
  hooks/              # Custom React hooks
__tests__/            # Jest unit/integration tests (mirror src/ structure)
e2e/                  # Playwright tests
```

### Key Patterns

- **Repository pattern**: Define interfaces (e.g., `ITrainingPlanRepository`) in `lib/repositories/`, implement with MongoDB. Enables mocking in tests.
- **Server Actions vs Route Handlers**: Prefer Next.js Server Actions for form mutations; use Route Handlers for REST-style API calls consumed by client components.
- **Role guard**: Middleware checks JWT role and redirects unauthorized access before rendering.
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

## TDD Workflow (MANDATORY)

**Golden Rule**: NEVER write implementation code before writing a failing test.

### Red-Green-Refactor Cycle

1. **RED** — Write ONE small failing test. Test must be runnable with clear assertions. **STOP and wait for user confirmation.**
2. **GREEN** — Write ONLY enough code to make the test pass. No extras. **STOP and wait for "继续".**
3. **REFACTOR** — Improve without changing behavior; all tests stay green. **STOP and wait for "重构".**

### TDD Rules

**ABSOLUTELY FORBIDDEN**:

- Writing implementation before tests
- Writing multiple tests at once
- Skipping any Red-Green-Refactor step
- Proceeding without user confirmation

**MANDATORY**:

- Every production line driven by a failing test
- Tests cover typical cases, edge cases, and error cases
- Run tests after each step to confirm Red/Green state

### Example Flow

```text
Assistant: [Writes failing test for body fat calculation]
Assistant: "Test written (RED). Type '继续' when ready for implementation."
User: "继续"
Assistant: [Writes minimal Jackson-Pollock formula implementation]
Assistant: "Implementation complete (GREEN). Type '重构' to refactor, or describe next test."
```

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

Place all generated docs under `docs/YYYY-MM-DD/` (plans in `plans/`, API docs in `api-usage/`).

---

## Generated Document Management

### Directory Layout

```text
docs/
  YYYY-MM-DD/               # One folder per work date
    plans/                  # Implementation plans (multi-stage feature work)
    api-usage/              # How to call internal/external APIs
    config/                 # Configuration guides, env var references
    research/               # Literature lookup, formula sources, third-party docs
    decisions/              # Architecture decision records (ADRs)
```

Root-level files that never move: `CLAUDE.md`, `README.md`.

### File Naming

All generated markdown files use **lowercase kebab-case**:

```text
✅  body-fat-formula-research.md
✅  jwt-auth-implementation-plan.md
❌  BodyFatFormula.md
❌  PLAN.md
```

### Document Types & Where They Go

| Document type          | Folder       | When to create                                      |
| ---------------------- | ------------ | --------------------------------------------------- |
| Implementation plan    | `plans/`     | Before starting any multi-stage feature             |
| API usage guide        | `api-usage/` | When integrating an external or internal API        |
| Config / env reference | `config/`    | When new env vars or infrastructure config is added |
| Research / formulas    | `research/`  | When sourcing literature or scientific formulas     |
| Architecture decision  | `decisions/` | When making a non-obvious tech or design choice     |

### Lifecycle Rules

**Create** a new date folder (`docs/YYYY-MM-DD/`) at the start of each distinct work session.

**Update** an existing doc in the same date folder if work continues on the same day.

**Close** an implementation plan by marking all stages `Complete`, then deleting the file — do not leave completed plans around.

**Never**:

- Write plan content directly into `CLAUDE.md`
- Mix usage docs and config docs in the same folder
- Leave stale plans with all stages marked Complete

### Keeping Docs Current

After any significant code change, check:

- [ ] `CLAUDE.md` — does it reflect new patterns, commands, or conventions?
- [ ] `plans/IMPLEMENTATION_PLAN.md` — mark completed stages, update status
- [ ] `api-usage/` — update if endpoint signatures changed
- [ ] `decisions/` — record why a non-obvious choice was made

Out-of-date documentation is worse than no documentation.

---

## Code Quality Gates

**Every commit must**:

- Have tests written BEFORE implementation
- Pass `pnpm test` (100% pass rate)
- Pass `pnpm lint` (no warnings, no errors)
- Compile via `pnpm build`
- Use no `any`/`unknown` types

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
