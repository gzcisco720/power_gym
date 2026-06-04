import { apiClient } from './client';
import {
  ActiveNutritionPlan,
  NutritionDailyLog,
  MacroSummary,
  LogFoodInput,
} from '../../types/nutrition';

export async function fetchMyNutritionPlan(): Promise<ActiveNutritionPlan | null> {
  const response = await apiClient.get<ActiveNutritionPlan | null>('/nutrition/my-plan');
  return response.data;
}

export async function fetchToday(): Promise<NutritionDailyLog> {
  const response = await apiClient.get<NutritionDailyLog>('/nutrition/today');
  return response.data;
}

export async function logFood(input: LogFoodInput): Promise<NutritionDailyLog> {
  const response = await apiClient.post<NutritionDailyLog>('/nutrition/today/log', input);
  return response.data;
}

export async function fetchTodaySummary(): Promise<MacroSummary> {
  const response = await apiClient.get<MacroSummary>('/nutrition/today/summary');
  return response.data;
}

export async function assignNutritionPlan(
  memberId: string,
  templateId: string,
): Promise<ActiveNutritionPlan> {
  const response = await apiClient.post<ActiveNutritionPlan>(
    `/nutrition/members/${memberId}/assign-plan`,
    { templateId },
  );
  return response.data;
}

export async function fetchMemberNutritionHistory(memberId: string): Promise<NutritionDailyLog[]> {
  const response = await apiClient.get<NutritionDailyLog[]>(`/nutrition/members/${memberId}/history`);
  return response.data;
}
