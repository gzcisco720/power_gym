# Development Workflow

## Planning Complex Features

For multi-stage work, create `docs/YYYY-MM-DD/plans/IMPLEMENTATION_PLAN.md`:

```markdown
## Stage N: [Name]

**Goal**: [Specific deliverable]
**Success Criteria**: [Testable outcomes — each must be writable as a Playwright expect()]
**Tests**: [List of TDD test cases]
**Status**: [Not Started|In Progress|Complete]
```

Use the `superpowers:writing-plans` skill to generate plans. Use the `planner` subagent for harness-style sessions that need a full Sprint Contract.

## Generated Document Management

> **IMPORTANT — Path override**: These rules take precedence over any skill's default output path. Always use the layout below regardless of what a skill instructs.

### Finding existing documents

**Always check [`docs/INDEX.md`](../../docs/INDEX.md) first.** It is the single source of truth for all generated documents. Every time you create or delete a doc, update the index.

### Directory Layout

```text
docs/
  INDEX.md          # ← Central registry — check here first
  superseded.md     # Permanent audit trail of superseded design docs
  roadmap.md        # Feature backlog (ideas not yet started)
  YYYY-MM-DD/       # One folder per work date
    plans/          # Implementation plans and design specs
```

### File Naming

All generated markdown files use **lowercase kebab-case**:

```text
✅  body-fat-formula-research.md
✅  jwt-auth-implementation-plan.md
❌  BodyFatFormula.md
❌  PLAN.md
```

### Lifecycle Rules

**Create** a new date folder (`docs/YYYY-MM-DD/`) at the start of each distinct work session.

**Update** an existing doc in the same date folder if work continues on the same day.

**Close** an implementation plan by marking all stages `Complete`, then **deleting the file and its INDEX.md row**.

**Keep** design docs as long as they accurately reflect the implementation.

**Supersede** a design doc when it no longer accurately reflects the implementation:
1. Remove its row from `INDEX.md`
2. Append a row to [`docs/superseded.md`](../../docs/superseded.md) with: doc name, original path, date, and reason
3. Delete the file

**INDEX.md hygiene** — keep under 60 lines total. Never keep a row in INDEX.md for a file that no longer exists.

### Keeping Docs Current

**Before starting work on an existing feature area**, check if it has a design doc in `INDEX.md`. If it does:
- Skim the doc against the current code
- If it still reflects reality → proceed
- If it has drifted → supersede it before writing new code

**After any significant code change**, check:

- [ ] `docs/INDEX.md` — add/update the row for any new or changed doc
- [ ] `docs/superseded.md` — did any existing doc become inaccurate? Supersede it
- [ ] `CLAUDE.md` or instruction files — does it reflect new patterns, commands, or conventions?
- [ ] `plans/` — mark completed stages, delete file when all done

## Plan Rot — When to Handle It

Plan rot has two types with different handling:

| Type | Trigger to handle |
|---|---|
| Sprint status rot (plan says "In Progress" but code is done) | Immediately when the sprint completes |
| Design drift (implementation took a different approach) | The moment you consciously diverge — update plan before changing code |

**Never batch rot cleanup.** The cost of a stale plan is immediate: the next session reads wrong handoff information.

Two session triggers:
1. When you consciously diverge from the plan → update plan first, then code
2. At the start of each new session → skim plan against code, supersede if drifted

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
| Implementation plans and design specs | `docs/YYYY-MM-DD/plans/` |
| Claude instruction files | `.claude/instructions/` |
| Agent definitions | `.claude/agents/` |
