# Development Workflow

## The Four Agents

| Agent | Role | Invoke |
|---|---|---|
| `planner` | Reads the codebase, produces a Sprint Contract plan file | `use the planner agent` |
| `generator` | Implements exactly one Stage from a plan — fresh context per Stage | `use the generator agent with docs/.../plan.md Stage N` |
| `evaluator` | Independently verifies one Stage against the Sprint Contract — never trusts Generator's tests | `use the evaluator agent with docs/.../plan.md Stage N` |
| `design-reviewer` | Checks any UI change against design guidelines and HTML/design artifacts — reports violations only | `use the design-reviewer agent on src/path/to/component` |

**Superpowers integration — what we keep and what we skip:**

Superpowers has its own pipeline: brainstorming → writing-plans → subagent-driven-development. We keep the first step and replace the rest:

| Skill | Status | Why |
|---|---|---|
| `brainstorming` | ✅ Keep | Captures approach decisions and design spec before planning — prevents generator from re-litigating architecture mid-implementation |
| `writing-plans` | ⛔ Skip | Replaced by our `planner` agent — planner reads the design spec and produces a Sprint Contract instead of step-by-step code |
| `subagent-driven-development` | ⛔ Skip | Replaced by our `generator` + `evaluator` loop — independent verification, no circular validation |
| `superpowers:test-driven-development` | ✅ Keep | Governs Red-Green-Refactor inside generator sessions |
| `/simplify` + `react-doctor` | ✅ Keep | The Refactor step after every Green phase |

**The intercept rule:** when brainstorming finishes the design spec and offers to proceed to writing-plans — stop. Invoke our `planner` agent instead, pointing it at the design spec.

---

## Standard Flow for Non-Trivial Features

A feature is non-trivial if it spans more than one file or requires a new user-facing flow.

### 0. Brainstorm (optional — for features where approach is unclear)

Use when the right architecture or approach isn't obvious. Brainstorming explores 2-3 approaches, proposes a design, and saves a design spec to `.superpowers/specs/`.

**Stop when brainstorming offers to invoke writing-plans.** At that point the design spec is ready — proceed to step 1 instead.

### 1. Plan

```
use the planner agent
```

The planner reads the codebase and — if a design spec exists — reads it from `.superpowers/specs/` as additional context. It writes `docs/YYYY-MM-DD/plans/<feature>-plan.md` and adds a row to `docs/INDEX.md` with status `In Progress`.

Do not start implementing before the plan exists.

### 2. Implement — one Stage at a time

```
use the generator agent with docs/YYYY-MM-DD/plans/feature-plan.md Stage 1
```

Each Generator invocation is a **fresh-context subagent**. It reads only its assigned Stage, implements via TDD, commits, and stops. It does not self-evaluate.

When the Generator reports completion, move to the Evaluator — do not proceed to the next Stage first.

### 3. Verify — before moving to the next Stage

```
use the evaluator agent with docs/YYYY-MM-DD/plans/feature-plan.md Stage 1
```

The Evaluator reads the Sprint Contract and independently verifies every criterion. It does not consult the Generator's test files as primary evidence.

- **PASS** → mark the Stage `Complete` in the plan file, proceed to Stage 2
- **FAIL** → hand the gap list back to a new Generator session for that Stage; repeat until PASS

**Bug handling during verification:**

| Bug type | How to handle |
|---|---|
| Current Stage has gaps or broken criteria | Normal FAIL — new Generator session for this Stage with the gap list, re-evaluate after |
| Regression from a previous Stage (test that passed before now fails) | Treat that earlier Stage as incomplete — new Generator session targeting that Stage, re-evaluate that Stage before continuing |
| Bug in code outside any Stage's scope | Treat as a Quick Task — fix directly without planner/generator, then re-run the evaluator to confirm no new regressions before continuing |

In all cases: a failing test is never skipped or deferred. The current Stage does not advance to `Complete` until all tests pass.

### 4. Design check — after any Stage with UI changes

```
use the design-reviewer agent on src/path/to/changed/component
```

Run after the Evaluator PASses a Stage that contains UI work. The design-reviewer checks color tokens, spacing, form patterns, accessibility, and compares against any design documents in `.superpowers/`.

Violations must be fixed before the Stage is considered complete.

### 5. Close the plan

When all Stages are `Complete`:
1. Delete the plan file
2. Delete its row from `docs/INDEX.md`

Plans do not accumulate. A closed plan is deleted, not archived.

---

## Quick Tasks — No Plan Needed

For single-file fixes, trivial bugs, or copy changes: implement directly without invoking the planner. Apply TDD and the Refactor step (`/simplify` + `react-doctor`) as normal.

The test: if the task description fits in one sentence and touches at most two files, no plan is needed.

---

## Document Management

### `docs/` structure

```
docs/
  INDEX.md          ← active Sprint Plans only — check here first
  roadmap.md        ← feature backlog (ideas not yet planned)
  YYYY-MM-DD/
    plans/          ← Sprint Contract plans from the planner agent
```

`docs/` holds only Sprint Contract plans and the two management files. Design specs, brainstorm outputs, and HTML samples go to `.superpowers/` (their default path — do not redirect them).

### Plan lifecycle

| Stage | Action | Who |
|---|---|---|
| **Create** | Planner writes the plan file, adds a row to INDEX.md with status `In Progress` | Planner agent |
| **Stage starts** | Mark the Stage status `In Progress` in the plan file | Generator agent (at session start) |
| **Stage verified** | Mark the Stage status `Complete` in the plan file | Main session, after Evaluator PASS |
| **All stages complete** | Delete the plan file and its INDEX.md row immediately | Main session |

If INDEX.md has more than 3 active rows, plans are not being closed.

### Plan rot — handle immediately, never batch

| Rot type | When to fix |
|---|---|
| Stage status stale (says "In Progress" but code is done) | The moment the Stage completes |
| Implementation diverged from plan | Update the plan **before** changing code |

### Session start

Skim `docs/INDEX.md` against the current code state. Update any stale Stage statuses before doing any other work.

---

## File Naming

All markdown files use lowercase kebab-case:

```
✅  progressive-overload-plan.md
✅  body-composition-plan.md
❌  ProgressiveOverload.md
❌  PLAN.md
```

---

## No Files in Project Root

| File type | Correct location |
|---|---|
| Temp screenshots, debug images, scratch files | `.tmp/` |
| Brainstorm outputs, design specs, HTML samples | `.superpowers/` (default — do not override) |
| Sprint Contract plans | `docs/YYYY-MM-DD/plans/` |
| Claude instruction files | `.claude/instructions/` |
| Agent definitions | `.claude/agents/` |
| v2 frontend source, configs, tests | `frontend/` |
| v1 legacy source | `web/` |

---

## After Any Significant Code Change

- [ ] `docs/INDEX.md` — close completed plans; update in-progress statuses
- [ ] `.claude/instructions/` — does any instruction file need updating?
- [ ] `CLAUDE.md` — does it reflect new commands or critical rules?

---

## When Stuck (After 3 Attempts)

1. Document exactly what failed — error message, what was tried, why it failed
2. Search online — do not guess. Use web search for error messages, Stack Overflow, GitHub issues, official docs
3. Question the abstraction level — can this be split into a smaller, clearer problem?
4. Try a fundamentally different approach — not a variation of the last one
