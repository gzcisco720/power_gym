import { apiClient } from './client';
import {
  TrainerListItem,
  TrainerDetail,
  TrainerMemberMetrics,
  TrainerSessionItem,
  TrainerTemplateItem,
} from '../../types/trainers';

export async function fetchTrainers(): Promise<TrainerListItem[]> {
  const response = await apiClient.get<TrainerListItem[]>('/trainers');
  return response.data;
}

export async function fetchTrainerDetail(id: string): Promise<TrainerDetail> {
  const response = await apiClient.get<TrainerDetail>(`/trainers/${id}`);
  return response.data;
}

export async function fetchTrainerMembers(id: string): Promise<TrainerMemberMetrics[]> {
  const response = await apiClient.get<TrainerMemberMetrics[]>(`/trainers/${id}/members`);
  return response.data;
}

export async function fetchTrainerSessions(id: string): Promise<TrainerSessionItem[]> {
  const response = await apiClient.get<TrainerSessionItem[]>(`/trainers/${id}/sessions`);
  return response.data;
}

export async function fetchTrainerTrainingPlans(id: string): Promise<TrainerTemplateItem[]> {
  const response = await apiClient.get<TrainerTemplateItem[]>(`/trainers/${id}/training-plans`);
  return response.data;
}

export async function fetchTrainerNutritionPlans(id: string): Promise<TrainerTemplateItem[]> {
  const response = await apiClient.get<TrainerTemplateItem[]>(`/trainers/${id}/nutrition-plans`);
  return response.data;
}

export async function reassignMember(
  currentTrainerId: string,
  memberId: string,
  targetTrainerId: string,
): Promise<void> {
  await apiClient.patch(`/trainers/${currentTrainerId}/members/${memberId}/reassign`, {
    trainerId: targetTrainerId,
  });
}
