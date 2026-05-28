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

- Pass `pnpm test` (100% pass rate)
- Pass `pnpm lint` (no warnings, no errors)
- Use no `any`/`unknown` types
- Have gone through `/simplify` (the Refactor step)
- Have a Playwright E2E spec covering the changed flow

**Before every push:**

- `pnpm build` must pass cleanly
- `pnpm test:e2e` must pass for any spec touching changed flows

**Never:**

- Use `--no-verify` to bypass hooks
- Disable or skip failing tests
- Commit code with TypeScript errors or lint warnings
- Claim a flow-level change is "done" based only on Jest passing — Jest mocks the browser

## Code Cleanup with `/simplify`

After any meaningful implementation (new feature, bug fix, refactor), run `/simplify` before committing. It reads the `git diff`, launches three parallel agents, and fixes issues in-place:

| Agent | Checks |
|-------|--------|
| **Reuse** | Duplicated logic, copy-pasted functions, utilities already existing elsewhere |
| **Quality** | WHAT-comments, redundant state, stringly-typed code, unnecessary nesting, hacky patterns |
| **Efficiency** | N+1 queries, sequential DB calls that can be parallel, unbounded data loads, missing memoization |

**When to run:**
- After the TDD Green phase, as the Refactor step
- After any multi-file change before committing
- Periodically on existing modules with `/simplify` + specify a directory when no git diff exists

**When to skip:**
- Trivial one-line fixes with no architectural impact
- Pure test file changes
