export interface JourneySummary {
  totalTests: number;
  firstTestDate: string;       // ISO string
  firstBodyFatPct: number;
  firstWeight: number;
  firstLeanMassKg: number;
  latestBodyFatPct: number;
  latestWeight: number;
  latestLeanMassKg: number;
  leanMassDeltaKg: number;     // latestLeanMassKg - firstLeanMassKg
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
  photos: string[];            // up to 3 check-in photo URLs
}

export interface JourneyBodyTest {
  id: string;
  date: string;                // ISO string
  testNumber: number;          // 1-indexed, ascending by date
  bodyFatPct: number;
  weight: number;
  leanMassKg: number;
  fatMassKg: number;
  deltaBodyFatPct: number | null;   // vs previous test; null for first test
  deltaWeight: number | null;
}

export interface JourneyItem {
  bodyTest: JourneyBodyTest;
  checkInPhoto: string | null; // URL of nearest check-in photo within ±14 days
  milestone: MilestoneInfo | null;
}

export interface JourneyResponse {
  items: JourneyItem[];
  nextCursor: string | null;   // ISO date string; null when no more pages
  summary: JourneySummary | null;  // null only when totalTests === 0
}
