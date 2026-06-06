export interface ExerciseRef {
  exerciseId: string;
  exerciseName: string;
}

export interface ExerciseHistorySet {
  setNumber: number;
  weight: number;
  reps: number;
}

export interface ExerciseHistorySession {
  sessionId: string;
  date: string;
  sets: ExerciseHistorySet[];
  estimatedOneRepMax: number;
}

export interface ExerciseSessionHistory {
  exerciseId: string;
  exerciseName: string;
  sessions: ExerciseHistorySession[];
}

export interface MemberProgress {
  heatmapDates: string[];
  exercises: ExerciseRef[];
}
