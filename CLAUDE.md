# CLAUDE.md

Guidance for Claude Code working in this repository. Keep this file short — detailed instructions live in `.claude/instructions/`.

---

## 🔴 CRITICAL RULES

1. **No files in project root** — temp files → `.tmp/`, brainstorm outputs → `.superpowers/`, Sprint Contract plans → `docs/YYYY-MM-DD/plans/`, Claude instructions → `.claude/instructions/`, agents → `.claude/agents/`, web app → `web/`, mobile app → `mobile/`, backend → `backend/`
2. **One fix at a time** — if a fix doesn't work, revert it immediately before trying anything else. Never stack changes on an unverified fix.
3. **TDD** — never write implementation code before a failing test. Governed by the `superpowers:test-driven-development` skill.
4. **E2E tests mandatory** — every flow or UI change needs an E2E spec: Playwright (`web/`), Detox (`mobile/`). See `.claude/instructions/testing.md`.
5. **Zero placeholders, ever** — no `coming soon`, `TODO`, `not implemented`, stub UI, or any text/component that substitutes for real functionality. If a feature is in scope for a stage, implement it fully or raise a blocker. The only exception is a route/screen that belongs to a *future* stage — in that case don't register it at all.

---

## Language

The UI language is **English**. All user-facing strings must be in English.

---

## Quick Commands

```bash
# web/ — Next.js fullstack
cd web && pnpm dev          # Dev server (localhost:3000)
cd web && pnpm test         # Jest unit/integration tests
cd web && pnpm test:e2e     # Playwright E2E tests
cd web && pnpm lint         # ESLint
cd web && pnpm build        # Production build

# mobile/ — React Native + Expo
cd mobile && pnpm start     # Expo dev server
cd mobile && pnpm test      # Jest unit tests
cd mobile && pnpm detox test --configuration <config>  # Detox E2E

# backend/ — NestJS API
cd backend && pnpm start:dev   # Dev server
cd backend && pnpm test        # Jest unit/integration tests
cd backend && pnpm test:e2e    # Integration tests
cd backend && pnpm build       # Production build
```

---

## Project Quick Reference

- **web/**: Next.js (App Router) · Shadcn/ui + TailwindCSS · MongoDB + Mongoose · NextAuth v5 · Jest + Playwright
- **mobile/**: React Native + Expo · NativeWind + React Native Reusables · Zustand · JWT auth · Jest + Detox
- **backend/**: NestJS · MongoDB + Mongoose · JWT access + refresh token · Jest
- **Roles**: Owner > Trainer > Member (ownership hierarchy)
- **Testing**: unit + E2E required for every flow change in every app

---

## Detailed Instructions

@.claude/instructions/architecture.md
@.claude/instructions/testing.md
@.claude/instructions/design.md
@.claude/instructions/quality.md
@.claude/instructions/workflow.md

---

## Specialist Agents

Four specialist agents are available for non-trivial feature development:

| Agent | When to use | Invoke |
|---|---|---|
| `planner` | Before any non-trivial feature — produces Sprint Contract plan | `use the planner agent` |
| `generator` | To implement exactly one Stage from a Sprint Contract plan | `use the generator agent with docs/path/to/plan.md Stage N` |
| `evaluator` | After Generator completes a stage — checks Sprint Contract criteria | `use the evaluator agent with docs/path/to/plan.md Stage N` |
| `design-reviewer` | After any UI change (`web/` or `mobile/`) — checks against design guidelines | `use the design-reviewer agent on path/to/component` |
