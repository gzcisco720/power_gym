# Member Hub Overview Redesign

**Date:** 2026-05-20
**Status:** Approved
**Scope:** `src/app/(dashboard)/trainer/members/[id]/page.tsx` + 3 components under `_components/`

---

## Problem

The current Overview tab has five issues:

1. **Page is 60% empty** — 5 stat cards + 1 injury list occupy only the top 40% of the viewport.
2. **Stat cards have no context** — bare numbers with no trend delta; "Member for N days" was removed from the header but context is still missing here.
3. **"Active Plan" buried in stats** — the plan is the most actionable item on the page but lives as one of five equal-weight cards, with no CTA.
4. **Health section shows injuries only** — medications are omitted; no "all clear" state.
5. **No empty states** — no plan assigned shows nothing; no injuries shows nothing.

---

## Design

### Layout

```
Desktop (lg+):
┌─────────────────────────────────┬────────────┐
│  [Weight] [BF] [Sessions] [Last]│            │
├─────────────────────────────────│  Health    │
│  Plan Card (with Log Workout)   │  Panel     │
└─────────────────────────────────┴────────────┘

Mobile (< lg):
┌──────────────────┐
│  [W]   [BF]      │
│  [Ses] [Last]    │
├──────────────────┤
│  Plan Card       │
├──────────────────┤
│  Health Panel    │
└──────────────────┘
```

The page outer grid: `grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3`

Left column (`flex flex-col gap-3`): stat strip → plan card
Right column: health panel (fills full height naturally via `h-full`)

---

## Component Specs

### 1. `page.tsx` — grid shell only

```tsx
<div className="px-4 sm:px-8 py-7">
  <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
    <div className="flex flex-col gap-3">
      <Suspense fallback={<StatStripSkeleton />}>
        <StatStripSection memberId={memberId} />
      </Suspense>
      <Suspense fallback={<PlanCardSkeleton />}>
        <PlanCardSection memberId={memberId} />
      </Suspense>
    </div>
    <Suspense fallback={<HealthPanelSkeleton />}>
      <HealthPanelSection memberId={memberId} />
    </Suspense>
  </div>
</div>
```

`space-y-6` removed; gaps now handled by the grid.

---

### 2. `_components/stat-strip-section.tsx` (replaces `stat-cards-section.tsx`)

**Data fetches (parallel):**
```ts
const [tests, stats] = await Promise.all([
  new MongoBodyTestRepository().findByMember(memberId), // sorted desc, take [0] and [1]
  new MongoWorkoutSessionRepository().findMemberStats(memberId),
]);
const latest = tests[0] ?? null;
const previous = tests[1] ?? null;
```

**4 cards rendered:**

| Card | Value | Sub-line |
|---|---|---|
| Weight | `latest.weight kg` or `—` | `▼/▲ X.X kg vs prev` (if previous exists) or `No prior test` |
| Body Fat | `latest.bodyFatPct.toFixed(1) %` or `—` | `▼/▲ X.X% vs prev` (if previous exists) |
| Sessions | `stats.completedCount` | `last 90 days` (static) |
| Last Session | `formatRelativeDate(stats.lastCompletedAt)` or `—` | day name from most recent session via `findRecentCompletedByMemberIds([memberId], 1)` |

**Delta color rules:**
- Weight down (▼) → `text-emerald-400` (losing weight = success for most members)
- Body Fat down (▼) → `text-emerald-400`
- Weight up (▲) → `text-foreground/50` (neutral — could be muscle gain)
- Body Fat up (▲) → `text-amber-400`
- No previous test → sub-line shows `text-foreground/40 "No prior test"`

**Delta sign logic:**
```ts
const weightDelta = previous ? latest.weight - previous.weight : null;
const bfDelta = previous ? latest.bodyFatPct - previous.bodyFatPct : null;
```

**Last session sub-line:**
`findRecentCompletedByMemberIds([memberId], 1)` returns `{ dayName }`. Show `dayName` as sub-line (e.g. "Push"). If no sessions, sub-line is empty.

**Styling:** reuse existing `StatCard` component; pass `delta` prop as pre-formatted string (e.g. `"▼ 1.2 kg"`) and a new `deltaColor` prop, OR format the sub-line inline and skip the `delta` prop — whichever requires fewer changes to `StatCard`. Prefer fewer changes.

> **Implementation note:** `StatCard` already has a `delta` prop rendered as `text-xs text-foreground/65`. Override the color by formatting with a wrapper `<span>` if needed, or add a `deltaVariant?: 'success' | 'warning' | 'neutral'` prop to `StatCard`. Add only what is needed.

---

### 3. `_components/plan-card-section.tsx` (new file)

**Data fetch:**
```ts
const plan = await new MongoMemberPlanRepository().findActive(memberId);
```

**With plan:**
```
[indigo accent label: ACTIVE PLAN]
[Plan name — bold 17px]           [Log Workout button → /trainer/members/:id/plan]
[Day N — DayName · X sessions · Assigned MMM D, YYYY]    [Change Plan link → /trainer/members/:id/plan]
```

