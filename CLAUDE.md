# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🔴 CRITICAL: NO FILES IN PROJECT ROOT 🔴

**Before writing any file, ask: "does this belong in the root?" — the answer is almost always no.**

| File type | Correct location |
|---|---|
| Temporary screenshots, debug images, scratch files | `.tmp/` |
| Superpowers / brainstorm tool outputs | `.superpowers/` |
| Implementation plans and design specs | `docs/YYYY-MM-DD/plans/` |

This applies to Playwright screenshots, comparison images, and any intermediate output. The project root is for permanent project files only (`CLAUDE.md`, `README.md`, `package.json`, etc.).

---

## 🔴 CRITICAL: ONE-FIX-AT-A-TIME RULE 🔴

**If a fix doesn't work, that proves the fix is wrong — immediately revert it, re-analyze, then try the next approach. Never stack more changes on top of an unverified fix.**

---

## 🔴 CRITICAL: TEST-DRIVEN DEVELOPMENT 🔴

**This project follows TDD. Never write implementation code before writing a failing test.**

TDD mechanics (Red-Green-Refactor cadence, stop points) are governed by the **`superpowers:test-driven-development` skill**, which takes precedence over any TDD instructions below.

---

## 🔴 CRITICAL: E2E TESTS ARE MANDATORY FOR FLOW AND UI CHANGES 🔴

**Jest proves code is correct. Playwright proves the feature works. You need both.**

Jest mocks browser APIs, animations, timers, and real DOM behavior. This means Jest tests can pass while the real browser experience is completely broken — exactly what happened with the workout-logging animation timer being reset every second by a parent re-render, which no Jest test could ever catch.

### When E2E is required

Write or update a Playwright spec **before marking any of these done**:

| Change type | Examples |
|---|---|
| New user-facing flow | New page, new multi-step form, new modal sequence |
| Workflow change | Changed submission order, new validation gate, changed API call sequence |
| UX change to interactive components | Button replaced, modal redesigned, animation gating a form |
| Component interaction change | Timer, async state, parent→child callback stability |
| Refactoring that touches how flows work | Even if Jest is green — a mock can hide the breakage |

**If you changed how the user does something, there must be a Playwright spec that does it.**

### What the E2E spec must cover

1. **Golden path** — the full flow from trigger to success state (redirect, toast, data visible)
2. **At least one error/edge case** that the flow explicitly handles

### Where specs live

`e2e/` is grouped by role and feature. Match the appropriate folder:

```
e2e/
  member/              # member plan sessions, nutrition, body tests
  self-tracking/       # owner/trainer my-training flows
  trainer/             # trainer managing members
  auth.spec.ts
  access-control.spec.ts
```

Reference existing specs before writing new ones — `e2e/self-tracking/owner-session-lifecycle.spec.ts` and `e2e/member/session-lifecycle.spec.ts` are the canonical patterns for workout logging flows.

### The rule in one sentence

> A flow change is not complete until a Playwright spec has run the changed flow against a real browser and passed.

---

## Language

**The UI language is English.** All user-facing strings — navigation labels, page titles, headings, placeholder text, button labels, notifications, and empty states — must be written in English. Do not use any other language in the UI.

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

## Design Guidelines

Every rule in this section was learned the hard way from a real bug or rejected design — read it before touching any UI.

### Color tokens — the rule

The theme is near-black (`bg-background` ≈ oklch 0.04). Picking the wrong "muted" token makes text invisible.

**For visible secondary text, always use `text-foreground/65`.** Never use `text-muted-foreground`, `text-[#555]/[#666]/[#777]/[#888]`, or any other dim hex.

**Primary accent** — `bg-primary` / `text-primary-light`

The primary accent colour is **indigo** (`oklch(0.585 0.233 277.1)` / `#6366f1`). Use `bg-primary` for primary buttons, active states, and icon container gradients. Use `text-primary-light` (`#a5b4fc`) for glow text and badge labels. **Emerald is now the success/completion colour only** — do not use it as the main brand colour.

