# One Check-in Per Calendar Day — Design Spec

**Date**: 2026-05-11  
**Status**: Approved

---

## Problem

Trainers and owners can complete a session then immediately start a new one on the same calendar day (selecting a different plan day). The system only prevents overlapping *active* sessions, not same-day duplicates. Members have the same gap once a session is completed.

## Rule

Every user may have at most **one** session/log record per UTC calendar day. Starting a second one on the same day prompts an overwrite confirmation; confirming deletes the old record and creates the new one.

---

## Backend

### Repository changes

Both repositories get a new `findToday(id)` method:

```typescript
// query: { memberId/userId, startedAt: { $gte: startOfTodayUTC, $lt: startOfTomorrowUTC } }
WorkoutSessionRepository.findToday(memberId: string): Promise<IWorkoutSession | null>
SelfWorkoutLogRepository.findToday(userId: string):   Promise<ISelfWorkoutLog | null>
```

### `/api/sessions` POST — updated logic

```
today = findToday(targetMemberId)

if today:
  if today.completedAt === null AND today.dayNumber === body.dayNumber:
    return 200 today          // idempotent resume — no change
  if NOT ?overwrite=true:
    return 409 { error: 'TODAY_ALREADY_LOGGED',
                 existingSession: { _id, dayName, dayNumber, startedAt } }
  await sessionRepo.delete(today._id)   // overwrite: delete first

// create new session (existing logic)
```

### `/api/me/workout-logs` POST — updated logic

```
today = findToday(guard.userId)

if today:
  if today.completedAt === null AND NOT ?overwrite=true:
    return 409 { error: 'ACTIVE_SESSION_CONFLICT', ... }   // resume flow unchanged
  if today.completedAt !== null AND NOT ?overwrite=true:
    return 409 { error: 'TODAY_ALREADY_LOGGED',
                 existingLog: { _id, dayName, startedAt } }
  await repo.delete(today._id)   // overwrite: delete first

// create new log (existing logic)
```

---

## Frontend

On any client component that calls a session/log creation API:

- Receive `409 { error: 'TODAY_ALREADY_LOGGED' }` → open shadcn `<Dialog>`:
  - Title: "今天已有打卡记录"
  - Body: "你今天已记录了「{existingSession.dayName}」。继续将删除这条记录并创建新记录。"
  - Actions: [取消] [覆盖并继续]
- On confirm: re-POST with `?overwrite=true` appended to URL

---

## What Does Not Change

- Active-session resume flow (`ACTIVE_SESSION_CONFLICT`) — unchanged
- Same-day same-dayNumber idempotent 200 — unchanged
- Cron auto-seal, `lastActivityAt`, RPE, set logging — untouched
- Database schema / indexes — no migration needed
