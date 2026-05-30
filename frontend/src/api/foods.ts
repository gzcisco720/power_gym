import { request, requestVoid } from './client';

const BASE = '/api/v1';

export interface FoodMacros {
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

export interface FoodServing {
  label: string;
  grams: number;
}

export interface FoodItem {
  _id: string;
  name: string;
  brand: string | null;
  macrosPer100g: FoodMacros;
  servings: FoodServing[];
}

export interface FoodPayload {
  name: string;
  brand: string | null;
  macrosPer100g: FoodMacros;
  servings: FoodServing[];
}

export function fetchFoods(q?: string): Promise<FoodItem[]> {
  const url = q?.trim()
    ? `${BASE}/foods?q=${encodeURIComponent(q.trim())}`
    : `${BASE}/foods`;
  return request<FoodItem[]>(url);
}

export function fetchFoodById(id: string): Promise<FoodItem> {
  return request<FoodItem>(`${BASE}/foods/${id}`);
}

export function createFood(payload: FoodPayload): Promise<FoodItem> {
  return request<FoodItem>(`${BASE}/foods`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateFood(id: string, payload: Partial<FoodPayload>): Promise<FoodItem> {
  return request<FoodItem>(`${BASE}/foods/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteFood(id: string): Promise<void> {
  return requestVoid(`${BASE}/foods/${id}`, { method: 'DELETE' });
}
