export interface SessionSetInput {
  exerciseId: string;
  exerciseName: string;
  groupId: string;
  isSuperset: boolean;
  isBodyweight: boolean;
  setNumber: number;
  prescribedRepsMin: number;
  prescribedRepsMax: number;
  isExtraSet: boolean;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | Date | null;
}

export interface RawSessionInput {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  sets: SessionSetInput[];
}

export interface SessionSummary {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
}

export function summarizeSession(s: RawSessionInput): SessionSummary {
  const exerciseIds = new Set<string>();
  let setCount = 0;
  let totalVolume = 0;
  for (const set of s.sets) {
    exerciseIds.add(set.exerciseId);
    if (set.actualWeight !== null && set.actualReps !== null) {
      setCount += 1;
      totalVolume += set.actualWeight * set.actualReps;
    }
  }
  return {
    _id: s._id,
    dayName: s.dayName,
    startedAt: s.startedAt,
    completedAt: s.completedAt,
    exerciseCount: exerciseIds.size,
    setCount,
    totalVolume,
  };
}
