# Frontend Redesign Design — POWER GYM Phase 2

**Date**: 2026-04-23
**Status**: Approved

---

## Overview

A full frontend redesign replacing all native HTML elements with shadcn/ui components. The visual language is premium dark monochrome: layered near-black backgrounds, Space Grotesk typography, pure white as the sole accent, and Framer Motion animations. All UI copy is in English. The layout uses a persistent expanded sidebar on desktop with a responsive drawer on mobile.

---

## Section 1 — Design System

### Color Palette

| Token | Value | Usage |
|---|---|---|
| `bg-base` | `#030303` | Page root background |
| `bg-sidebar` | `#0a0a0a` | Sidebar surface |
| `bg-surface` | `#0c0c0c` | Cards, panels |
| `bg-elevated` | `#141414` | Borders, dividers, progress tracks |
| `bg-hover` | `#141414` | Hover states |
| `text-primary` | `#ffffff` | Headings, active labels |
| `text-secondary` | `#555555` | Body text, descriptions |
| `text-muted` | `#2e2e2e` | Metadata, timestamps |
| `text-disabled` | `#1e1e1e` | Inactive nav labels |
| `accent` | `#ffffff` | CTA buttons, active nav bg, completed set chips, progress fill |

All colors are defined as CSS custom properties in `globals.css` and mapped to shadcn's theme variables (`--background`, `--foreground`, `--card`, etc.) so shadcn components inherit them automatically.

### Typography

**Font**: Space Grotesk — loaded via `next/font/google`, applied to `<html>` via CSS variable.

| Role | Size | Weight | Letter-spacing |
|---|---|---|---|
| Page title | 18px | 700 | -0.3px |
| Section title | 13px | 600 | 0 |
| Body / nav | 13px | 500 | 0 |
| Meta label | 9–10px | 600 | 2px (uppercase) |
| Stat value | 26px | 700 | -1px |
| Micro label | 8px | 600 | 2px (uppercase) |

### Spacing & Shape

- **Card border-radius**: 12px (`rounded-xl`)
- **Button border-radius**: 8px (`rounded-lg`)
- **Nav item border-radius**: 6px (`rounded-md`)
- **Day card border-radius**: 10px (`rounded-[10px]`)
- **Content padding**: 32px horizontal, 28px top (`px-8 pt-7`)
- **Content gap**: 20px between sections (`gap-5`)

---

## Section 2 — Layout & Navigation

### Sidebar (220px, desktop-always-visible)

Structure (top to bottom):
1. **Logo block**: "POWER GYM" in 11px / 700 / letter-spacing 3px + role sub-label in 9px / muted. Bottom border separates from nav.
2. **Nav groups**: Two groups — TRAINING and HEALTH — each preceded by an 8px uppercase group label.
3. **Nav items**: Icon + label, 13px / 500. Active state: white background + black text. Inactive: `#3a3a3a`. Hover: `#141414` bg + `#888` text.
4. **Footer**: User avatar chip (initials circle + name + role string), pinned to bottom with top border.

Nav items by role:

| Role | TRAINING | HEALTH |
|---|---|---|
| Member | My Plan, Personal Bests | Nutrition, Body Tests |
| Trainer | Plan Templates | Nutrition Templates |
| Owner | My Plan, Personal Bests, Plan Templates | Nutrition, Body Tests, Nutrition Templates |

> Note: Trainers access per-member pages (plan assignment, body tests, nutrition) from within the Plan Templates and Nutrition Templates flows, not via a top-level Members nav item. A dedicated Members list page does not exist in Phase 1 and is out of scope for Phase 2.

### Top Bar (sticky per-page)

- **Left**: page title (18px/700) + subtitle (12px, muted) — e.g. plan name, week number, member name
- **Right**: 1–2 contextual action buttons (ghost + primary)
- **Background**: `#050505` with bottom border `#0f0f0f`, `position: sticky; top: 0; z-index: 10`

### Responsive Behavior

| Breakpoint | Sidebar | Top bar |
|---|---|---|
| ≥ 1024px (`lg`) | Always visible, 220px | No hamburger |
| < 1024px | Hidden, slides in as drawer on demand | Hamburger icon (left) |
| < 640px (`sm`) | Drawer | Hamburger |

Mobile-specific layout adjustments:
- Stat grid: 2×2 (`grid-cols-2`)
- Day cards: single column (`grid-cols-1`)
- Exercise rows: stack prescription below name

---

## Section 3 — Component Library

All components use shadcn/ui as the base. The dark theme is applied globally via CSS variables — individual component files require no style overrides.

| Component | shadcn base | Key overrides |
|---|---|---|
| Button (primary) | `Button` | `bg-white text-black hover:bg-white/90` |
| Button (ghost) | `Button variant="ghost"` | `border border-[#1a1a1a] text-[#444] hover:border-[#333] hover:text-[#888]` |
| Card | `Card` | `bg-[#0c0c0c] border-[#141414] rounded-xl` |
| Input | `Input` | `bg-[#0c0c0c] border-[#1e1e1e] focus-visible:ring-white` |
| Select | `Select` | Same dark surface as Input |
| Tabs | `Tabs` | Underline variant (`TabsList` transparent, white active underline) |
| Badge | `Badge` | `bg-[#1a1a1a] text-[#555] border-0` |
| Separator | `Separator` | `bg-[#141414]` |
| Toast | `Sonner` | Dark theme via `theme="dark"` prop |
| Dialog | `Dialog` | `bg-[#0a0a0a] border-[#1e1e1e]` |
| Sheet | `Sheet` | Same as Dialog; used for mobile sidebar drawer |
| Skeleton | `Skeleton` | `bg-[#141414] animate-pulse` |

