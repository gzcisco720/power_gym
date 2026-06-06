import { apiClient } from './client';
import { MemberProgress, ExerciseSessionHistory } from '../../types/member-progress';

export async function fetchMemberProgress(memberId: string): Promise<MemberProgress> {
  const response = await apiClient.get<MemberProgress>(`/training/members/${memberId}/progress`);
  return response.data;
}

export async function fetchExerciseHistory(
  memberId: string,
  exerciseId: string,
): Promise<ExerciseSessionHistory> {
  const response = await apiClient.get<ExerciseSessionHistory>(
    `/training/members/${memberId}/exercise/${exerciseId}`,
  );
  return response.data;
}
