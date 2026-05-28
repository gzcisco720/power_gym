# Workspace Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all Next.js web app files from the project root into `web/`, making the root a clean monorepo container for three independent apps: `web/`, `landing/`, `backend/`.

**Architecture:** Use `git mv` for all git-tracked files to preserve history. Gitignored files (`.env.local`, `.env.e2e`) are moved with plain `mv`. The root `.gitignore` is trimmed to monorepo-level entries; a new `web/.gitignore` takes all web-specific entries. Harness files (`.claude/`, `docs/`) stay at root unchanged.

**Tech Stack:** git mv, pnpm, bash

---

## File Map

**Moved to `web/` (git mv):**
`src/` `__tests__/` `e2e/` `public/` `context/` `scripts/` `package.json` `pnpm-workspace.yaml` `next.config.ts` `jest.config.ts` `jest.environment.ts` `jest.polyfills.ts` `jest.setup.ts` `playwright.config.ts` `tsconfig.json` `tsconfig.scripts.json` `components.json` `postcss.config.mjs` `eslint.config.mjs` `vercel.json` `.npmrc` `cspell.json` `docker-compose.yml` `.env.example`

**Moved to `web/` (plain mv — gitignored):**
`.env.local` `.env.e2e`

**Created:** `web/.gitignore` `backend/.gitkeep`

**Modified:** `.gitignore` `CLAUDE.md` `.claude/instructions/architecture.md` `.claude/instructions/testing.md` `.claude/instructions/quality.md` `.claude/instructions/workflow.md`

**Deleted:** `tsconfig.tsbuildinfo` (build cache — regenerates automatically)

**Stays at root (no change):** `landing/` `.git/` `.gitignore` `CLAUDE.md` `AGENTS.md` `README.md` `.claude/` `docs/` `.archive/` `.markdownlint.json`

---

## Task 1: Create `web/` and git mv all tracked web files

**Files:** Creates `web/` directory and moves all tracked web files into it.

- [ ] **Step 1: Create the web/ directory**

```bash
mkdir web
```

- [ ] **Step 2: git mv all directories**

```bash
git mv src web/src
git mv __tests__ web/__tests__
git mv e2e web/e2e
git mv public web/public
git mv context web/context
git mv scripts web/scripts
```

- [ ] **Step 3: git mv all root config files**

```bash
git mv package.json web/package.json
git mv pnpm-workspace.yaml web/pnpm-workspace.yaml
git mv next.config.ts web/next.config.ts
git mv jest.config.ts web/jest.config.ts
git mv jest.environment.ts web/jest.environment.ts
git mv jest.polyfills.ts web/jest.polyfills.ts
git mv jest.setup.ts web/jest.setup.ts
git mv playwright.config.ts web/playwright.config.ts
git mv tsconfig.json web/tsconfig.json
git mv tsconfig.scripts.json web/tsconfig.scripts.json
git mv components.json web/components.json
git mv postcss.config.mjs web/postcss.config.mjs
git mv eslint.config.mjs web/eslint.config.mjs
git mv vercel.json web/vercel.json
git mv .npmrc web/.npmrc
git mv cspell.json web/cspell.json
git mv docker-compose.yml web/docker-compose.yml
git mv .env.example web/.env.example
```

- [ ] **Step 4: Verify git sees the renames (not delete+add)**

```bash
git status --short | head -30
```

Expected: lines starting with `R` (renamed), e.g. `R  package.json -> web/package.json`

- [ ] **Step 5: Commit the file moves**

```bash
git commit -m "refactor(workspace): move Next.js web app into web/ directory"
```

---

## Task 2: Move gitignored files and clean up build artifacts

**Files:** Handles files that `git mv` can't touch.

- [ ] **Step 1: Move gitignored env files manually**

```bash
mv .env.local web/.env.local 2>/dev/null || true
mv .env.e2e web/.env.e2e 2>/dev/null || true
```

