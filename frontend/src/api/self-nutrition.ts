import { request, requestVoid } from '@/api/client';

const BASE = '/api/me/nutrition-logs';

export interface SelfMealItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  [key: string]: number | string;
}

export interface SelfMeal {
  name: string;
  order: number;
  completed: boolean;
  items: SelfMealItem[];
}

export interface SelfNutritionLog {
  date: string;
  sourceTemplateId: string | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  dayCompleted: boolean;
  meals: SelfMeal[];
}

export interface UpsertDayPayload {
  sourceTemplateId: string | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: SelfMeal[];
  dayCompleted: boolean;
}

export async function fetchDay(date: string): Promise<SelfNutritionLog | null> {
  try {
    return await request<SelfNutritionLog | null>(`${BASE}/${date}`);
  } catch {
    return null;
  }
}

export async function upsertDay(
  date: string,
  payload: UpsertDayPayload,
): Promise<SelfNutritionLog> {
  return request<SelfNutritionLog>(`${BASE}/${date}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function fetchRecentLogs(year: number, month: number): Promise<SelfNutritionLog[]> {
  return request<SelfNutritionLog[]>(`${BASE}?year=${year}&month=${month}`);
}

export async function deleteDay(date: string): Promise<void> {
  return requestVoid(`${BASE}/${date}`, { method: 'DELETE' });
}
