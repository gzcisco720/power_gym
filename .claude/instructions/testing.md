# Testing Standards

## TDD is Mandatory

This project follows TDD. **Never write implementation code before writing a failing test.**

TDD cadence (Red-Green-Refactor) is governed by the `superpowers:test-driven-development` skill, which takes precedence over these instructions.

Core principles that always apply:
- Tests cover typical cases, edge cases, and error cases
- Run tests after each implementation step to confirm state
- After Green, run `/simplify` before committing (the Refactor step)

---

## Testing Stack by Application

| Application | Unit / Integration | E2E |
|---|---|---|
| `web/` | Jest + React Testing Library | Playwright |
| `mobile/` | Jest + React Native Testing Library | Detox |
| `backend/` | Jest (unit + integration) | — |

---

## `web/` — Testing Rules

### E2E Tests Are Mandatory for Flow and UI Changes

**Jest proves code is correct. Playwright proves the feature works. You need both.**

Jest mocks browser APIs, animations, timers, and real DOM behavior. Jest tests can pass while the real browser experience is completely broken.

**Write or update a Playwright spec before marking any of these done:**

| Change type | Examples |
|---|---|
| New user-facing flow | New page, new multi-step form, new modal sequence |
| Workflow change | Changed submission order, new validation gate, changed API call sequence |
| UX change to interactive components | Button replaced, modal redesigned, animation gating a form |
| Component interaction change | Timer, async state, parent→child callback stability |
| Refactoring that touches how flows work | Even if Jest is green — a mock can hide the breakage |

**What the E2E spec must cover:**
1. **Golden path** — full flow from trigger to success state (redirect, toast, data visible)
2. **At least one error/edge case** that the flow explicitly handles

**Spec location:** `web/e2e/` grouped by role:
```
web/e2e/
  member/
  trainer/
  owner/
  auth.spec.ts
  access-control.spec.ts
```

### Commands
```bash
cd web && pnpm test                                    # All Jest tests
cd web && pnpm test --watch                            # Watch mode
cd web && pnpm test -- --testPathPattern=<path>        # Single file
cd web && pnpm test:e2e                                # Playwright E2E
cd web && pnpm test:coverage                           # Coverage report
```

---

## `mobile/` — Testing Rules

### E2E Tests Are Mandatory for Flow and Screen Changes

The same rule as `web/` applies — Jest proves code is correct, Detox proves the feature works on a real simulator. A flow change is not complete until a Detox spec has run against a real simulator and passed.

**Write or update a Detox spec before marking any of these done:**

| Change type | Examples |
|---|---|
| New user-facing screen | New screen, new multi-step flow, new bottom sheet sequence |
| Navigation change | Changed stack order, new tab, new modal flow |
| UX change to interactive components | Button replaced, input replaced, gesture changed |
| Component interaction change | Async state, loading states, error states |
| Refactoring that touches how flows work | Even if Jest is green |

**What the Detox spec must cover:**
1. **Golden path** — full flow from trigger to success state (navigation, feedback, data visible)
2. **At least one error/edge case** that the flow explicitly handles

**Spec location:** `mobile/e2e/` grouped by role:
```
mobile/e2e/
  member/
  trainer/
  owner/
  auth.spec.ts
```

**CI note:** Detox requires a native build before running. iOS tests require a macOS runner. Set up CI early — don't leave it until the end of a sprint.

### Commands
```bash
cd mobile && pnpm test                                           # All Jest tests
cd mobile && pnpm test -- --testPathPattern=<path>              # Single file
cd mobile && pnpm detox build --configuration <config>          # Build for Detox
cd mobile && pnpm detox test --configuration <config>           # All Detox E2E
cd mobile && pnpm detox test --configuration <config> --testPathPattern=<path>  # Single spec
```

---

## `backend/` — Testing Rules

### Every Endpoint Needs an Integration Test

`backend/` has no E2E layer. Jest integration tests are the final verification gate — they must cover every endpoint.

**Unit tests** cover individual service methods and guards in isolation.

**Integration tests** cover the full request-response cycle per endpoint:
- Correct response shape and status code on success
- Auth guard rejects unauthenticated requests (401)
- Role guard rejects unauthorized roles (403)
- Validation pipe rejects malformed input (400)
- Service errors surface as correct HTTP status codes

**What counts as "done" for a backend feature:**
- Unit tests for every service method
- Integration test for every controller endpoint
- All existing tests still pass (no regressions)

**Spec location:**
```
backend/
  src/
    modules/
      training/
        training.service.spec.ts     ← unit
        training.controller.spec.ts  ← unit
  test/
    training.e2e-spec.ts             ← integration (full request cycle)
```

### Commands
```bash
cd backend && pnpm test                                 # All Jest unit tests
cd backend && pnpm test -- --testPathPattern=<path>    # Single file
cd backend && pnpm test:e2e                            # Integration tests
cd backend && pnpm test:coverage                       # Coverage report
```

---

## The Rule in One Sentence

> A flow change is not complete until a spec — Playwright (`web/`), Detox (`mobile/`), or integration test (`backend/`) — has run against the real stack and passed.
