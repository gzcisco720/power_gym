# Training Plans & Performance Tracking Design — POWER_GYM

**Date**: 2026-04-21
**Status**: Approved

---

## Overview

Trainers create reusable plan templates and assign deep-copy instances to members. Members log sets in real time during a workout session. Personal bests are tracked per exercise with both actual best set and estimated 1RM (Epley formula). A global exercise library is supplemented by trainer-custom exercises.

---

## Architecture

**Pattern:** Template model — trainer creates `PlanTemplate`, assignment creates a `MemberPlan` deep copy. Changes to the template after assignment do not affect active member plans.

**PB strategy:** Hybrid — `WorkoutSession` embeds set logs; a separate `PersonalBest` collection is atomically upserted on each set save for fast reads.

---

## Data Models

### Exercise

```ts
{
  _id: ObjectId,
  name: string,
  muscleGroup: string | null,
  isGlobal: boolean,
  createdBy: ObjectId | null,   // null = global built-in; trainer ObjectId = custom
  imageUrl: string | null,      // illustration or GIF URL
  isBodyweight: boolean,        // true = no weight input needed (BW checkbox)
  createdAt: Date
}
```

Unique index: `(name, createdBy)` — same name allowed if different trainer.

### PlanTemplate

```ts
{
  _id: ObjectId,
  name: string,
  description: string | null,
  createdBy: ObjectId,           // owner or trainer
  days: [
    {
      dayNumber: number,         // 1-based
      name: string,              // e.g. "Day 1 — Push"
      exercises: [
        {
          groupId: string,        // "A", "B", "C", "D" — same groupId = same group
          isSuperset: boolean,    // true = this exercise belongs to a superset group
          exerciseId: ObjectId,
          exerciseName: string,   // denormalized for display
          imageUrl: string | null, // copied from Exercise at plan creation time
          isBodyweight: boolean,
          sets: number,
          repsMin: number,        // e.g. 6 for "6-8"
          repsMax: number,        // e.g. 8 for "6-8"; equals repsMin if fixed reps
          restSeconds: number | null
        }
      ]
    }
  ],
  createdAt: Date
}
```

### MemberPlan

```ts
{
  _id: ObjectId,
  memberId: ObjectId,
  trainerId: ObjectId,
  templateId: ObjectId,          // reference to source template
  name: string,                  // copied from template at assignment time
  days: [ /* deep copy of template.days */ ],
  isActive: boolean,             // only one active plan per member at a time
  assignedAt: Date
}
```

When a new plan is assigned, the previous active plan is set to `isActive: false`.

### WorkoutSession

```ts
{
  _id: ObjectId,
  memberId: ObjectId,
  memberPlanId: ObjectId,
  dayNumber: number,
  dayName: string,
  startedAt: Date,
  completedAt: Date | null,
  sets: [
    {
      exerciseId: ObjectId,
      exerciseName: string,        // denormalized
      groupId: string,             // carried from plan exercise
      isSuperset: boolean,
      isBodyweight: boolean,
      setNumber: number,           // 1-based; extra sets added by member get next number
      prescribedRepsMin: number,
      prescribedRepsMax: number,
      isExtraSet: boolean,         // true = added by member during session (+ Add Set)
      actualWeight: number | null, // kg; null for bodyweight exercises
      actualReps: number | null,
      completedAt: Date | null
    }
  ]
}
```

### PersonalBest

```ts
{
  _id: ObjectId,
  memberId: ObjectId,
  exerciseId: ObjectId,
  exerciseName: string,           // denormalized
  bestWeight: number,             // kg — actual best weight logged
  bestReps: number,               // reps at that weight
  estimatedOneRM: number,         // Epley: weight × (1 + reps / 30)
  achievedAt: Date,
  sessionId: ObjectId
}
```

Unique compound index: `(memberId, exerciseId)`.

Upsert condition: update only when `weight × (1 + reps/30) > current estimatedOneRM`.

---

## 1RM Formula

**Epley formula** (industry standard, good for 1–10 rep range):

```text
estimatedOneRM = weight × (1 + reps / 30)
```

Implemented as a pure function in `src/lib/training/epley.ts` for easy unit testing.

---

## API Routes

### Exercises

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/api/exercises` | owner/trainer/member | Global + caller's trainer custom exercises |
| POST | `/api/exercises` | owner/trainer | Create custom exercise |

### Plan Templates

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/api/plan-templates` | owner/trainer | List templates created by caller |
| POST | `/api/plan-templates` | owner/trainer | Create template |
| GET | `/api/plan-templates/[id]` | owner/trainer | Template detail |
| PUT | `/api/plan-templates/[id]` | owner/trainer | Update template (creator only) |
| DELETE | `/api/plan-templates/[id]` | owner/trainer | Delete template (creator only) |

