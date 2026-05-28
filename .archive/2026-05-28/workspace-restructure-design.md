# Workspace Restructure Design

**Date**: 2026-05-28
**Scope**: Move web app into `web/`, update harness files. NestJS scaffolding is out of scope.

---

## Goal

The project root currently doubles as the Next.js web app. `landing/` is a separate Gatsby package but sits mixed at root. The goal is a clean monorepo layout where each app is a fully independent package in its own folder, and the project root is reserved for shared tooling (harness, git config).

---

## Target Directory Structure

```
power_gym/               ← repo root (no package.json)
  web/                   ← Next.js app (moved from root)
    src/
    __tests__/
    e2e/
    public/
    context/
    scripts/
    package.json
    pnpm-workspace.yaml
    next.config.ts
    jest.config.ts
    jest.environment.ts
    jest.polyfills.ts
    jest.setup.ts
    playwright.config.ts
    tsconfig.json
    tsconfig.scripts.json
    components.json
    postcss.config.mjs
    eslint.config.mjs
    vercel.json
    .npmrc
    cspell.json
    docker-compose.yml
    .gitignore            ← web-specific ignores (split from root)
  landing/               ← Gatsby (already exists, stays)
    package.json
    ...
  backend/               ← empty dir (NestJS in future spec)
  .claude/               ← harness (unchanged)
  docs/                  ← harness Sprint Plans (unchanged)
  .archive/              ← historical design docs (unchanged)
  .gitignore             ← monorepo-level ignores only
  CLAUDE.md
  AGENTS.md
  README.md
```

---

## Files to Move (git mv → `web/`)

All of the following move from root into `web/`:

| File / Folder | Notes |
|---|---|
| `src/` | Next.js app source |
| `__tests__/` | Jest unit/integration tests |
| `e2e/` | Playwright E2E specs |
| `public/` | Static assets |
| `context/` | Seed data, dev images |
| `scripts/` | Migrate and seed scripts |
| `package.json` | Web app dependencies |
| `pnpm-workspace.yaml` | Web-specific pnpm config |
| `next.config.ts` | |
| `jest.config.ts` | |
| `jest.environment.ts` | |
| `jest.polyfills.ts` | |
| `jest.setup.ts` | |
| `playwright.config.ts` | |
| `tsconfig.json` | |
| `tsconfig.scripts.json` | |
| `components.json` | Shadcn config |
| `postcss.config.mjs` | |
| `eslint.config.mjs` | |
| `vercel.json` | |
| `.npmrc` | |
| `cspell.json` | |
| `docker-compose.yml` | |
| `.env.example` | Web env vars reference |
| `.env.e2e` | E2E test env vars |

## Files Staying at Root

| File / Folder | Reason |
|---|---|
| `.git/` | Repo-level |
| `.gitignore` | Rewritten for monorepo-level ignores |
| `CLAUDE.md` | Harness — covers whole repo |
| `AGENTS.md` | Harness |
| `README.md` | Repo-level |
| `.markdownlint.json` | Applies to whole repo (docs/, .claude/instructions/ etc.) |
| `.claude/` | Harness |
| `docs/` | Harness Sprint Plans |
| `.archive/` | Historical design docs |
| `.superpowers/` | Brainstorm outputs (gitignored) |
| `.tmp/` | Temp files (gitignored) |

---

## Special Handling

### `.gitignore` split

Root `.gitignore` retains only monorepo-level entries:
```
.DS_Store
.superpowers
.tmp
.claude/
!.claude/agents/
!.claude/instructions/
```

`web/.gitignore` takes all web-specific entries:
```
.next/
node_modules/
.env.local
*.tsbuildinfo
```

### `.env.local`
Gitignored — `git mv` won't touch it. Move manually with `mv`.

### `tsconfig.tsbuildinfo`
Build cache — delete it. Will regenerate on next `pnpm build`.

### `node_modules/`
Gitignored — not moved. Run `pnpm install` inside `web/` after restructure.

---

## Harness Files to Update

| File | Change |
|---|---|
| `CLAUDE.md` | Quick Commands: add `cd web &&` prefix to all pnpm commands. Critical Rule #1: update path table. |
| `architecture.md` | Full rewrite of directory structure section. Update stack description to reflect monorepo. Update commands. |
| `testing.md` | Update all `pnpm test*` commands to run from `web/`. |
| `quality.md` | Update `pnpm lint`, `pnpm build` commands. |
| `workflow.md` | Update No Files in Root table: `scripts/` → `web/scripts/`, `context/` → `web/context/`. |
| `design.md` | Reference paths for components unchanged (relative paths stay valid within `web/`). No changes needed. |

---

## Out of Scope

- NestJS backend scaffolding (separate spec)
- Any changes to `web/` app code or dependencies
- `landing/` changes (already correctly structured)
- CI/CD pipeline updates