| Use | For | Why not the alternative |
|---|---|---|
| `text-foreground` | Primary text, names, values | — |
| `text-foreground/80` | Form labels | Slightly de-emphasized but still strong |
| `text-foreground/65` | Helper text, section labels, unit suffixes ("kcal", "/100g"), brand chains, "(optional)", subtitles, Cancel buttons, dialog body, chip metadata | `text-muted-foreground` resolves to oklch 0.38 ≈ #616161 — fails WCAG AA on this background |
| `text-destructive` | Required `*`, destructive button hover | — |
| `bg-card` + `ring-1 ring-foreground/10` | Card surfaces | `bg-[#0c0c0c] border-[#141414]` is the same in pixels but loses theme switching |
| `bg-muted` | Chip backgrounds, hover states | — |

### Animation tokens

All Framer Motion config lives in `src/lib/animations/variants.ts`. Import from there — never define inline spring configs.

| Variant | Use |
|---|---|
| `variants.fadeSlideUp` | Page-level content entry |
| `variants.staggerContainer` + `variants.staggerItem` | List/grid entries |
| `variants.scaleIn` | Badges, dialogs, toasts |
| `springs.bouncy` | Stat numbers, checkmarks |
| `springs.snappy` | Button press feedback |

Page transitions are handled automatically by `PageTransition` in the dashboard layout.

**Macro palette** — fixed across the app: Protein **emerald**, Carbs **amber**, Fat **pink**, kcal **neutral white**. Use the `<MacroPill>` component (`src/components/nutrition/macro-pill.tsx`).

**Never hardcode hex colors.** Migrate any `text-[#xxx]` / `bg-[#xxx]` / `border-[#xxx]` you encounter.

### Spacing & density

- **Cards must be information-dense.** Never a card that's mostly whitespace with one or two pieces of text.
- **Use horizontal space.** Default to `flex items-center justify-between` — name on the left, secondary info (macros, dates, counts) pushed right with `ml-auto` or `shrink-0`. Stacking everything vertically wastes the right half of the screen.
- **Single row preferred; second row only when content demands it.** If servings/tags exist, put them on a `mt-1.5` second row. If they don't, the card is one line.
- **Compact list-card padding**: `px-3 py-2`. Title `text-sm` (14px). Macros `text-xs` (12px). Chips `text-[10px]`.
- **Section labels**: 11px uppercase tracking-wider (`text-[11px] uppercase tracking-wider text-foreground/65 font-semibold`). Body helper text 12px (`text-xs`). Don't go below 12px for prose.
- **Lists use `space-y-1.5` to `space-y-2`**, not `space-y-4`. Tight beats airy on dense pages.

### Form patterns

- **No native `confirm()` / `alert()`.** Use the shadcn `<Dialog>` for confirmations, with explicit `Cancel` + `Delete`/`Discard` buttons.
- **Sticky bottom action bar on full-page forms.** Pattern: `sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60`. Save button never below the fold.
- **Dirty detection.** Snapshot initial state with `useMemo(() => JSON.stringify(initial), [initial])`. Disable Save when not dirty in edit mode, and intercept Cancel with a "Discard changes?" dialog when dirty. Add a `beforeunload` guard.
- **Numeric inputs** use `type="text" inputMode="decimal" pattern="[0-9]*\.?[0-9]*"` — `type="number"` lets the scroll wheel silently change values.
- **Required vs optional**: required gets a red `*` (`text-destructive`); optional gets a `(optional)` hint in `text-foreground/65`.
- **Optional / advanced fields collapse by default.** Long forms with 10+ fields scare new users. Auto-expand only if there are pre-filled values (edit mode).
- **Field order = importance.** Required core → required structural (e.g. servings) → optional micros. Don't bury required fields under optional ones.
- **Per-100g / per-unit ambiguity always needs a one-line helper text** under the section header.

### List patterns

- **Whole-card `<Link>` for the primary action**, with corner / hover-revealed icon button for destructive actions (delete). Don't nest `<a>` inside `<a>` — put the destructive button as an absolute-positioned sibling.
- **Hover affordance must be visible.** `ring-foreground/10` → `ring-foreground/25` is enough. `border-[#141414]` → `border-[#2a2a2a]` is invisible.
- **Loading state = `<Skeleton>` rows matching the final card shape**, not a centered "Loading…" string.
- **Search inputs**: left search icon + right clear button (`X`) when value present + right spinner when in-flight, mutually exclusive on the right.
- **Toast feedback** (`sonner`) for delete success / save success / network error.