- Container: `bg-primary/8 rounded-xl border border-primary/18 p-4`
- Label: `text-[10px] font-semibold uppercase tracking-widest text-primary-light mb-2`
- Plan name: `text-[17px] font-bold text-foreground`
- Meta line: `text-[12px] text-foreground/45 mt-1`
- Log Workout: `bg-primary text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-primary/90`
- Change Plan: `text-[12px] text-foreground/40 hover:text-foreground/65`

**Without plan (empty state):**
```
[dashed border container]
[ACTIVE PLAN label faint]
"No active training plan"          [Assign Plan → /trainer/members/:id/plan]
```

- Container: `bg-card/50 rounded-xl border border-dashed border-foreground/15 p-4`
- Assign Plan: same button style as Log Workout

---

### 4. `_components/health-panel-section.tsx` (replaces `health-section.tsx`)

**Data fetches (parallel):**
```ts
const [injuries, allMeds] = await Promise.all([
  new MongoMemberInjuryRepository().findActiveByMember(memberId),
  new MongoMemberMedicationRepository().findByMember(memberId),
]);
const activeMeds = allMeds.filter(m => m.status === 'active');
```

**Has content** (any injury OR any active medication):
- Container: `bg-destructive/6 rounded-xl border border-destructive/15 p-4 flex flex-col gap-3 h-full`
- Section label: `text-[10px] font-semibold uppercase tracking-widest text-red-400`
- Injury sub-header: `text-[10px] text-foreground/40 uppercase tracking-wide`
- Each injury: `bg-destructive/8 rounded-lg border border-destructive/12 px-3 py-2.5`
  - Title: `text-[13px] font-semibold text-foreground`
  - Affected: `text-[11px] text-foreground/45 mt-0.5`
  - Status badge: `text-[11px] text-red-400 mt-1` (only "Active" — resolved injuries not shown here)
- Medication sub-header: same style as injury sub-header
- Each medication: `bg-card/60 rounded-lg border border-foreground/8 px-3 py-2.5`
  - Name: `text-[13px] font-semibold text-foreground`
  - Sub: `text-[11px] text-foreground/45 mt-0.5` — `{purpose} · {duration label} · Since {MMM YYYY}`
  - Duration label: `long_term` → "Long-term", `short_term` → "Short-term"
- Footer link: `mt-auto text-[11px] text-primary/70 hover:text-primary transition-colors` → `/trainer/members/:id/health`

**No content** (no active injuries AND no active medications):
- Container: `bg-emerald-500/5 rounded-xl border border-emerald-500/15 p-4 flex flex-col gap-3 h-full`
- Label: `text-[10px] font-semibold uppercase tracking-widest text-emerald-400`
- Center content: checkmark icon + "No active concerns" + sub-text
- Footer link same as above

---

### 5. Skeleton components

**`StatStripSkeleton`** (inline, in `stat-strip-section.tsx` or a shared file):
```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[80px] rounded-xl" />)}
</div>
```

**`PlanCardSkeleton`**: `<Skeleton className="h-[88px] rounded-xl" />`

**`HealthPanelSkeleton`**: `<Skeleton className="h-[200px] rounded-xl" />`

---

## Files Changed

| Action | File |
|---|---|
| Modify | `src/app/(dashboard)/trainer/members/[id]/page.tsx` |
| Rename+modify | `_components/stat-cards-section.tsx` → `_components/stat-strip-section.tsx` |
| Create | `_components/plan-card-section.tsx` |
| Modify | `_components/health-section.tsx` → rename export to `HealthPanelSection` |
| Delete | `_components/health-section-skeleton.tsx` (skeleton now inline) |
| Update | `__tests__/app/trainer/member-hub-page.test.ts` |

> `StatCardsSkeleton` from `@/components/shared/stat-cards-skeleton` no longer imported by this page; it may still be used elsewhere — do not delete it.

---

## Data Requirements Summary

| Data | Repo method | Notes |
|---|---|---|
| Latest 2 body tests | `MongoBodyTestRepository().findByMember(memberId)` | Take [0] and [1]; sorted desc |
| Session stats | `MongoWorkoutSessionRepository().findMemberStats(memberId)` | Existing |
| Last session day name | `MongoWorkoutSessionRepository().findRecentCompletedByMemberIds([memberId], 1)` | Existing |
| Active plan | `MongoMemberPlanRepository().findActive(memberId)` | Existing |
| Active injuries | `MongoMemberInjuryRepository().findActiveByMember(memberId)` | Existing |
| All medications | `MongoMemberMedicationRepository().findByMember(memberId)` | Filter `status === 'active'` in component |

---

## Success Criteria

1. Page has no empty black void — bento fills the viewport at 1440px
2. Weight and Body Fat cards show delta vs previous body test; color-coded correctly
3. Last Session card sub-line shows day name (e.g. "Push") when available
4. Plan card shows plan name, day, session count, Log Workout CTA and Change Plan link
5. Plan card shows "No active training plan" + Assign Plan CTA when no plan
6. Health panel shows all active injuries + active medications
7. Health panel shows green "No active concerns" empty state when neither present
8. Footer link "View full health profile →" navigates to Health tab
9. Mobile (375px): single column — stat strip 2×2, then plan card, then health panel
10. `pnpm lint` passes; `pnpm test` passes
