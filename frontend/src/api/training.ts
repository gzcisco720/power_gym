import { request } from './client';

export interface Exercise {
  exerciseId: string;
  exerciseName?: string;
  sets: Array<{ targetReps?: number; targetWeight?: number }>;
}

export interface SessionSet {
  exerciseId: string;
  setIndex: number;
  weight: number | null;
  reps: number | null;
  completed: boolean;
}

export interface PlanTemplate {
  _id: string;
  name: string;
  description: string | null;
  createdBy: string;
  days: Array<{ dayNumber: number; name?: string; exercises: Exercise[] }>;
}

export interface MemberPlan {
  _id: string;
  memberId: string;
  templateId: string;
  name: string;
  days: Array<{ dayNumber: number; name?: string; exercises: Exercise[] }>;
  isActive: boolean;
  assignedAt: string;
}

export interface WorkoutSession {
  _id: string;
  memberId: string;
  memberPlanId: string;
  dayNumber: number;
  completedAt: string | null;
  sets: SessionSet[];
}

export interface PersonalBest {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimatedOneRepMax: number;
  loggedAt: string;
}

export const fetchPlanTemplates = () =>
  request<PlanTemplate[]>('/api/v1/plan-templates');

export const createPlanTemplate = (data: { name: string; description?: string }) =>
  request<PlanTemplate>('/api/v1/plan-templates', { method: 'POST', body: JSON.stringify(data) });

export const updatePlanTemplate = (id: string, data: Partial<PlanTemplate>) =>
  request<PlanTemplate>(`/api/v1/plan-templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deletePlanTemplate = (id: string) =>
  request<void>(`/api/v1/plan-templates/${id}`, { method: 'DELETE' });

export const fetchMemberPlan = (memberId: string) =>
  request<MemberPlan | null>(`/api/v1/members/${memberId}/plan`);

export const assignPlan = (memberId: string, planTemplateId: string) =>
  request<MemberPlan>(`/api/v1/members/${memberId}/plan`, { method: 'POST', body: JSON.stringify({ templateId: planTemplateId }) });

export const startSession = (memberId: string, memberPlanId: string, dayNumber: number) =>
  request<WorkoutSession>('/api/v1/sessions', { method: 'POST', body: JSON.stringify({ memberId, memberPlanId, dayNumber }) });

export const fetchSessions = (memberId: string) =>
  request<WorkoutSession[]>(`/api/v1/sessions?memberId=${memberId}`);

export const getSession = (id: string) =>
  request<WorkoutSession>(`/api/v1/sessions/${id}`);

export const updateSet = (sessionId: string, setIndex: number, data: { weight?: number; reps?: number; completed?: boolean }) =>
  request<WorkoutSession>(`/api/v1/sessions/${sessionId}/sets/${setIndex}`, { method: 'PATCH', body: JSON.stringify(data) });

export const completeSession = (id: string) =>
  request<WorkoutSession>(`/api/v1/sessions/${id}/complete`, { method: 'POST' });

export const fetchPbs = (memberId: string) =>
  request<PersonalBest[]>(`/api/v1/members/${memberId}/pbs`);
