// One prescribed exercise inside a plan day (mirrors web IPlanDayExercise).
export interface PlanDayExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  imageUrl: string | null;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number | null;
}

export interface PlanDay {
  dayNumber: number;
  name: string;
  exercises: PlanDayExercise[];
}

// GET /training/my-plan → null when no active plan assigned.
export interface ActivePlan {
  _id: string;
  name: string;
  templateId: string;
  assignedAt: string; // ISO
  days: PlanDay[];
}

// One logged set inside a workout session.
export interface SessionSet {
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
  completedAt: string | null; // ISO when logged
}

// Returned by start / patch / finish / history endpoints.
export interface WorkoutSession {
  _id: string;
  memberId: string;
  memberPlanId: string;
  dayNumber: number;
  dayName: string;
  startedAt: string; // ISO
  completedAt: string | null; // ISO once finished
  sets: SessionSet[];
}

// POST /training/sessions
export interface StartSessionInput {
  dayNumber: number;
}

// PATCH /training/sessions/:id/sets
export interface PatchSetInput {
  setNumber: number;
  exerciseId: string;
  actualReps: number;
  actualWeight: number | null; // null for bodyweight
}

// POST /training/members/:memberId/assign-plan (trainer/owner)
export interface AssignPlanInput {
  templateId: string;
}
