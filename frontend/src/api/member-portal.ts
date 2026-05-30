import { request } from './client';

const BASE = '/api/v1';

// ─── Dashboard types ──────────────────────────────────────────────────────────

export interface DashboardKpis {
  sessionsThisMonth: number;
  activeStreak: number;
  weightKg: string;
  weightDelta: number | null;
  weightImproved: boolean;
  bfPct: string;
  bfDelta: number | null;
  bfImproved: boolean;
  topPrName: string;
  topPrKg: string;
  isNewPr: boolean;
}

export interface UpcomingSessionItem {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  memberCount: number;
}

export interface NutritionToday {
  protein: number;
  carbs: number;
  fat: number;
  kcal: number;
  dayTypeName: string;
}

export interface DashboardResponse {
  kpis: DashboardKpis;
  upcomingSessions: UpcomingSessionItem[];
  nutritionToday: NutritionToday | null;
  activePlan: { name: string; dayCount: number } | null;
}

// ─── Journey types ────────────────────────────────────────────────────────────

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

export interface JourneyBodyTest {
  id: string;
  date: string;
  testNumber: number;
  bodyFatPct: number;
  weight: number;
  leanMassKg: number;
  fatMassKg: number;
  deltaBodyFatPct: number | null;
  deltaWeight: number | null;
}

export interface JourneyItem {
  bodyTest: JourneyBodyTest;
  checkInPhoto: string | null;
  milestone: MilestoneInfo | null;
}

export interface JourneySummary {
  totalTests: number;
  firstTestDate: string;
  firstBodyFatPct: number;
  firstWeight: number;
  firstLeanMassKg: number;
  latestBodyFatPct: number;
  latestWeight: number;
  latestLeanMassKg: number;
  leanMassDeltaKg: number;
}

export interface JourneyResponse {
  items: JourneyItem[];
  nextCursor: string | null;
  summary: JourneySummary | null;
}

// ─── API functions ────────────────────────────────────────────────────────────

// ─── Member plan types ────────────────────────────────────────────────────────

export interface MemberActivePlanExercise {
  groupId: string;
  isSuperset: boolean;
  exerciseId: string;
  exerciseName: string;
  isBodyweight: boolean;
  sets: number;
  repsMin: number;
  repsMax: number;
}

export interface MemberActivePlanDay {
  dayNumber: number;
  name: string;
  exercises: MemberActivePlanExercise[];
}

export interface MemberActivePlan {
  _id: string;
  templateId: string;
  name: string;
  days: MemberActivePlanDay[];
}

// ─── API functions ────────────────────────────────────────────────────────────

export function fetchDashboard(): Promise<DashboardResponse> {
  return request<DashboardResponse>(`${BASE}/me/dashboard`);
}

export function fetchMemberActivePlan(): Promise<MemberActivePlan | null> {
  return request<MemberActivePlan | null>(`${BASE}/me/member-plan`);
}

export function fetchJourney(memberId: string, cursor?: string): Promise<JourneyResponse> {
  const url = new URL(`${BASE}/members/${memberId}/journey`, window.location.origin);
  if (cursor) url.searchParams.set('cursor', cursor);
  return request<JourneyResponse>(url.pathname + url.search);
}
