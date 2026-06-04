// Core macro fields carried on every logged/prescribed food item.
export interface MacroFields {
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

export interface MealItem extends MacroFields {
  foodName: string;
  quantityG: number;
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

// GET /nutrition/my-plan → null when no active plan assigned.
export interface ActiveNutritionPlan {
  _id: string;
  name: string;
  templateId: string | null;
  assignedAt: string; // ISO
  dayTypes: DayType[];
  todayDayTypeName: string;
}

// One logged meal in NutritionDailyLog.
export interface DailyLogMeal {
  name: string;
  order: number;
  items: MealItem[];
}

// GET /nutrition/today and return of POST /nutrition/today/log.
export interface NutritionDailyLog {
  _id: string;
  memberId: string;
  planId: string;
  date: string; // YYYY-MM-DD
  dayTypeName: string;
  meals: DailyLogMeal[];
}

export interface MacroTotals {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

// GET /nutrition/today/summary
export interface MacroSummary {
  logged: MacroTotals;
  target: MacroTotals;
}

// POST /nutrition/today/log body
export interface LogFoodInput {
  mealName: string;
  foodName: string;
  quantityG: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

// POST /nutrition/members/:memberId/assign-plan body
export interface AssignNutritionPlanInput {
  templateId: string;
}
