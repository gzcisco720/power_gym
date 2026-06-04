// One finished session summary.
export interface JourneySessionSummary {
  _id: string;
  date: string; // ISO date of completedAt
  dayName: string;
  completedSetCount: number; // sets with completedAt !== null
}

// One day of nutrition adherence.
export interface JourneyNutritionDay {
  date: string; // 'YYYY-MM-DD'
  logged: boolean; // a NutritionDailyLog exists for that date
  loggedKcal: number; // sum across meals.items (0 if not logged)
  targetKcal: number; // 0 if no plan/day-type target resolvable
  targetMet: boolean; // targetKcal > 0 && loggedKcal >= targetKcal
}

// One body-test trend point.
export interface JourneyBodyTestPoint {
  _id: string;
  date: string; // ISO date
  weight: number;
  bodyFatPct: number;
}

// GET /journey response (full aggregate).
export interface JourneySummary {
  workoutStreak: number; // consecutive days with a finished session
  recentSessions: JourneySessionSummary[]; // up to 7, most recent first
  nutritionDays: JourneyNutritionDay[]; // exactly 7, oldest → newest
  bodyTests: JourneyBodyTestPoint[]; // up to 10, most recent first
}