### Member Plans

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/api/members/[memberId]/plan` | owner/trainer/member(self) | Active plan for member |
| POST | `/api/members/[memberId]/plan` | owner/trainer | Assign template to member (deep copy) |

### Workout Sessions

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/api/sessions` | member | Start new session (body: `{ memberPlanId, dayNumber }`) — server pre-populates `sets[]` from the plan day's exercises (all `actualWeight`/`actualReps` = null) |
| GET | `/api/sessions/[id]` | owner/trainer/member(self) | Session detail with all sets |
| PATCH | `/api/sessions/[id]/sets/[setIndex]` | member(self) | Log a set (`{ actualWeight, actualReps }`) — `setIndex` is 0-based; upserts PB if beaten |
| POST | `/api/sessions/[id]/sets` | member(self) | Add an extra set to an exercise (`{ exerciseId, prescribedRepsMin, prescribedRepsMax }`) — appends with `isExtraSet: true` |
| POST | `/api/sessions/[id]/complete` | member(self) | Mark session complete |
| GET | `/api/sessions?memberId=xxx` | owner/trainer/member(self) | Session history |

### Personal Bests

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/api/members/[memberId]/pbs` | owner/trainer/member(self) | All PBs for member |

---

## Permission Rules

- **member**: can only access own plan, sessions, and PBs
- **trainer**: can access plans/sessions/PBs of members they manage (`trainerId` matches)
- **owner**: full access to all members

---

## Pages

### Trainer

| Path | Description |
| ---- | ----------- |
| `/dashboard/trainer/plans` | Template list — create, delete |
| `/dashboard/trainer/plans/new` | Create template (add days + exercises) |
| `/dashboard/trainer/plans/[id]/edit` | Edit template |
| `/dashboard/trainer/members/[id]/plan` | Assign plan, view member training history and PBs |

### Member

| Path | Description |
| ---- | ----------- |
| `/dashboard/member/plan` | Active plan overview, choose which day to train |
| `/dashboard/member/plan/session/new?day=N` | Confirm start of Day N |
| `/dashboard/member/plan/session/[id]` | Live logging: check off sets, enter weight/reps |
| `/dashboard/member/pbs` | PB board: best set + estimated 1RM per exercise |

**Session logging flow:**

1. Member selects a day from their plan overview
2. Enters session page — all exercises and prescribed sets visible (superset groups shown together)
3. Taps a set → inline input for weight + reps → confirm → set checked off; PB upserted in background
4. Bodyweight exercise → weight input hidden, only reps recorded
5. `+ Add Set` → appends extra set (`isExtraSet: true`) for that exercise
6. First-ever set for an exercise → toast: "这是你的第一次记录，将作为基准"
7. All sets done → "完成训练" button appears → POST `/complete`

---

## File Structure

```text
src/
  lib/
    db/models/
      exercise.model.ts
      plan-template.model.ts
      member-plan.model.ts
      workout-session.model.ts
      personal-best.model.ts
    repositories/
      exercise.repository.ts
      plan-template.repository.ts
      member-plan.repository.ts
      workout-session.repository.ts
      personal-best.repository.ts
    training/
      epley.ts                        ← pure 1RM formula + inverse
  app/
    api/
      exercises/
        route.ts
      plan-templates/
        route.ts
        [id]/route.ts
      members/[memberId]/
        plan/route.ts
        pbs/route.ts
      sessions/
        route.ts
        [id]/
          route.ts
          sets/[setIndex]/route.ts
          complete/route.ts
    (dashboard)/
      trainer/
        plans/
          page.tsx
          new/page.tsx
          [id]/edit/page.tsx
        members/[id]/plan/page.tsx
      member/
        plan/
          page.tsx
          session/
            new/page.tsx
            [id]/page.tsx
        pbs/page.tsx

__tests__/
  lib/
    training/epley.test.ts
    repositories/
      exercise.repository.test.ts
      plan-template.repository.test.ts
      member-plan.repository.test.ts
      workout-session.repository.test.ts
      personal-best.repository.test.ts
  app/api/
    exercises.test.ts
    plan-templates.test.ts
    plan-templates-[id].test.ts
    members-plan.test.ts
    sessions.test.ts
    sessions-sets.test.ts
    sessions-complete.test.ts
    members-pbs.test.ts
```

---

## Key Constraints

- 一个学员同时只能有一个 `isActive=true` 的 MemberPlan；分配新计划时旧计划自动置为 `isActive: false`
- PB upsert 仅当新组的 estimatedOneRM 超过现有记录时执行
- trainer 只能操作自己名下学员（`member.trainerId === trainer._id`）的数据
- 模板删除不影响已分配的 MemberPlan（深拷贝，独立存在）
- WorkoutSession 未 complete 时可继续追加 set 记录；complete 后不可修改
- `isBodyweight=true` 的动作不记录 actualWeight（前端隐藏重量输入框，后端允许 null）
- Superset 组内的动作按 groupId 分组展示，groupId 相同且 isSuperset=true 的动作归为一组
- 额外加组（`+ Add Set`）通过 `POST /api/sessions/[id]/sets` 追加，`isExtraSet=true` 标记
- `repsMin === repsMax` 时视为固定次数；`repsMin < repsMax` 时显示范围（如 "6-8"）
