# Testing Standards

## TDD is Mandatory

This project follows TDD. **Never write implementation code before writing a failing test.**

TDD cadence (Red-Green-Refactor) is governed by the `superpowers:test-driven-development` skill, which takes precedence over these instructions.

Core principles that always apply:
- Tests cover typical cases, edge cases, and error cases
- Run tests after each implementation step to confirm state
- Unit/integration tests via Jest; E2E coverage via Playwright
- After Green, run `/simplify` before committing (the Refactor step)

## E2E Tests Are Mandatory for Flow and UI Changes

**Jest proves code is correct. Playwright proves the feature works. You need both.**

Jest mocks browser APIs, animations, timers, and real DOM behavior. Jest tests can pass while the real browser experience is completely broken — exactly what happened with the workout-logging animation timer being reset every second by a parent re-render, which no Jest test could ever catch.

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

`e2e/` is grouped by role and feature:

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

## Commands

```bash
cd web && pnpm test                                        # All Jest tests
cd web && pnpm test --watch                                # Watch mode
cd web && pnpm test -- --testPathPattern=<path>            # Single file
cd web && pnpm test:e2e                                    # Playwright E2E
cd web && pnpm test:coverage                               # Coverage report
```
