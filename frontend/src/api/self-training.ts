import { request, requestVoid } from '@/api/client';

const BASE = '/api/me/workout-logs';

export interface SelfWorkoutSet {
  exerciseId: string;
  exerciseName: string;
  groupId: string;
  isSuperset: boolean;
  isBodyweight: boolean;
  setNumber: number;
  prescribedRepsMin: number | null;
  prescribedRepsMax: number | null;
  actualWeight: number | null;
  actualReps: number | null;
  completedAt: string | null;
}

export interface SelfWorkoutLog {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  lastActivityAt: string | null;
  sourceTemplateId: string | null;
  sourceTemplateDayNumber: number | null;
  rpe: number | null;
  note: string | null;
  autoSealed: boolean;
  sets: SelfWorkoutSet[];
}

export interface CreateLogPayload {
  dayName: string;
  sourceTemplateId?: string | null;
  sourceTemplateDayNumber?: number | null;
  plannedSets: SelfWorkoutSet[];
}

export interface UserTemplateExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
}

export interface UserTemplateDay {
  dayNumber: number;
  name: string;
  exercises: UserTemplateExercise[];
}

export interface UserTemplate {
  _id: string;
  name: string;
  days: UserTemplateDay[];
}

export async function fetchActiveLog(): Promise<SelfWorkoutLog | null> {
  try {
    return await request<SelfWorkoutLog | null>(`${BASE}/active`);
  } catch {
    return null;
  }
}

export async function fetchLogById(id: string): Promise<SelfWorkoutLog | null> {
  try {
    return await request<SelfWorkoutLog>(`${BASE}/${id}`);
  } catch {
    return null;
  }
}

export async function createLog(
  payload: CreateLogPayload,
  deleteActive = false,
): Promise<SelfWorkoutLog> {
  const url = deleteActive ? `${BASE}?deleteActive=true` : BASE;
  return request<SelfWorkoutLog>(url, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function addSet(
  logId: string,
  set: SelfWorkoutSet,
): Promise<SelfWorkoutLog> {
  return request<SelfWorkoutLog>(`${BASE}/${logId}/sets`, {
    method: 'POST',
    body: JSON.stringify(set),
  });
}

export async function updateSet(
  logId: string,
  setIndex: number,
  data: { actualWeight: number | null; actualReps: number | null },
): Promise<SelfWorkoutLog> {
  return request<SelfWorkoutLog>(`${BASE}/${logId}/sets/${setIndex}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function completeLog(
  logId: string,
  data: { rpe?: number | null; note?: string | null },
): Promise<SelfWorkoutLog> {
  return request<SelfWorkoutLog>(`${BASE}/${logId}/complete`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function sealLog(logId: string): Promise<SelfWorkoutLog> {
  return request<SelfWorkoutLog>(`${BASE}/${logId}/seal`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function deleteLog(logId: string): Promise<void> {
  return requestVoid(`${BASE}/${logId}`, { method: 'DELETE' });
}

export async function fetchLogsByMonth(
  year: number,
  month: number,
): Promise<SelfWorkoutLog[]> {
  return request<SelfWorkoutLog[]>(`${BASE}?year=${year}&month=${month}`);
}

export async function fetchRange(start: string, end: string): Promise<SelfWorkoutLog[]> {
  return request<SelfWorkoutLog[]>(
    `${BASE}/range?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
  );
}

export async function fetchTemplates(): Promise<UserTemplate[]> {
  return request<UserTemplate[]>('/api/plan-templates');
}
