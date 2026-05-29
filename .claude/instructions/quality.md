# Code Quality Standards

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

## Code Quality Gates

**Every commit must:**

- Pass `cd frontend && pnpm test` (100% pass rate)
- Pass `cd frontend && pnpm lint` (no warnings, no errors)
- Use no `any`/`unknown` types
- Have gone through `/simplify` + `cd frontend && npx react-doctor@latest` (the Refactor step)
- Have a Playwright E2E spec covering the changed flow

**Before every push:**

- `cd frontend && pnpm build` must pass cleanly
- `cd frontend && pnpm test:e2e` must pass for any spec touching changed flows

**Never:**

- Use `--no-verify` to bypass hooks
- Disable or skip failing tests
- Commit code with TypeScript errors or lint warnings
- Claim a flow-level change is "done" based only on unit tests passing — Vitest/Jest mock the browser
- Skip a failing test because "it's not from this stage" — every test failure must be fixed before committing, regardless of which feature or stage caused it

## Code Cleanup — Refactor Step

After any meaningful implementation (new feature, bug fix, refactor), run both tools before committing:

### `/simplify`

Reads the `git diff`, launches three parallel agents, and fixes issues in-place:

| Agent | Checks |
|-------|--------|
| **Reuse** | Duplicated logic, copy-pasted functions, utilities already existing elsewhere |
| **Quality** | WHAT-comments, redundant state, stringly-typed code, unnecessary nesting, hacky patterns |
| **Efficiency** | N+1 queries, sequential API calls that can be parallel, unbounded data loads, missing memoization |

### `react-doctor`

```bash
cd frontend && npx react-doctor@latest
```

Scans React-specific issues that `/simplify` won't catch: state & effects misuse, performance problems, architectural violations, security vulnerabilities, accessibility gaps.

**Fix all findings before committing.** Do not dismiss a react-doctor finding because it is "not from this stage."

### When to run both

- After the TDD Green phase, as the Refactor step
- After any multi-file change before committing

### When to skip

- Trivial one-line fixes with no architectural impact
- Pure test file changes
