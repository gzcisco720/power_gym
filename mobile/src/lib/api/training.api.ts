import { apiClient } from './client';
import { ActivePlan, WorkoutSession, PatchSetInput, SelfSessionSummary, SelfSessionDetail, PersonalBest, ActiveSessionInfo, ExerciseHistoryPoint } from '../../types/training';

export async function fetchMyPlan(): Promise<ActivePlan | null> {
  const response = await apiClient.get<ActivePlan | null>('/training/my-plan');
  return response.data;
}

export async function startSession(dayNumber: number): Promise<WorkoutSession> {
  const response = await apiClient.post<WorkoutSession>('/training/sessions', { dayNumber });
  return response.data;
}

export async function patchSet(sessionId: string, input: PatchSetInput): Promise<WorkoutSession> {
  const response = await apiClient.patch<WorkoutSession>(`/training/sessions/${sessionId}/sets`, input);
  return response.data;
}

export async function finishSession(sessionId: string, rpe?: number): Promise<WorkoutSession> {
  const response = await apiClient.post<WorkoutSession>(
    `/training/sessions/${sessionId}/finish`,
    rpe !== undefined ? { rpe } : {},
  );
  return response.data;
}

export async function addSet(sessionId: string, exerciseId: string): Promise<WorkoutSession> {
  const response = await apiClient.post<WorkoutSession>(
    `/training/sessions/${sessionId}/sets/add`,
    { exerciseId },
  );
  return response.data;
}

export async function deleteSet(
  sessionId: string,
  exerciseId: string,
  setNumber: number,
): Promise<WorkoutSession> {
  const response = await apiClient.delete<WorkoutSession>(
    `/training/sessions/${sessionId}/sets`,
    { data: { exerciseId, setNumber } },
  );
  return response.data;
}

export async function assignPlan(memberId: string, templateId: string): Promise<ActivePlan> {
  const response = await apiClient.post<ActivePlan>(`/training/members/${memberId}/assign-plan`, { templateId });
  return response.data;
}

export async function fetchMemberHistory(memberId: string): Promise<WorkoutSession[]> {
  const response = await apiClient.get<WorkoutSession[]>(`/training/members/${memberId}/history`);
  return response.data;
}

export async function fetchMemberPlan(memberId: string): Promise<ActivePlan | null> {
  const response = await apiClient.get<ActivePlan | null>(`/training/members/${memberId}/plan`);
  return response.data;
}

export async function startMemberSession(memberId: string, dayNumber: number): Promise<WorkoutSession> {
  const response = await apiClient.post<WorkoutSession>(`/training/members/${memberId}/sessions`, { dayNumber });
  return response.data;
}

export async function patchMemberSet(memberId: string, sessionId: string, input: PatchSetInput): Promise<WorkoutSession> {
  const response = await apiClient.patch<WorkoutSession>(`/training/members/${memberId}/sessions/${sessionId}/sets`, input);
  return response.data;
}

export async function finishMemberSession(memberId: string, sessionId: string): Promise<WorkoutSession> {
  const response = await apiClient.post<WorkoutSession>(`/training/members/${memberId}/sessions/${sessionId}/finish`, {});
  return response.data;
}

export async function fetchSelfSessions(): Promise<SelfSessionSummary[]> {
  const response = await apiClient.get<SelfSessionSummary[]>('/training/self/sessions');
  return response.data;
}

export async function fetchMemberPersonalBests(memberId: string): Promise<PersonalBest[]> {
  const response = await apiClient.get<PersonalBest[]>(`/training/members/${memberId}/personal-bests`);
  return response.data;
}

export async function fetchMemberActiveSession(memberId: string): Promise<ActiveSessionInfo | null> {
  const response = await apiClient.get<ActiveSessionInfo | null>(`/training/members/${memberId}/active-session`);
  return response.data;
}

export async function fetchMemberExerciseHistory(memberId: string, exerciseId: string): Promise<ExerciseHistoryPoint[]> {
  const response = await apiClient.get<ExerciseHistoryPoint[]>(`/training/members/${memberId}/exercise/${exerciseId}`);
  return response.data;
}

export async function fetchSelfSession(sessionId: string): Promise<SelfSessionDetail> {
  const response = await apiClient.get<SelfSessionDetail & { memberNote?: string | null }>(
    `/training/self/sessions/${sessionId}`,
  );
  return {
    ...response.data,
    note: response.data.memberNote ?? null,
  };
}
