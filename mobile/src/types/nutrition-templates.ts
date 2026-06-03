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

export interface Food {
  _id: string;
  name: string;
  brand: string | null;
  macrosPer100g: FoodMacros;
  servings: FoodServing[];
  createdBy: string;
  createdAt: string;
}

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

export interface NutritionTemplate {
  _id: string;
  name: string;
  description: string | null;
  createdBy: string;
  dayTypes: DayType[];
  createdAt: string;
}

export interface CreateNutritionTemplateDto {
  name: string;
  description?: string | null;
  dayTypes: DayType[];
}

export interface UpdateNutritionTemplateDto {
  name?: string;
  description?: string | null;
  dayTypes?: DayType[];
}

export interface CreateFoodDto {
  name: string;
  brand?: string | null;
  macrosPer100g: FoodMacros;
  servings?: FoodServing[];
}
