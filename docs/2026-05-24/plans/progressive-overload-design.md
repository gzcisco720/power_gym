# Progressive Overload Tracking

## Overview

Adds last-weight hints and progression badges to the session logger, plus a strength trend chart on the trainer's member plan tab.

## Features

### 1. Last Weight Hint (Session Logger)

In the exercise row, when a member logs a session, each non-bodyweight exercise shows:

```
Last: 80 kg × 8  · 19 May
```

Hidden once the member types a weight into any set input for that exercise (`hideHint`).

### 2. "Try X kg" Badge (NSCA 2-for-2 Rule)

When a member hits all prescribed max reps in two consecutive sessions for the same exercise, a badge appears:

```
Try 84.0 kg
```

Increment calculation follows ACSM 2026 guidelines: `round(lastWeight × 0.05, 0.5 kg)`, min +0.5 kg, capped at +5 kg.

### 3. Strength Progress Chart (Trainer View)

On the trainer's member plan tab, below the PBs grid, an exercise selector + Recharts `LineChart` shows estimated 1RM trend (Epley formula) over time. Tooltip shows `{bestWeight} kg × {bestReps} | Est. 1RM: {estimatedOneRM} kg`.

## Architecture

### Repository

`findLastWeightsForExercises(memberId, exerciseIds)` in `workout-session.repository.ts` — MongoDB aggregation returning `LastWeightHint[]` (exerciseId, lastWeight, lastReps, lastDate, allSetsHitMax).

### API Routes

- `GET /api/members/[memberId]/exercise-last-weights?exerciseIds=...` — auth-gated (member: own only, trainer: assertTrainerOwnsMember, owner: any)
- `GET /api/progress/[memberId]` — extended with `bestWeight` and `bestReps` per history point

### Key Files

| File | Change |
|---|---|
| `src/lib/repositories/workout-session.repository.ts` | `findLastWeightsForExercises` method |
| `src/app/api/members/[memberId]/exercise-last-weights/route.ts` | New GET route |
| `src/app/api/progress/[memberId]/route.ts` | Added bestWeight/bestReps |
| `src/components/training/exercise-row.tsx` | `lastWeightHint` prop, hint UI, badge |
| `src/app/(dashboard)/member/plan/session/[id]/_components/session-logger.tsx` | Fetch hints, pass to ExerciseRow |
| `src/app/(dashboard)/trainer/members/[id]/plan/_components/trainer-member-plan-client.tsx` | ExerciseStrengthChart component |
| `src/lib/training/progressive-overload.ts` | `suggestedIncrement`, `formatHintDate` |

## Calculation Basis

- **allSetsHitMax**: all sets in a session had `actualReps >= prescribedRepsMax`
- **consecutiveMaxHits**: last N sessions where allSetsHitMax is true; badge shows at 2 (NSCA 2-for-2)
- **Increment**: `Math.round(lastWeight * 0.05 / 0.5) * 0.5`, min 0.5 kg, max 5 kg
- **Estimated 1RM**: Epley — `weight × (1 + reps / 30)` in `src/lib/training/epley.ts`
