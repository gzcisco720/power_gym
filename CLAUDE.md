# CLAUDE.md

Guidance for Claude Code working in this repository. Keep this file short — detailed instructions live in `.claude/instructions/`.

---

## 🔴 CRITICAL RULES

1. **No files in project root** — temp files → `.tmp/`, brainstorm outputs → `.superpowers/`, plans → `docs/YYYY-MM-DD/plans/`, Claude instructions → `.claude/instructions/`, agents → `.claude/agents/`
2. **One fix at a time** — if a fix doesn't work, revert it immediately before trying anything else. Never stack changes on an unverified fix.
3. **TDD** — never write implementation code before a failing test. Governed by the `superpowers:test-driven-development` skill.
4. **E2E tests mandatory** — every flow or UI change needs a Playwright spec that passes against a real browser. See `.claude/instructions/testing.md`.

---

## Language

The UI language is **English**. All user-facing strings must be in English.

---

## Quick Commands

```bash
pnpm dev              # Dev server (localhost:3000)
pnpm test             # Jest unit/integration tests
pnpm test:e2e         # Playwright E2E tests
pnpm lint             # ESLint
pnpm build            # Production build
```

---

## Project Quick Reference

- **Stack**: Next.js App Router · MongoDB · Auth.js · Shadcn/ui · TypeScript strict · pnpm
- **Roles**: Owner > Trainer > Member (ownership hierarchy)
- **Testing**: Jest (unit/integration) + Playwright (E2E) — both required for every flow change

---

## Detailed Instructions

@.claude/instructions/architecture.md
@.claude/instructions/testing.md
@.claude/instructions/design.md
@.claude/instructions/quality.md
@.claude/instructions/workflow.md

---

## Harness Engineering

Three specialist subagents are available for long-running feature development:

| Agent | When to use | Invoke |
|---|---|---|
| `planner` | Before any non-trivial feature — produces Sprint Contract plan | `use the planner agent` |
| `evaluator` | After Generator completes a stage — checks Sprint Contract criteria | `use the evaluator agent with docs/path/to/plan.md` |
| `design-reviewer` | After any UI change — checks against design guidelines | `use the design-reviewer agent on src/path/to/component` |
