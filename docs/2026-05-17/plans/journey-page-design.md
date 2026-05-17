# Journey Page Design

**Date**: 2026-05-17  
**Status**: Approved  
**Feature**: Member Journey / 旅程 — Body transformation timeline with milestone highlights

---

## Overview

A dedicated page at `/member/journey` that lets members visually track their physical transformation over time. The primary data source is body tests (body composition snapshots), with check-in photos attached as visual evidence. Special moments are elevated as "milestones" with enlarged cards.

**Goal**: Motivate members by making their progress feel real and cumulative.

---

## 1. Navigation

- **Route**: `/member/journey`
- **Nav label**: 旅程
- **Icon**: `Trophy` or `Sparkles` (Lucide)
- **Position**: Standalone sidebar item, same level as Dashboard / Plan / Nutrition, placed after Body Tests
- **Prominence**: Must be visually distinct — not buried at the bottom of the nav list

---

## 2. Page Header

Visual style: indigo gradient card background (matching the milestone card aesthetic).  
Content: "start vs now" comparison — no dependency on goal fields being set.

**Fields displayed**:
- Page title: 我的旅程
- Subtitle: `{n} 次体测 · 开始于 {firstTestDate}`
- Delta badge: `↓ {bodyFatDelta}% 体脂` (only if ≥ 2 tests)
- Three stat columns (only if ≥ 2 tests):
  - 起点: bodyFatPct, weight, date of first test
  - 现在: bodyFatPct, weight, date of latest test
  - 瘦体质量: leanMassKg delta (e.g. `+2.3 kg`, `57.5 → 59.8`)

**Edge case — only 1 test**: Show current stats only; hide the comparison columns and delta badge.  
**Edge case — 0 tests**: Show empty state with CTA to prompt trainer to schedule a body test.

---

## 3. Timeline Layout (B+C)

Each timeline node is a `flex` row with two children — a fixed-width **track column** and a **body column**. No absolute positioning on the spine or dots. This makes the spine correctly adapt to any card height on any screen size.

```
.node  (display: flex, align-items: stretch)
  .track  (flex-direction: column, align-items: center, width: 14px)
    .dot   (circle, margin-top: 10px for regular / 16px for milestone)
    .line  (flex: 1, width: 2px — hidden on last node)
  .body   (flex: 1, padding-bottom: 8px)
    <card>
```

Time direction: **newest at top**, older records below. Scroll down to see history.

---

## 4. Node Types

### 4a. Regular Node

Shown for every body test that does not qualify as a milestone.

| Element | Content |
|---|---|
| Dot | Small indigo circle |
| Date | `YYYY年M月 · 第N次` |
| Primary stats | `体脂 {pct}% · {weight} kg` |
| Delta line | `↓ {delta}% · 瘦体质量 {leanMass} kg` (green if improvement) |
| Photo thumbnail | 34×34px, nearest check-in photo within ±14 days; emoji placeholder `📷` if none found |

### 4b. Milestone Node

Shown when one or more milestone triggers fire on a body test. All triggers that apply to the same test are **merged into one card**.

| Element | Content |
|---|---|
| Dot | Large indigo circle with glow ring |
| Card background | Indigo gradient, indigo border, elevated shadow |
| Emoji | Auto-selected based on highest-priority trigger (see §5) |
| Date + month-count | `YYYY年M月 · 加入第N个月` |
| Title | Human-readable summary of the milestone moment |
| Tags | Pill badges, one per trigger (gold for goal-reached, green for streak/change, indigo for PB/time) |
| Stats row | 体脂 / 体重 / 瘦体质量, each with delta |
| Photos strip | Up to 3 check-in photos from within ±14 days; empty slot placeholder if fewer than 3 |

---

## 5. Milestone Trigger Logic

All five triggers are evaluated for every body test. A test becomes a milestone if **at least one** fires.

