# Mobile Responsive Design

**Date:** 2026-04-26
**Status:** Approved

---

## Goal

Make all three roles (Owner, Trainer, Member) usable on mobile devices, with the highest priority on the Member Session Logger experience during gym sessions.

## Approach

Tailwind responsive breakpoints throughout (`sm` = 640px as the mobile/desktop boundary), with one logic-level change: the Session Logger set-input panel becomes a bottom Sheet on mobile while keeping the existing inline expansion on desktop.

No new dependencies. The Shadcn `Sheet` component is already installed.

---

## Architecture

### Breakpoint Strategy

- **`< sm` (< 640px):** Mobile layout — reduced padding, stacked lists, bottom Sheet for set input
- **`≥ sm` (≥ 640px):** Desktop layout — all existing behaviour preserved exactly

### Files Changed (16 total)

| File | Change type |
|------|-------------|
| `src/components/shared/page-header.tsx` | Padding |
| `src/app/(auth)/login/page.tsx` | Outer padding |
| `src/app/(auth)/register/page.tsx` | Outer padding |
| `src/app/(dashboard)/member/plan/_components/plan-overview.tsx` | Padding |
| `src/app/(dashboard)/member/pbs/_components/pb-board.tsx` | Padding |
| `src/app/(dashboard)/member/nutrition/_components/nutrition-plan-viewer.tsx` | Padding |
| `src/app/(dashboard)/member/body-tests/_components/body-test-viewer.tsx` | Padding |
| `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx` | Padding + bottom Sheet logic |
| `src/app/(dashboard)/owner/page.tsx` | Padding |
| `src/app/(dashboard)/owner/members/_components/member-list-client.tsx` | Grid → flex stack |
| `src/app/(dashboard)/owner/_components/trainer-breakdown-table.tsx` | Grid → flex stack |
| `src/app/(dashboard)/owner/trainers/_components/trainer-list-client.tsx` | Padding |
| `src/app/(dashboard)/owner/invites/_components/invite-create-form.tsx` | Padding |
| `src/app/(dashboard)/trainer/members/page.tsx` | Card → flex-col on mobile |
| `src/app/(dashboard)/trainer/members/[id]/body-tests/_components/body-test-client.tsx` | Grid + padding |
| `src/app/(dashboard)/trainer/plans/_components/plan-template-form.tsx` | Padding |
| `src/app/(dashboard)/trainer/nutrition/_components/nutrition-template-form.tsx` | Padding only (macros grid already responsive) |

---

## Feature Details

### 1. Navigation

**No changes needed.** `AppShell` already implements:
- Desktop: fixed left sidebar (`hidden lg:flex`)
- Mobile: hamburger button (`lg:hidden`) + Shadcn `Sheet` drawer from left

### 2. Global Padding

Every page container and `PageHeader` changes from `px-8` to `px-4 sm:px-8`. Auth pages add `px-4` to the outer wrapper to prevent overflow on 375 px viewports.

### 3. Session Logger — Bottom Sheet on Mobile

The set-input area is rendered twice and toggled via CSS:

```tsx
{/* Desktop: inline expansion (unchanged) */}
<div className="hidden sm:block">
  {/* existing inline weight/reps inputs */}
</div>

{/* Mobile: bottom Sheet */}
<Sheet open={activeSetIndex === index} onOpenChange={...}>
  <SheetContent side="bottom" className="...">
    {/* full-width Weight + Reps inputs, Log Set button */}
  </SheetContent>
</Sheet>
```

- Clicking a SetChip sets `activeSetIndex`; both the inline panel and the Sheet key off this state
- Bodyweight exercises: Weight input hidden in Sheet, same as inline
- Log Set button: calls same `logSet(index)` handler, closes Sheet on success
- Sheet close (swipe down / overlay tap): sets `activeSetIndex` to `null`
- No JS media query required — CSS `hidden sm:block` / `sm:hidden` handles visibility

### 4. Owner Members List

Mobile removes the fixed column header row and re-renders each data row as `flex justify-between`:

```
[Name / Email / Trainer name stacked vertically]   [Reassign button]
```

Column header row: `hidden sm:grid` (hidden on mobile, grid on desktop).  
Data rows: `flex items-start justify-between sm:grid sm:grid-cols-[1fr_180px_80px]`.

### 5. Owner Trainer Breakdown Table

Same pattern as Owner Members. Column header hidden on mobile. Data rows become:

```
[Name / Email]
[X members · Y sessions/mo]           [Manage →]
```

### 6. Trainer Members Page

Each member card changes from `flex items-center justify-between` to `flex-col sm:flex-row`. On mobile, the three action links (Plan →, Body Tests →, Nutrition →) move to a second line separated by a `border-t`.

### 7. Body Test Form

- Age/Sex/Weight row: `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`
- Skinfold sites grid: stays `grid-cols-3` (short number inputs fit at 375 px)
- Target weight/fat row: `grid-cols-2` — stays (two inputs is fine on mobile)
- Section padding: `px-8` → `px-4 sm:px-8`

### 8. Nutrition Template Form

- Macro targets grid: already `grid-cols-2 sm:grid-cols-4` — no change
- All other padding: `px-8` → `px-4 sm:px-8` where applicable

### 9. Plan Template Form

Padding only. The form is already a single-column vertical stack inside `max-w-2xl`.

---

## Testing

- Manual browser DevTools: toggle between 375 px (iPhone SE) and 1280 px (desktop) for each role's pages
- Playwright E2E tests are run on Chromium at desktop viewport — no changes to test files needed
- Unit/integration tests are unaffected (no logic changes outside Session Logger)
- Session Logger unit tests: mock `Sheet` from Shadcn (same as existing Shadcn component mocks)

---

## Constraints

- Desktop experience must remain pixel-identical — no changes to `sm:` and above classes that already exist
- No new npm packages
- AppShell is not modified — navigation is already responsive
