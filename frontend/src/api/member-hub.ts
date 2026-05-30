import { request, requestVoid } from './client';
import type { PlanListItem } from './plans';
import type { NutritionTemplateListItem } from './nutrition-templates';

const BASE = '/api/v1';

// ─── Profile ─────────────────────────────────────────────────────────────────

export interface MemberProfile {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

// ─── Stat Strip ──────────────────────────────────────────────────────────────

export interface StatStrip {
  weight: number | null;
  bodyFatPct: number | null;
  sessionsLast90: number;
  lastSessionLabel: string;
  lastDayName: string | null;
  weightDelta: { text: string; variant: 'success' | 'warning' | 'neutral' } | null;
  bfDelta: { text: string; variant: 'success' | 'warning' | 'neutral' } | null;
}

// ─── Plan card ───────────────────────────────────────────────────────────────

export interface PlanCard {
  _id: string;
  name: string;
  days: { dayNumber: number; name: string; exercises: unknown[] }[];
  assignedAt: string;
  recentSessions: { dayName: string; completedAt: string }[];
}

// ─── Health summary ──────────────────────────────────────────────────────────

export interface HealthSummary {
  injuries: { _id: string; title: string; affectedMovements: string | null }[];
  activeMeds: { _id: string; name: string; purpose: string; duration: string; startDate: string }[];
}

// ─── Overview (aggregated client-side) ───────────────────────────────────────

export interface MemberOverviewResponse {
  profile: MemberProfile;
  statStrip: StatStrip;
  planCard: PlanCard | null;
  healthSummary: HealthSummary;
}

interface RawBodyTest {
  _id: string;
  weight: number;
  bodyFatPct: number;
  date: string;
}

interface RawMemberPlan {
  _id: string;
  name: string;
  days: { dayNumber: number; name: string; exercises: unknown[] }[];
  assignedAt: string;
}

interface RawInjury {
  _id: string;
  title: string;
  affectedMovements?: string | null;
  status: string;
}

interface RawMedication {
  _id: string;
  name: string;
  purpose: string;
  duration: string;
  startDate: string;
  status: string;
}

interface RawProfileResponse {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
  profile: Record<string, unknown> | null;
}

function formatDelta(value: number, unit: string): { text: string; variant: 'success' | 'warning' | 'neutral' } {
  if (value === 0) return { text: `= 0.0 ${unit}`, variant: 'neutral' };
  const abs = Math.abs(value).toFixed(1);
  const down = value < 0;
  return { text: `${down ? '▼' : '▲'} ${abs} ${unit}`, variant: down ? 'success' : 'neutral' };
}

function formatBfDelta(value: number): { text: string; variant: 'success' | 'warning' | 'neutral' } {
  if (value === 0) return { text: '= 0.0%', variant: 'neutral' };
  const abs = Math.abs(value).toFixed(1);
  const down = value < 0;
  return { text: `${down ? '▼' : '▲'} ${abs}%`, variant: down ? 'success' : 'warning' };
}

async function safeRequest<T>(url: string): Promise<T | null> {
  try {
    return await request<T>(url);
  } catch {
    return null;
  }
}

export async function fetchMemberOverview(memberId: string): Promise<MemberOverviewResponse> {
  const [profileRaw, planRaw, bodyTestsRaw, injuriesRaw, medsRaw] = await Promise.all([
    safeRequest<RawProfileResponse>(`${BASE}/members/${memberId}/profile`),
    safeRequest<RawMemberPlan>(`${BASE}/members/${memberId}/plan`),
    safeRequest<RawBodyTest[]>(`${BASE}/members/${memberId}/body-tests`),
    safeRequest<RawInjury[]>(`${BASE}/members/${memberId}/injuries`),
    safeRequest<RawMedication[]>(`${BASE}/members/${memberId}/medications`),
  ]);

  // Build profile
  const profile: MemberProfile = {
    _id: profileRaw?._id ?? memberId,
    name: profileRaw?.name ?? 'Member',
    email: profileRaw?.email ?? '',
    createdAt: profileRaw?.createdAt ?? new Date().toISOString(),
  };

  // Build stat strip from body tests (sorted newest first)
  const tests = (bodyTestsRaw ?? []) as RawBodyTest[];
  const latest = tests[0] ?? null;
  const previous = tests[1] ?? null;

  const weightDelta = latest && previous
    ? formatDelta(latest.weight - previous.weight, 'kg')
    : null;
  const bfDelta = latest && previous
    ? formatBfDelta(latest.bodyFatPct - previous.bodyFatPct)
    : null;

  const statStrip: StatStrip = {
    weight: latest?.weight ?? null,
    bodyFatPct: latest?.bodyFatPct ?? null,
    sessionsLast90: 0,
    lastSessionLabel: '—',
    lastDayName: null,
    weightDelta,
    bfDelta,
  };

  // Build plan card
  let planCard: PlanCard | null = null;
  if (planRaw) {
    planCard = {
      _id: planRaw._id,
      name: planRaw.name,
      days: planRaw.days,
      assignedAt: planRaw.assignedAt,
      recentSessions: [],
    };
  }

  // Build health summary
  const injuries = ((injuriesRaw ?? []) as RawInjury[])
    .filter((i) => i.status === 'active')
    .map((i) => ({ _id: i._id, title: i.title, affectedMovements: i.affectedMovements ?? null }));

  const activeMeds = ((medsRaw ?? []) as RawMedication[])
    .filter((m) => m.status === 'active')
    .map((m) => ({ _id: m._id, name: m.name, purpose: m.purpose, duration: m.duration, startDate: m.startDate }));

  const healthSummary: HealthSummary = { injuries, activeMeds };

  return { profile, statStrip, planCard, healthSummary };
}

// ─── Plan tab data ────────────────────────────────────────────────────────────

export interface PlanPB {
  exerciseId: string;
  exerciseName: string;
  bestWeight: number;
  bestReps: number;
  estimatedOneRM: number;
}

export interface SessionSummary {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  exerciseCount: number;
  setCount: number;
  totalVolume: number;
}

export interface ActivePlan {
  _id: string;
  name: string;
  days: { dayNumber: number; name: string; exercises: unknown[] }[];
  assignedAt: string;
}

export interface PlanTemplate {
  _id: string;
  name: string;
}

export interface MemberPlanData {
  active: ActivePlan | null;
  templates: PlanTemplate[];
  sessions: SessionSummary[];
  pbs: PlanPB[];
}

export async function fetchMemberPlan(memberId: string): Promise<MemberPlanData> {
  const [activeRaw, pbsRaw, templatesRaw] = await Promise.all([
    safeRequest<ActivePlan>(`${BASE}/members/${memberId}/plan`),
    safeRequest<PlanPB[]>(`${BASE}/members/${memberId}/pbs`),
    safeRequest<PlanListItem[]>(`${BASE}/plan-templates`),
  ]);

  return {
    active: activeRaw ?? null,
    templates: (templatesRaw ?? []).map((t) => ({ _id: t._id, name: t.name })),
    sessions: [],
    pbs: (pbsRaw ?? []) as PlanPB[],
  };
}

// ─── Nutrition tab data ───────────────────────────────────────────────────────

export interface DayTypeTarget {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecentLog {
  date: string;
  dayTypeName: string;
  dayCompleted: boolean;
  actualKcal: number;
  actualProtein: number;
  actualCarbs: number;
  actualFat: number;
}

export interface WeeklyPatternEntry {
  dayOfWeek: number;
  dayTypeName: string;
}

export interface CalendarOverride {
  date: string;
  dayTypeName: string;
}

export interface NutritionSchedule {
  weeklyPattern: WeeklyPatternEntry[];
  calendarOverrides: CalendarOverride[];
  iterate: boolean;
}

export interface DayType {
  name: string;
  meals: unknown[];
}

export interface ActiveNutritionPlan {
  _id: string;
  name: string;
  assignedAt: string;
  dayTypes: DayType[];
  schedule: NutritionSchedule;
  isActive: boolean;
}

export interface HistoryNutritionPlan {
  _id: string;
  name: string;
  assignedAt: string;
  dayTypes: { name: string }[];
  isActive: boolean;
}

export interface NutritionTemplate {
  _id: string;
  name: string;
}

export interface MemberNutritionData {
  active: ActiveNutritionPlan | null;
  history: HistoryNutritionPlan[];
  templates: NutritionTemplate[];
  recentLogs: RecentLog[];
  dayTypeTargets: Record<string, DayTypeTarget>;
}

export async function fetchMemberNutrition(memberId: string): Promise<MemberNutritionData> {
  const [activeRaw, historyRaw, templatesRaw] = await Promise.all([
    safeRequest<ActiveNutritionPlan>(`${BASE}/members/${memberId}/nutrition`),
    safeRequest<HistoryNutritionPlan[]>(`${BASE}/members/${memberId}/nutrition/history`),
    safeRequest<NutritionTemplateListItem[]>(`${BASE}/nutrition-templates`),
  ]);

  // Build dayTypeTargets from the active plan
  const dayTypeTargets: Record<string, DayTypeTarget> = {};
  if (activeRaw) {
    for (const dt of activeRaw.dayTypes) {
      let kcal = 0, protein = 0, carbs = 0, fat = 0;
      for (const meal of dt.meals as { items: { kcal: number; protein: number; carbs: number; fat: number }[] }[]) {
        for (const item of meal.items) {
          kcal += item.kcal;
          protein += item.protein;
          carbs += item.carbs;
          fat += item.fat;
        }
      }
      dayTypeTargets[dt.name] = { kcal: Math.round(kcal), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
    }
  }

  return {
    active: activeRaw ?? null,
    history: historyRaw ?? [],
    templates: (templatesRaw ?? []).map((t) => ({ _id: t._id, name: t.name })),
    recentLogs: [],
    dayTypeTargets,
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function assignPlan(memberId: string, templateId: string): Promise<void> {
  return requestVoid(`${BASE}/members/${memberId}/plan`, {
    method: 'POST',
    body: JSON.stringify({ templateId }),
  });
}

export function assignNutrition(memberId: string, templateId: string): Promise<void> {
  return requestVoid(`${BASE}/members/${memberId}/nutrition`, {
    method: 'POST',
    body: JSON.stringify({ templateId }),
  });
}

export function patchNutritionSchedule(memberId: string, schedule: NutritionSchedule): Promise<void> {
  return requestVoid(`${BASE}/members/${memberId}/nutrition/schedule`, {
    method: 'PATCH',
    body: JSON.stringify(schedule),
  });
}