| Trigger | Rule | Tag color |
|---|---|---|
| **Goal reached** | `bodyFatPct <= targetBodyFatPct` (using the test's own `targetBodyFatPct` field, if non-null) AND no earlier test already satisfied this condition — i.e., truly the first time. Same logic for `weight` vs `targetWeight`. | Gold |
| **Significant change** | `bodyFatPct` dropped ≥ 1% vs previous test, OR `weight` changed ≥ 2 kg vs previous test | Green |
| **Personal best** | New all-time lowest `bodyFatPct`, OR new all-time highest `leanMassKg`, compared against all earlier tests | Indigo |
| **Time milestone** | 1st test ever, OR test date is within ±7 days of the 3-month / 6-month / 1-year anniversary of **the first body test date** (not join date) | Indigo |
| **Check-in streak** | A check-in streak milestone (30, 60, or 100 cumulative check-ins) occurred within ±7 days of this body test | Green |

**Emoji selection** (highest priority wins):
1. 🏆 Goal reached
2. 🌟 Time milestone (3 / 6 / 12 months)
3. 🥇 Personal best
4. ⬇ Significant change
5. ✅ Check-in streak only

**Title generation** (server-side, plain string):
- Goal reached → `达成目标体脂，同时创下最低纪录`
- Multiple triggers → most significant trigger becomes the title; others shown in tags only

---

## 6. API Design

### Endpoint

```
GET /api/members/[memberId]/journey
```

**Query params**:
- `cursor` (optional): ISO date string of the oldest test in the previous page; omit for first load
- `limit` (optional): number of body tests per page, default 10

**Auth**: Member can only fetch their own. Trainer/owner can fetch any member they manage (existing middleware pattern).

### Response shape

```typescript
interface JourneyResponse {
  items: JourneyItem[];
  nextCursor: string | null;   // null when no more history
  summary: JourneySummary;     // always returned (for header)
}

interface JourneySummary {
  totalTests: number;
  firstTestDate: string;        // ISO
  firstBodyFatPct: number;
  firstWeight: number;
  latestBodyFatPct: number;
  latestWeight: number;
  leanMassDeltaKg: number;
}

interface JourneyItem {
  bodyTest: {
    id: string;
    date: string;               // ISO
    testNumber: number;         // 1-indexed rank by date ascending
    bodyFatPct: number;
    weight: number;
    leanMassKg: number;
    fatMassKg: number;
    deltaBodyFatPct: number | null;   // vs previous test; null for first test
    deltaWeight: number | null;
  };
  checkInPhoto: string | null;  // URL of nearest check-in photo within ±14 days
  milestone: MilestoneInfo | null;
}

interface MilestoneInfo {
  emoji: string;
  title: string;
  tags: MilestoneTag[];
  photos: string[];             // up to 3 check-in photo URLs within ±14 days
}

interface MilestoneTag {
  label: string;
  color: 'gold' | 'green' | 'indigo';
}
```

### Server-side logic

1. Fetch body tests for member, sorted descending by date, with cursor-based pagination
2. Fetch all check-ins for member (photos + submittedAt) — one query, cached in the request
3. For each body test:
   - Find nearest check-in within ±14 days for thumbnail
   - Evaluate all 5 milestone triggers (requires full history for PB checks — fetched once)
   - If any trigger fires, build `MilestoneInfo` with up to 3 photos from ±14 days
4. Build `JourneySummary` from first and last body tests
5. Return paginated `JourneyResponse`

**Repository method**: Add `findByMemberForJourney(memberId, cursor?, limit)` to `BodyTestRepository` — returns tests with `testNumber` pre-computed.

---

## 7. Lazy Loading

- **Strategy**: Intersection Observer on a sentinel element below the last card
- **Trigger**: When sentinel enters viewport, append next page to existing list
- **Indicator**: Three dots animation (`···`) while loading
- **End state**: Replace dots with `· 已显示全部记录 ·` when `nextCursor` is null
- **Page size**: 10 body tests per fetch (milestone cards are taller, so 10 is reasonable)

---

## 8. Photo Matching

For each body test, scan check-ins within ±14 days of the test date:
- **Regular node thumbnail**: pick the single closest check-in with at least one photo; use first photo in its `photos` array
- **Milestone photos strip**: collect all check-ins within ±14 days that have photos; pick up to 3, ordered by proximity to the test date

If no check-in photo is found within the window, show the `📷` placeholder (regular) or an empty slot with a dashed border (milestone).

---

## 9. Edge Cases

| Scenario | Handling |
|---|---|
| Member has 0 body tests | Empty state: illustration + "你的教练还没有为你记录体测数据" |
| Member has 1 body test | Header shows current stats only; no comparison; single timeline node |
| No `targetBodyFatPct` / `targetWeight` set | Goal-reached trigger never fires; no impact on other triggers |
| Multiple milestones far apart in time | Each becomes its own enlarged card; no collapsing |
| Body test and check-in streak within 7 days | Streak tag merged into body test milestone card |
| Check-in streak NOT near any body test | Streak not shown in this timeline (existing check-in page handles the celebration) |