**New shared components** (in `src/components/shared/`):

| Component | Purpose |
|---|---|
| `AppShell` | Sidebar + top bar layout wrapper |
| `StatCard` | Single metric card (label + value + delta) |
| `SectionHeader` | Title + secondary action link row |
| `ProgressBar` | Thin white fill bar with animated width |
| `SetChip` | Circular set indicator (pending / completed) |
| `EmptyState` | Centered icon + heading + CTA for empty lists |
| `PageHeader` | Top bar title + subtitle + action slot |

---

## Section 4 — Animation Strategy

Library: **Framer Motion** (`framer-motion` package).

### Page Transitions

Wrap `(dashboard)/layout.tsx` children in a `<motion.div>` with:
```
initial: { opacity: 0, y: 8 }
animate: { opacity: 1, y: 0 }
transition: { duration: 0.2, ease: 'easeOut' }
key: pathname
```

### Component Animations

| Trigger | Animation | Spec |
|---|---|---|
| Page content mount | Fade + slide up | opacity 0→1, y 8→0, 200ms ease-out |
| Card list mount | Staggered fade-in | each card delay `i * 40ms`, 150ms |
| Set chip → complete | Scale pop + fill | scale 0.8→1.1→1, 200ms, then white fill |
| Progress bar fill | Width tween | 400ms ease-out on mount |
| Sidebar drawer (mobile) | Slide in from left | 250ms ease-out via Sheet component |
| Modal / Dialog open | Fade + scale up | shadcn default (customized to 250ms) |
| Button hover | Background transition | 150ms (CSS transition) |
| Stat values on load | Count-up number | 600ms ease-out via Framer Motion `useSpring` |

### Reduced Motion

Wrap all Framer Motion animations with `useReducedMotion()` — if true, skip transforms, keep only opacity fades at 100ms.

---

## Section 5 — Page Inventory

### Auth Pages (no sidebar)

| Path | Description |
|---|---|
| `/login` | Centered card on `#030303`, logo top, email + password inputs, sign in button |
| `/register` | Same card layout, additional name field, invite token pre-filled from URL |

### Member Pages

| Path | Page Title | Key Components |
|---|---|---|
| `/dashboard/member/plan` | My Training Plan | StatCard ×4, day cards grid, exercise panel, PB mini-card, frequency chart |
| `/dashboard/member/plan/session/new` | Start Session | Confirmation card with day summary |
| `/dashboard/member/plan/session/[id]` | Day N — [Name] | Exercise list with live SetChips, ProgressBar, complete button |
| `/dashboard/member/pbs` | Personal Bests | Table/list with 1RM estimates, exercise filter |
| `/dashboard/member/nutrition` | Nutrition Plan | Tabs per day type, macro donut chart, meal + food item list |
| `/dashboard/member/body-tests` | Body Composition | History cards, dual-axis Recharts line chart |

### Trainer Pages

| Path | Page Title | Key Components |
|---|---|---|
| `/dashboard/trainer/plans` | Plan Templates | Sortable list, create button, delete action |
| `/dashboard/trainer/plans/new` | New Template | Multi-step form: name → add days → add exercises |
| `/dashboard/trainer/plans/[id]/edit` | Edit Template | Same as new, pre-filled |
| `/dashboard/trainer/members/[id]/plan` | Member Plan | Assign plan, session history list, PB table |
| `/dashboard/trainer/nutrition` | Nutrition Templates | Same list pattern as plan templates |
| `/dashboard/trainer/nutrition/new` | New Nutrition Template | Day type tabs, macro inputs, food item search |
| `/dashboard/trainer/nutrition/[id]/edit` | Edit Nutrition | Pre-filled version of above |
| `/dashboard/trainer/members/[id]/nutrition` | Member Nutrition | Assign + view assigned plan |
| `/dashboard/trainer/members/[id]/body-tests` | Body Tests | History list + new test form with protocol selector |

### Empty & Loading States

Every list page must have:
- **Loading**: `Skeleton` cards matching the content shape
- **Empty**: `EmptyState` component with icon, heading, and primary CTA

---

## Section 6 — Implementation Scope

### What changes

- `src/app/layout.tsx` — add Space Grotesk font, update `globals.css` CSS variables
- `src/app/(dashboard)/layout.tsx` — full rewrite to AppShell with sidebar + responsive drawer
- `src/app/(auth)/login/page.tsx` — redesign with dark card + shadcn inputs
- `src/app/(auth)/register/page.tsx` — same
- All `page.tsx` and `_components/` files under `(dashboard)/` — replace native elements with shadcn + new shared components
- Add Framer Motion page transition wrapper

### What does NOT change

- All API routes (`src/app/api/`)
- All repository / model / lib logic
- All existing tests (UI component tests will need updating for new component structure)
- Auth.js config

### New dependencies

```bash
pnpm add framer-motion
# Space Grotesk via next/font/google — no package needed
# shadcn components already installed; add any missing ones via CLI
```

---

## Key Constraints

- All UI text in **English**
- No color accent — white is the only highlight color
- Shadcn components must be used for all interactive elements (inputs, buttons, selects, dialogs, tabs)
- Responsive layout required: sidebar becomes drawer on mobile
- `useReducedMotion()` must gate all Framer Motion transforms
- Existing tests must remain passing after refactor; update snapshot/component tests as needed
- TDD: write component tests before implementing each redesigned component
