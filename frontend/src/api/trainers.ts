import { request } from './client';

const BASE = '/api/v1';

export interface TrainerListItem {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  memberCount: number;
  sessionsThisMonth: number;
}

export interface TrainerDetail extends TrainerListItem {
  templateCount: number;
}

export interface TrainerMemberItem {
  _id: string;
  name: string;
  email: string;
  trainerId: string | null;
  streak: number;
  sessionsThisMonth: number;
  status: 'active' | 'needs-attn' | 'no-plan';
}

export interface TrainerPlanItem {
  _id: string;
  name: string;
  daysCount: number;
  createdAt: string;
}

export interface TrainerNutritionPlanItem {
  _id: string;
  name: string;
  dayTypesCount: number;
  createdAt: string;
}

export function fetchTrainers(): Promise<TrainerListItem[]> {
  return request<TrainerListItem[]>(`${BASE}/owner/trainers`);
}

export function fetchTrainerById(id: string): Promise<TrainerDetail> {
  return request<TrainerDetail>(`${BASE}/owner/trainers/${id}`);
}

export function fetchTrainerMembers(id: string): Promise<TrainerMemberItem[]> {
  return request<TrainerMemberItem[]>(`${BASE}/owner/trainers/${id}/members`);
}

export function fetchTrainerPlans(id: string): Promise<TrainerPlanItem[]> {
  return request<TrainerPlanItem[]>(`${BASE}/owner/trainers/${id}/training-plans`);
}

export function fetchTrainerNutritionPlans(id: string): Promise<TrainerNutritionPlanItem[]> {
  return request<TrainerNutritionPlanItem[]>(`${BASE}/owner/trainers/${id}/nutrition-plans`);
}
