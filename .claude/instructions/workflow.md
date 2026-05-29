# Development Workflow

## Planning Complex Features

For multi-stage work, create `docs/YYYY-MM-DD/plans/IMPLEMENTATION_PLAN.md`:

```markdown
## Stage N: [Name]

**Goal**: [Specific deliverable]

**Sprint Contract**:

*Unit tests (mandatory — one per new/changed service method):*
- [ ] [Jest: `ServiceName > method > scenario` — what it asserts]

*Integration / E2E (mandatory — one per endpoint or user flow):*
- [ ] [Supertest/Playwright: exact action and expected outcome]

**TDD sequence** (no exceptions):
1. Write the failing unit test → Red
2. Implement minimal code → Green
3. Run `/simplify` → Refactor
4. Write/update integration or E2E test → pass against real stack

**Status**: [Not Started|In Progress|Complete]
```

Use the `superpowers:writing-plans` skill to generate plans. Use the `planner` subagent for harness-style sessions that need a full Sprint Contract.

## Document Management

> **IMPORTANT — Path override**: These rules take precedence over any skill's default output path. Always use the layout below regardless of what a skill instructs.

### `docs/` is harness-only

`docs/` is the harness working directory. It holds only Sprint Contract plans and the three management files. Historical design specs, mockups, and research live in `.archive/` — outside the harness workflow.

```text
docs/
  INDEX.md          # Active Sprint Plans only — check here first
  superseded.md     # Audit trail of closed plans
  roadmap.md        # Feature backlog (ideas not yet planned)
  YYYY-MM-DD/
    plans/          # Sprint Contract plans from the planner agent

.archive/           # Historical artifacts — not part of harness workflow
  YYYY-MM-DD/       # Preserves original date structure
```

### Sprint Plan lifecycle

Sprint plans are produced by the planner agent and consumed by Generator + Evaluator. They have a strict lifecycle — they do not accumulate.

| Stage | Action |
|---|---|
| **Create** | Planner agent writes `docs/YYYY-MM-DD/plans/<feature>-plan.md`. Add a row to INDEX.md with status `In Progress`. |
| **Active** | Generator implements stage by stage. Evaluator checks each stage against the Sprint Contract. |
| **Complete** | All stages marked `Complete` → **delete the file and its INDEX.md row immediately.** |

If INDEX.md has more than 3 active plans, something is wrong — plans are not being closed.

### Plan rot — when to handle it

| Type | Trigger |
|---|---|
| Sprint status rot (stage says "In Progress" but code is done) | Immediately when the stage completes |
| Implementation diverged from plan | The moment you consciously diverge — update plan **before** changing code |

**Never batch rot cleanup.** A stale plan is wrong handoff information for the next session.

Two session triggers:

1. Diverging from plan → update plan first, then code
2. New session start → skim active plans against code; update status if stale

### File naming

All markdown files use **lowercase kebab-case**:

```text
✅  progressive-overload-plan.md
✅  web-push-plan.md
❌  ProgressiveOverload.md
❌  PLAN.md
```

### After any significant code change

- [ ] `docs/INDEX.md` — close completed plans (delete file + row); update status of in-progress ones
- [ ] `.claude/instructions/` — does any instruction file need updating for new patterns or conventions?
- [ ] `CLAUDE.md` — does it reflect new commands or critical rules?

## When Stuck (After 3 Attempts)

1. Document what failed (exact error, what was tried, why it failed)
2. **Search online** — DO NOT GUESS. Use web search for error messages, Stack Overflow, GitHub issues, official docs.
3. Question the abstraction level — can this be split smaller?
4. Try a different approach (different pattern, remove abstraction, simpler library feature)

## No Files in Project Root

Before writing any file, ask: "does this belong in the root?" — the answer is almost always no.

| File type | Correct location |
|---|---|
| Temporary screenshots, debug images, scratch files | `.tmp/` |
| Superpowers / brainstorm tool outputs | `.superpowers/` |
| Sprint Contract implementation plans | `docs/YYYY-MM-DD/plans/` |
| Historical design docs, mockups, research | `.archive/YYYY-MM-DD/` |
| Claude instruction files | `.claude/instructions/` |
| Agent definitions | `.claude/agents/` |
| Web app source, configs, tests | `web/` |
