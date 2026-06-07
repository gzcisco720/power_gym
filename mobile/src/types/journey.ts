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

// ── Timeline ──────────────────────────────────────────────────────────────────

interface TimelineBase {
  id: string;
  date: string; // ISO string
}

export interface TimelineSessionCompleted extends TimelineBase {
  type: 'session_completed';
  dayName: string;
  completedSetCount: number;
}

export type MilestoneTagColor = 'gold' | 'green' | 'indigo';

export interface MilestoneTag {
  label: string;
  color: MilestoneTagColor;
}

export interface MilestoneInfo {
  emoji: string;
  title: string;
  tags: MilestoneTag[];
  photos: string[];
}

export interface TimelineBodyTest extends TimelineBase {
  type: 'body_test';
  testNumber: number;
  weight: number;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  deltaBodyFatPct: number | null;
  deltaWeight: number | null;
  milestone: MilestoneInfo | null;
}

export interface TimelineCheckIn extends TimelineBase {
  type: 'check_in';
  wellnessAvg: number;
}

export interface TimelineStreakMilestone extends TimelineBase {
  type: 'streak_milestone';
  days: number;
}

export interface TimelineJoined extends TimelineBase {
  type: 'joined';
}

export type JourneyTimelineItem =
  | TimelineSessionCompleted
  | TimelineBodyTest
  | TimelineCheckIn
  | TimelineStreakMilestone
  | TimelineJoined;

// GET /journey/timeline response.
export interface JourneyTimelinePage {
  items: JourneyTimelineItem[];
  nextCursor: string | null;
}
