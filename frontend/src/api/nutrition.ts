import { request } from './client';

export interface Food {
  _id: string;
  name: string;
  brand: string | null;
  macrosPer100g: { kcal: number; protein: number; carbs: number; fat: number };
  servings: Array<{ label: string; grams: number }>;
}

export interface NutritionMealItem {
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  salt?: number;
}

export interface NutritionMeal {
  name: string;
  order: number;
  items: NutritionMealItem[];
}

export interface NutritionTemplate {
  _id: string;
  name: string;
  description: string | null;
  createdBy: string;
  dayTypes: Array<{ name: string; meals: NutritionMeal[] }>;
}

export interface MemberNutritionPlan {
  _id: string;
  memberId: string;
  nutritionTemplateId: string;
  nutritionTemplate: NutritionTemplate;
}

export const fetchNutritionTemplates = () =>
  request<NutritionTemplate[]>('/api/v1/nutrition-templates');

export const createNutritionTemplate = (data: { name: string; description?: string }) =>
  request<NutritionTemplate>('/api/v1/nutrition-templates', { method: 'POST', body: JSON.stringify({ dayTypes: [], ...data }) });

export const fetchFoods = (q?: string) =>
  request<Food[]>(`/api/v1/foods${q ? `?q=${encodeURIComponent(q)}` : ''}`);

export const createFood = (data: Partial<Food>) =>
  request<Food>('/api/v1/foods', { method: 'POST', body: JSON.stringify(data) });

export const searchFoods = (q: string) =>
  request<Food[]>(`/api/v1/food-search?q=${encodeURIComponent(q)}`);

export const updateNutritionTemplate = (id: string, data: Partial<NutritionTemplate>) =>
  request<NutritionTemplate>(`/api/v1/nutrition-templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteNutritionTemplate = (id: string) =>
  request<void>(`/api/v1/nutrition-templates/${id}`, { method: 'DELETE' });

export const updateFood = (id: string, data: Partial<Food>) =>
  request<Food>(`/api/v1/foods/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteFood = (id: string) =>
  request<void>(`/api/v1/foods/${id}`, { method: 'DELETE' });

export const fetchMemberNutritionPlan = (memberId: string) =>
  request<MemberNutritionPlan | null>(`/api/v1/members/${memberId}/nutrition`);

export const assignNutritionPlan = (memberId: string, nutritionTemplateId: string) =>
  request<MemberNutritionPlan>(`/api/v1/members/${memberId}/nutrition`, { method: 'PUT', body: JSON.stringify({ nutritionTemplateId }) });