(The `|| true` prevents errors if the files don't exist locally.)

- [ ] **Step 2: Delete the build cache at root**

```bash
rm -f tsconfig.tsbuildinfo
```

- [ ] **Step 3: Delete the stale next-env.d.ts at root**

```bash
rm -f next-env.d.ts
```

It's gitignored and will regenerate inside `web/` on next `pnpm dev`.

- [ ] **Step 3: Delete root node_modules — it's now orphaned (web/ gets its own on install)**

```bash
rm -rf node_modules
```

- [ ] **Step 4: Verify root is clean**

```bash
ls -la | grep -v "^d" | grep -v "^\."
```

Expected: only `AGENTS.md`, `CLAUDE.md`, `README.md` as non-hidden non-directory files at root.

---

## Task 3: Split `.gitignore` — root keeps monorepo entries, `web/` gets web entries

**Files:** Modifies `.gitignore`, creates `web/.gitignore`.

- [ ] **Step 1: Rewrite root `.gitignore` to monorepo-level entries only**

Replace the entire file with:

```gitignore
.DS_Store
.superpowers
.tmp
.worktrees
.claude/
!.claude/agents/
!.claude/instructions/
```

- [ ] **Step 2: Create `web/.gitignore` with all web-specific entries**

```gitignore
# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage
playwright-report/
test-results/
.playwright-mcp
e2e/.auth/

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# env files
.env*
!.env.example

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# E2E
.env.e2e
```

- [ ] **Step 3: Stage and commit .gitignore changes**

```bash
git add .gitignore web/.gitignore
git commit -m "refactor(workspace): split .gitignore into root and web/"
```

---

## Task 4: Reinstall dependencies and verify the web app works

**Files:** No file changes — verification only.

- [ ] **Step 1: Install dependencies in web/**

```bash
cd web && pnpm install
```

Expected: pnpm lockfile resolves cleanly, no errors.

- [ ] **Step 2: Run Jest tests**

```bash
cd web && pnpm test
```

Expected: all tests pass (same result as before the restructure).

- [ ] **Step 3: Run a production build**

```bash
cd web && pnpm build
```

Expected: build completes with no TypeScript or compilation errors.

- [ ] **Step 4: Start the dev server and verify it loads**

```bash
cd web && pnpm dev
```

Open `http://localhost:3000` and confirm the app loads. Then `Ctrl+C`.

---

## Task 5: Update `CLAUDE.md` — Quick Commands and path table

**Files:** Modifies `CLAUDE.md`

- [ ] **Step 1: Update the Quick Commands section**

Replace the Quick Commands block with:

```markdown
## Quick Commands

```bash
cd web && pnpm dev              # Dev server (localhost:3000)
cd web && pnpm test             # Jest unit/integration tests
cd web && pnpm test:e2e         # Playwright E2E tests
cd web && pnpm lint             # ESLint
cd web && pnpm build            # Production build
```
```

- [ ] **Step 2: Update Critical Rule #1 path table**

Replace the No files in project root rule with:

```
1. **No files in project root** — temp files → `.tmp/`, brainstorm outputs → `.superpowers/`, Sprint Contract plans → `docs/YYYY-MM-DD/plans/`, historical design docs/mockups → `.archive/`, Claude instructions → `.claude/instructions/`, agents → `.claude/agents/`, web app files → `web/`
```

- [ ] **Step 3: Verify the file looks right**

```bash
cat CLAUDE.md
```

---

## Task 6: Rewrite `architecture.md` — directory structure and conventions

**Files:** Modifies `.claude/instructions/architecture.md`

- [ ] **Step 1: Update the Project Overview paragraph**

Replace the first paragraph under `## Project Overview`:

```markdown
POWER_GYM is a gym management web application. The repository is a monorepo with three independent apps: `web/` (Next.js, the main app), `landing/` (Gatsby, static marketing page), and `backend/` (NestJS, v2 API — to be scaffolded). All commands for the web app run from the `web/` directory.
```

- [ ] **Step 2: Replace the entire `## Directory Structure` section**

```markdown
## Directory Structure

```
power_gym/               ← repo root (no package.json)
  web/                   ← Next.js app — run all commands from here
    src/
      app/
        (dashboard)/
          owner/
          trainer/
          member/
        api/
      lib/
        db/
          models/        ← one Mongoose model file per entity
          connect.ts
        repositories/    ← one repository file per model
        animations/
      components/
        ui/              ← Shadcn primitives — do not modify
    __tests__/           ← Jest tests (mirrors src/)
    e2e/                 ← Playwright specs grouped by role
    public/
    context/             ← seed data and dev images
    scripts/             ← migrate and seed scripts
  landing/               ← Gatsby static page (independent)
  backend/               ← NestJS API v2 (to be scaffolded)
  .claude/               ← harness — covers entire repo
    agents/
    instructions/
  docs/                  ← harness Sprint Plans
  .archive/              ← historical design docs
```

For current web app structure run (from `web/`):
```bash
find src/app/api -type d | sort      # API routes
find src/lib -type d | sort          # lib layer
find src/components -type d | sort   # components
```

**Stable conventions (all paths relative to `web/`):**

- Pages live under `src/app/(dashboard)/{owner|trainer|member}/`
- API routes grouped by domain under `src/app/api/`; owner-only routes under `src/app/api/owner/`
- `src/lib/db/models/` — one Mongoose model file per entity
- `src/lib/repositories/` — one repository file per model (interface + MongoDB impl)
- `src/components/ui/` — Shadcn primitives, do not modify
- `__tests__/` mirrors `src/` for Jest; `e2e/` contains Playwright specs grouped by role
```

---

## Task 7: Update `testing.md` — command paths

**Files:** Modifies `.claude/instructions/testing.md`

- [ ] **Step 1: Update the Commands section**

Replace the Commands block at the bottom with:

```markdown
## Commands

```bash
cd web && pnpm test                                        # All Jest tests
cd web && pnpm test --watch                                # Watch mode
cd web && pnpm test -- --testPathPattern=<path>            # Single file
cd web && pnpm test:e2e                                    # Playwright E2E
cd web && pnpm test:coverage                               # Coverage report
```
```

---

## Task 8: Update `quality.md` — command paths

**Files:** Modifies `.claude/instructions/quality.md`

- [ ] **Step 1: Update the Code Quality Gates section**

Replace every bare `pnpm` command in the "Every commit must" and "Before every push" lists with `cd web && pnpm`:

```markdown
**Every commit must:**
- Pass `cd web && pnpm test` (100% pass rate)
- Pass `cd web && pnpm lint` (no warnings, no errors)
...

**Before every push:**
- `cd web && pnpm build` must pass cleanly
- `cd web && pnpm test:e2e` must pass for any spec touching changed flows
```

---

## Task 9: Update `workflow.md` — No Files in Root table

**Files:** Modifies `.claude/instructions/workflow.md`

- [ ] **Step 1: Update the No Files in Project Root table**

Replace the table with:

```markdown
| File type | Correct location |
|---|---|
| Temporary screenshots, debug images, scratch files | `.tmp/` |
| Superpowers / brainstorm tool outputs | `.superpowers/` |
| Sprint Contract implementation plans | `docs/YYYY-MM-DD/plans/` |
| Historical design docs, mockups, research | `.archive/YYYY-MM-DD/` |
| Claude instruction files | `.claude/instructions/` |
| Agent definitions | `.claude/agents/` |
| Web app source, configs, tests | `web/` |
```

---

## Task 10: Create `backend/` placeholder and commit all harness changes

**Files:** Creates `backend/.gitkeep`, commits Tasks 5–10.

- [ ] **Step 1: Create backend/ with a .gitkeep so it's tracked**

```bash
mkdir backend
touch backend/.gitkeep
```

- [ ] **Step 2: Stage all harness file changes and the new backend dir**

```bash
git add CLAUDE.md .claude/instructions/ backend/.gitkeep
```

- [ ] **Step 3: Commit**

```bash
git commit -m "refactor(workspace): update harness files for monorepo structure and add backend/ placeholder"
```

- [ ] **Step 4: Verify final root structure**

```bash
ls -la
```

Expected root contents: `web/` `landing/` `backend/` `.claude/` `docs/` `.archive/` `.git/` `.gitignore` `CLAUDE.md` `AGENTS.md` `README.md` `.markdownlint.json`

---

## Task 11: Update docs/INDEX.md

**Files:** Modifies `docs/INDEX.md`

- [ ] **Step 1: Add the workspace restructure plan row to INDEX.md**

Add to the Active Sprint Plans table:

```markdown
| Workspace Restructure | [workspace-restructure-plan.md](2026-05-28/plans/workspace-restructure-plan.md) | In Progress |
```

- [ ] **Step 2: Commit**

```bash
git add docs/INDEX.md
git commit -m "docs: register workspace restructure plan in INDEX.md"
```
