# Member Schedule Page Redesign

**Date**: 2026-05-16
**Status**: Approved

---

## Goal

Redesign the member's My Schedule page from a plain flat list into a Timeline Feed — a more visually structured, information-rich layout that makes it immediately clear when the next session is and what the training history looks like.

---

## Design Decisions

| Question | Decision | Reason |
|---|---|---|
| Layout | Timeline Feed (Hero + vertical dot timeline) | Gives visual hierarchy: next session is prominent, future sessions are connected, history collapses below |
| Data scope | ScheduledSession only | No FK link between ScheduledSession and WorkoutSession; merging by date is confusing |
| Countdown granularity | Day-level ("还有 N 天") | Simple, readable; no need for hour/minute precision |
| Actionable CTA | None | ScheduledSession has no link to a plan day; a "Log Workout" button would just navigate to /member/plan — identical to the sidebar |
| Stats strip | None | Page stays focused on schedule; KPIs belong on the Dashboard |

---

## Layout Structure

```
PageHeader (title + "N sessions upcoming" subtitle)
│
├── Hero Card  ← always shows the single next upcoming session
│   ├── Label: "下一次课" / "今天的课"
│   ├── Badge: "还有 N 天" / "今天" (stronger border + bg when today)
│   ├── Date (prominent, e.g. "Thu, May 22")
│   ├── Time range ("7:30 – 8:30")
│   ├── Trainer name + group size ("Coach Mike · 1-on-1" or "Group (4)")
│   └── Recurring badge ("↺ 每周固定") — only if seriesId is not null
│
├── Upcoming Timeline  ← sessions after the hero one
│   ├── Section label: "即将到来" (or "接下来" when hero is today)
│   └── Dot + vertical line + date + time + trainer (per session)
│       Older/dimmer dots for sessions further away
│
└── History Section (collapsed by default)
    ├── Toggle: "▸ 历史记录（N 条）" / "▾ 历史记录（N 条）"
    └── Past sessions as dots, muted (opacity-50)
        Cancelled sessions: red-grey dot + "已取消" label
```

**Empty state** (no upcoming sessions): EmptyState component + history section still shown below if records exist.

---

## State Variants

### Future session (normal)
- Hero badge: `还有 N 天` (indigo, subtle background)
- Hero border: `ring-foreground/[.08]` baseline

### Today's session
- Hero label changes to `今天的课`
- Hero badge: `今天` (brighter indigo, bolder text)
- Hero border: `ring-primary/40` (deeper glow)
- No action button — pure display

### No upcoming sessions
- Hero card replaced by EmptyState component
- History section always visible (not collapsed) when there's no upcoming content

---

## Data Flow

**Server component** (`page.tsx`) fetches:
1. `repo.findByMember(memberId)` — all sessions sorted by date asc
2. Trainer names via `userRepo.findById()` for each unique `trainerId`

**Partitioning logic** (stays in the server component):
```
now = new Date()
upcoming = all where date >= now AND status === 'scheduled'   → [0] = hero, [1..] = timeline
history  = all where date <  now OR  status === 'cancelled'   → reversed (newest first)
```

**DTO shape** (unchanged from current):
```ts
{
  _id: string
  date: string          // ISO
  startTime: string     // "HH:MM"
  endTime: string       // "HH:MM"
  trainerName: string
  memberCount: number
  status: 'scheduled' | 'cancelled'
  isRecurring: boolean
}
```

---

## Components

### `MemberScheduleHero` (new)
- Props: `session: SessionDto | null`
- Renders the hero card; null → EmptyState
- Determines `isToday` by comparing the local date string of `new Date(session.date)` against `new Date().toLocaleDateString()` — avoids UTC offset bugs
- Computes `daysUntil` using local midnight of session date minus local midnight of today (not raw ms diff)

### `MemberScheduleTimeline` (new)
- Props: `sessions: SessionDto[]`
- Renders the vertical dot timeline; empty array → nothing rendered
- Section label: "即将到来" normally, "接下来" when hero is today (pass `heroIsToday: boolean` prop)

### `MemberScheduleHistory` (replaces inline in current `MemberScheduleList`)
- Props: `sessions: SessionDto[]`
- Toggle button + collapsed list
- Cancelled rows: `text-destructive/60`, dot `bg-destructive/30`

### `MemberScheduleList` (refactored)
- Becomes a thin shell that composes the three components above
- Receives `upcoming: SessionDto[]` and `history: SessionDto[]`
- Passes `upcoming[0]` to Hero, `upcoming.slice(1)` to Timeline

---

## Visual Tokens

Follow project conventions (CLAUDE.md):

| Element | Token |
|---|---|
| Hero background | `bg-primary/[.07]` |
| Hero border (normal) | `ring-1 ring-primary/[.16]` |
| Hero border (today) | `ring-1 ring-primary/40` |
| Badge "还有 N 天" | `bg-primary/[.12] text-primary-light` |
| Badge "今天" | `bg-primary/[.20] text-primary-light font-semibold` |
| Timeline dot (near) | `bg-primary` |
| Timeline dot (far/dim) | `bg-primary/50` |
| Timeline connector line | `bg-foreground/[.05]` |
| History row | `opacity-50` |
| Cancelled dot | `bg-destructive/30` |
| Cancelled text | `text-destructive/60` |
| Section labels | `text-[11px] uppercase tracking-wider text-foreground/65 font-semibold` |

No hardcoded hex colours.

---

## Files Changed

| File | Change |
|---|---|
| `src/app/(dashboard)/member/schedule/page.tsx` | Refactor DTO mapping; history now sorted newest-first |
| `src/app/(dashboard)/member/schedule/_components/member-schedule-list.tsx` | Refactor into shell component |
| `src/app/(dashboard)/member/schedule/_components/member-schedule-hero.tsx` | New |
| `src/app/(dashboard)/member/schedule/_components/member-schedule-timeline.tsx` | New |
| `src/app/(dashboard)/member/schedule/_components/member-schedule-history.tsx` | New (extracted from list) |

---

## Out of Scope

- Linking ScheduledSession to WorkoutSession (no FK exists)
- KPI stats strip
- Any "Log Workout" / action button
- Push notifications or calendar export