### Component pitfalls

- **shadcn `<Card>` defaults to `flex flex-col gap-4 py-4`.** Adding `className="flex items-start justify-between"` does **not** override `flex-col` — `tailwind-merge` keeps it. Result: children stack vertically with empty space pushed between them. If you need horizontal layout, use a plain `<div>` wrapper or render `<div>` directly with the surface classes (`rounded-xl bg-card ring-1 ring-foreground/10`).
- **Don't override `<Input>` / `<Card>` with hardcoded hex.** The defaults already use theme tokens. Custom `INPUT_CLASS = "bg-[#0c0c0c] border-[#222]"` strings are pure tech debt.
- **Forms in Dialogs/Sheets only — never mix form + list on the same page.** Dedicated full-page forms are OK only for genuinely complex multi-section forms (food, nutrition template, training plan).

### Accessibility minimums

- WCAG AA contrast ≥ 4.5:1 for body text (`text-foreground/65` passes; `text-muted-foreground` does not).
- Every icon-only button needs `aria-label`.
- Every collapse toggle needs `aria-expanded`.
- Focus rings: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40` (or `ring-destructive/40` on destructive buttons).
- Form fields: `<Label htmlFor=...>` paired with `id` on the input; `<input aria-label>` only when no visible label exists.

### Reference implementations

When in doubt, copy the pattern from:

- **List cards**: `src/app/(dashboard)/trainer/foods/_components/foods-list-client.tsx`
- **Form with sticky bar + dirty detection + collapse**: `src/components/nutrition/food-form.tsx`
- **Inline meal/item rows**: `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx`
- **Macro pills**: `src/components/nutrition/macro-pill.tsx`

---

## TDD Workflow

TDD cadence is handled by the `superpowers:test-driven-development` skill. Core principles that always apply regardless of skill:

- Tests cover typical cases, edge cases, and error cases
- Run tests after each implementation step to confirm state
- Unit/integration tests via Jest; E2E coverage via Playwright

The **Refactor** step of Red-Green-Refactor is implemented with `/simplify` — run it after tests go green and before committing.

---

## Code Cleanup with `/simplify`

After any meaningful implementation (new feature, bug fix, refactor), run `/simplify` before committing. It reads the `git diff`, launches three parallel agents, and fixes issues in-place:

| Agent | Checks |
|-------|--------|
| **Reuse** | Duplicated logic, copy-pasted functions, utilities already existing elsewhere |
| **Quality** | WHAT-comments, redundant state, stringly-typed code, unnecessary nesting, hacky patterns |
| **Efficiency** | N+1 queries, sequential DB calls that can be parallel, unbounded data loads, missing memoization |

**When to run**:
- After the TDD Green phase, as the Refactor step
- After any multi-file change before committing
- Periodically on existing modules with `/simplify` + specify a directory when no git diff exists

**When to skip**:
- Trivial one-line fixes with no architectural impact
- Pure test file changes

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
- Have gone through `/simplify` (the Refactor step)
- Have a Playwright E2E spec covering the changed flow (see 🔴 CRITICAL rule above)

**Before every push**:

- `pnpm build` must pass cleanly
- `pnpm test:e2e` must pass for any spec touching changed flows

**Never**:

- Use `--no-verify` to bypass hooks
- Disable or skip failing tests
- Commit code with TypeScript errors or lint warnings
- Claim a flow-level change is "done" based only on Jest passing — Jest mocks the browser

---

## When Stuck (After 3 Attempts)

1. Document what failed (exact error, what was tried, why it failed)
2. **Search online** — DO NOT GUESS. Use web search for error messages, Stack Overflow, GitHub issues, official docs.
3. Question the abstraction level — can this be split smaller?
4. Try a different approach (different pattern, remove abstraction, simpler library feature)
