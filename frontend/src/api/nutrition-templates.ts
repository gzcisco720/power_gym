import { request, requestVoid } from './client';

const BASE = '/api/v1';

export interface MealItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  salt?: number;
  saturated?: number;
  polyunsaturated?: number;
  monounsaturated?: number;
  polyols?: number;
  cholesterol?: number;
  sodium?: number;
  potassium?: number;
  transFat?: number;
}

export interface Meal {
  name: string;
  order: number;
  items: MealItem[];
}

export interface DayType {
  name: string;
  meals: Meal[];
}

export interface NutritionTemplateListItem {
  _id: string;
  name: string;
  description: string | null;
  dayTypeNames: string[];
  avgPerDay: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  createdAt: string;
}

export interface NutritionTemplateDetail {
  _id: string;
  name: string;
  description: string | null;
  dayTypes: DayType[];
  createdAt: string;
}

export interface NutritionTemplatePayload {
  name: string;
  description: string | null;
  dayTypes: DayType[];
}

export function fetchNutritionTemplates(): Promise<NutritionTemplateListItem[]> {
  return request<NutritionTemplateListItem[]>(`${BASE}/nutrition-templates`);
}

export function fetchNutritionTemplateById(id: string): Promise<NutritionTemplateDetail> {
  return request<NutritionTemplateDetail>(`${BASE}/nutrition-templates/${id}`);
}

export function createNutritionTemplate(payload: NutritionTemplatePayload): Promise<NutritionTemplateDetail> {
  return request<NutritionTemplateDetail>(`${BASE}/nutrition-templates`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateNutritionTemplate(id: string, payload: NutritionTemplatePayload): Promise<NutritionTemplateDetail> {
  return request<NutritionTemplateDetail>(`${BASE}/nutrition-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteNutritionTemplate(id: string): Promise<void> {
  return requestVoid(`${BASE}/nutrition-templates/${id}`, { method: 'DELETE' });
}
