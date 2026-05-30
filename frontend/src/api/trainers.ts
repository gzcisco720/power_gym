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

export function fetchTrainers(): Promise<TrainerListItem[]> {
  return request<TrainerListItem[]>(`${BASE}/owner/trainers`);
}

export function fetchTrainerById(id: string): Promise<TrainerDetail> {
  return request<TrainerDetail>(`${BASE}/owner/trainers/${id}`);
}
