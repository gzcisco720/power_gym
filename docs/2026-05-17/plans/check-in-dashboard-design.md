# Check-In Dashboard — Design Spec

## Overview

Upgrade the member check-in page (`/member/check-in`) from a single-purpose form into a full check-in dashboard. The dashboard aggregates all check-in-related features into one surface: weekly submission, progress tracking, body metrics, before/after photo comparison, and achievement milestones.

---

## Routes

| Route | Description |
|---|---|
| `/member/check-in` | Dashboard (this spec) |
| `/member/check-in/new` | Full-page submission form (existing form, moved to this route) |
| `/member/check-in/history` | Full paginated history list |
| `/member/check-in/[id]` | Member-scoped detail view of a single past check-in (new — mirrors the trainer detail view but read-only, scoped to the member's own data) |

No new API routes are needed. All data is already available via existing endpoints and server actions.

---

## Layout

### Desktop (≥ 768px): Two-column

```
[Achievement Cards — 3 columns spanning full width]

[Left col — 1fr]          [Right col — 320px]
Wellness Breakdown         This Week card
                           └─ Heatmap
Body Metrics               Compare card
History list               Recent Photos (gallery preview)
```

### Mobile (< 768px): Single column, stacked in this order

1. This Week card (submit CTA stays prominent above the fold)
2. Achievement Cards
3. Wellness Breakdown
4. Body Metrics
5. Compare card
6. Recent Photos
7. History list

---

## Sections

### 1. Achievement Cards (top strip)

Three cards, replacing the old KPI stat row. Auto-computed from check-in history.

| Card | Value | Subtitle |
|---|---|---|
| 🏆 Lost X kg | `first_weight − latest_weight` | `first_weight → latest_weight in N weeks` |
| 🔥 N-week streak | consecutive weeks with a check-in | `N check-ins, never missed a week` |
| 🥗 N on-track in a row | longest `stuckToDiet: 'yes'` run | `Best diet consistency streak` |

Cards only show if meaningful (streak ≥ 2, weight loss > 0, etc.). Missing data = card hidden, not shown as zero.

---

### 2. Wellness Breakdown (left col, top)

Replaces the old wellness trend bar chart. Shows the **most recent check-in's** 7 ratings.

**Layout:** radar SVG on the left + 7 horizontal bars on the right.

**Fields and colours:**

| Field | Colour logic |
|---|---|
| Sleep, Energy, Recovery, Digestion, Hunger | `≥ 7` → indigo; `5–6` → amber; `≤ 4` → red |
| Stress, Fatigue | Inverted: `≤ 3` → indigo (good); `4–6` → amber; `≥ 7` → red |

Header shows date of most recent check-in. If no check-in exists yet, section is hidden.

---

### 3. Body Metrics (left col, middle)

Six metric cells in a 3×2 grid: Weight, Waist, Steps, Sleep, Exercise, Diet.

Each cell shows:
- Current value (from most recent check-in)
- Delta vs. the previous check-in that had data for that field (skip nulls)
- 5-point sparkline of recent values

Diet cell shows the `stuckToDiet` status as coloured label + last-6-weeks dot row.

If a member has never entered a metric, the cell shows `—` with no delta.

---

### 4. History List (left col, bottom)

Five most recent check-ins. Each row:
- Date + relative label ("Last week", "2 weeks ago", …)
- 7 wellness dots (coloured by field value)
- Average wellness score
- Pills: diet badge (On track / Partial / Off track) · weight · photo count
- Chevron `›` — navigates to trainer-style detail view at `/member/check-in/[id]`

"View all N →" navigates to `/member/check-in/history`.

---

### 5. This Week Card (right col, top)

**State A — not yet submitted:**
- Amber pulse dot + "This week not submitted yet"
- Full-width indigo gradient button: "Submit This Week's Check-In →"
- Navigates to `/member/check-in/new`

**State B — already submitted:**
- Green dot + "Submitted this week · [date]"
- Button replaced with a summary row (avg wellness + weight)

Below the button: **Consistency Heatmap** (Feature 4).

---

### 6. Consistency Heatmap

Displayed inside the This Week card, below the submit button.

- One cell per week, oldest → newest left to right
- Cell colour = wellness score intensity (darker indigo = higher score; empty/missing = dim grey)
- Current week = amber dashed outline if pending, solid indigo if done
- Legend: Submitted · Missed · Pending
- Max 30 cells shown (truncate oldest beyond 30 weeks; no "Show all" in MVP)

---

### 7. Compare Card (right col, middle)

Two date dropdowns (Before / After), each limited to weeks that have at least one photo.

Below the selectors: 2-column photo preview (aspect-ratio 3/4).
- "Tap a photo to select a different angle" hint — tapping a photo cycles through that week's photos
- "Open Full Comparison →" button launches the **Full Comparison Modal**

**Full Comparison Modal:**
- Full-screen overlay (no new route)
- Top bar: title + ✕ close
- Two columns side by side, each filling half the viewport height
- Each column: date/weight header + full photo + thumbnail strip below to switch angle
- On mobile: columns stack vertically (Before on top, After below)

---

### 8. Recent Photos (right col, bottom)

A 3×2 thumbnail grid showing the 6 most recent photos across all check-ins.

"All N →" opens the **Photo Gallery Modal**.

**Photo Gallery Modal:**
- Full-screen modal (no new route)
- Top bar: "← Dashboard" + "Progress Photos · N total" + ✕
- Scrollable body: photos grouped by month, 4-column grid
- Each photo: aspect-ratio 3/4, date label at bottom
- Tapping a photo opens **Lightbox**

**Lightbox:**
- Overlays the gallery modal (gallery stays mounted underneath)
- Large photo centred
- Date + weight subtitle
- Prev / Next navigation
- Thumbnail strip at bottom showing all photos from same check-in week (to switch angles)
- "← All photos" returns to grid; ✕ closes everything

---

## Responsive Behaviour

| Element | Mobile treatment |
|---|---|
| Achievement cards | Stack to 1 column |
| Main grid | Single column (right col items reorder per section order above) |
| Wellness Breakdown | Radar hidden on mobile; bars only |
| Body Metrics | 2×3 grid → 2×3 (unchanged, compact padding) |
| History list | Pills truncated to diet badge + weight only |
| Full Comparison Modal | Columns stack vertically |
| Photo Gallery | 3-column grid → 2-column grid |

---

## Data Requirements

All data comes from existing sources. No schema changes needed.

| Section | Data source |
|---|---|
| Achievement cards | `findByMember` — compute from full history |
| Wellness Breakdown | Most recent check-in |
| Body Metrics | Two most recent check-ins per field (null-skipping) |
| History list | `findByMember` (paginated, newest first) |
| Heatmap | `findByMember` — date + avg wellness per entry |
| Compare card | `findByMember` — filter to entries with photos |
| Recent Photos | `findPhotosForMember` |

---

## Out of Scope

- Photo 3 (Photo Timeline) — not included in this phase
- Any trainer-side changes
- Push notifications or email changes
- New check-in fields
