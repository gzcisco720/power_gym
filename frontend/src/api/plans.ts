import { request, requestVoid } from './client';

const BASE = '/api/v1';

export interface PlanExercise {
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
  exercises: PlanExercise[];
}

export interface PlanListItem {
  _id: string;
  name: string;
  description: string | null;
  days: { name: string; exercises: unknown[] }[];
  createdAt: string;
}

export interface PlanDetail {
  _id: string;
  name: string;
  description: string | null;
  days: PlanDay[];
  createdAt: string;
}

export interface PlanPayload {
  name: string;
  description: string | null;
  days: PlanDay[];
}

export function fetchPlans(): Promise<PlanListItem[]> {
  return request<PlanListItem[]>(`${BASE}/plan-templates`);
}

export function fetchPlanById(id: string): Promise<PlanDetail> {
  return request<PlanDetail>(`${BASE}/plan-templates/${id}`);
}

export function createPlan(payload: PlanPayload): Promise<PlanDetail> {
  return request<PlanDetail>(`${BASE}/plan-templates`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePlan(id: string, payload: PlanPayload): Promise<PlanDetail> {
  return request<PlanDetail>(`${BASE}/plan-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deletePlan(id: string): Promise<void> {
  return requestVoid(`${BASE}/plan-templates/${id}`, { method: 'DELETE' });
}

export interface ExerciseOption {
  _id: string;
  name: string;
  muscleGroup: string | null;
  imageUrl: string | null;
  isBodyweight: boolean;
}

export function fetchExercises(): Promise<ExerciseOption[]> {
  return request<ExerciseOption[]>(`${BASE}/exercises`);
}

export function createExercise(payload: {
  name: string;
  imageUrl: string | null;
  muscleGroup: string | null;
  isBodyweight: boolean;
}): Promise<ExerciseOption> {
  return request<ExerciseOption>(`${BASE}/exercises`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
