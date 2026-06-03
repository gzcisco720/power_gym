export interface Exercise {
  _id: string;
  name: string;
  muscleGroup: string | null;
  isGlobal: boolean;
  isBodyweight: boolean;
}

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

export interface PlanTemplate {
  _id: string;
  name: string;
  description: string | null;
  createdBy: string;
  days: PlanDay[];
  createdAt: string;
}

export interface CreatePlanTemplateDto {
  name: string;
  description?: string | null;
  days: PlanDay[];
}

export interface UpdatePlanTemplateDto {
  name?: string;
  description?: string | null;
  days?: PlanDay[];
}

export interface CreateExerciseDto {
  name: string;
  muscleGroup: string | null;
  isBodyweight: boolean;
}
