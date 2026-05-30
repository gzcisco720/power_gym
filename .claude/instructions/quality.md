# Code Quality Standards

## TypeScript Standards

**Strictly forbidden across all applications (`web/`, `mobile/`, `backend/`):**
- `any` — no exceptions
- `unknown` — no exceptions

Always define explicit interfaces for all data shapes. Use `Partial`, `Pick`, `Omit`, type unions/intersections instead of loose types.

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

## Code Quality Gates

### `web/`

**Every commit must:**
- Pass `cd web && pnpm test` (100% pass rate)
- Pass `cd web && pnpm lint` (no warnings, no errors)
- Use no `any`/`unknown` types
- Have gone through `/simplify` + `cd web && npx react-doctor@latest` (the Refactor step)
- Have a Playwright E2E spec covering the changed flow

**Before every push:**
- `cd web && pnpm build` must pass cleanly
- `cd web && pnpm test:e2e` must pass for any spec touching changed flows

### `mobile/`

**Every commit must:**
- Pass `cd mobile && pnpm test` (100% pass rate)
- Pass `cd mobile && pnpm lint` (no warnings, no errors)
- Use no `any`/`unknown` types
- Have gone through `/simplify` (the Refactor step — `react-doctor` does not apply to React Native)
- Have a Detox E2E spec covering any changed flow

**Before every push:**
- `cd mobile && pnpm detox build --configuration <config>` must pass
- `cd mobile && pnpm detox test --configuration <config>` must pass for any spec touching changed flows

### `backend/`

**Every commit must:**
- Pass `cd backend && pnpm test` (100% pass rate)
- Pass `cd backend && pnpm lint` (no warnings, no errors)
- Use no `any`/`unknown` types
- Have gone through `/simplify` (the Refactor step)
- Have an integration test covering every new or changed endpoint

**Before every push:**
- `cd backend && pnpm build` must pass cleanly
- `cd backend && pnpm test:e2e` (integration tests) must pass

---

## Never

- Use `--no-verify` to bypass hooks
- Disable or skip failing tests
- Commit code with TypeScript errors or lint warnings
- Claim a flow-level change is "done" based only on unit tests — they mock the real environment
- Skip a failing test because "it's not from this stage" — every test failure must be fixed before committing, regardless of which feature or stage caused it

---

## Code Cleanup — Refactor Step

After any meaningful implementation (new feature, bug fix, refactor), run the appropriate tools before committing.

### `/simplify`

Applies to all applications. Reads the `git diff`, launches three parallel agents, and fixes issues in-place:

| Agent | Checks |
|-------|--------|
| **Reuse** | Duplicated logic, copy-pasted functions, utilities already existing elsewhere |
| **Quality** | WHAT-comments, redundant state, stringly-typed code, unnecessary nesting, hacky patterns |
| **Efficiency** | N+1 queries, sequential API calls that can be parallel, unbounded data loads, missing memoization |

### `react-doctor` (`web/` only)

```bash
cd web && npx react-doctor@latest
```

Scans React-specific issues that `/simplify` won't catch: state & effects misuse, performance problems, architectural violations, security vulnerabilities, accessibility gaps.

**Fix all findings before committing.** Does not apply to `mobile/` or `backend/`.

### When to run

| Step | `web/` | `mobile/` | `backend/` |
|---|---|---|---|
| After TDD Green phase | `/simplify` + `react-doctor` | `/simplify` | `/simplify` |
| After any multi-file change | `/simplify` + `react-doctor` | `/simplify` | `/simplify` |

### When to skip

- Trivial one-line fixes with no architectural impact
- Pure test file changes
