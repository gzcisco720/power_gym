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

export function fetchMemberNutritionPlan(memberId: string): Promise<ActiveNutritionPlan | null> {
  return safeRequest<ActiveNutritionPlan>(`${BASE}/members/${memberId}/nutrition`);
}

// ─── Body Tests ───────────────────────────────────────────────────────────────

export interface BodyTestRecord {
  _id: string;
  date: string;
  protocol: '3site' | '7site' | '9site' | 'other';
  weight: number;
  bodyFatPct: number;
  leanMassKg: number;
  fatMassKg: number;
  targetWeight: number | null;
  targetBodyFatPct: number | null;
}

export function fetchMemberBodyTests(memberId: string): Promise<BodyTestRecord[]> {
  return request<BodyTestRecord[]>(`${BASE}/members/${memberId}/body-tests`);
}

export function createBodyTest(memberId: string, payload: Record<string, number | string | null>): Promise<BodyTestRecord> {
  return request<BodyTestRecord>(`${BASE}/members/${memberId}/body-tests`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteBodyTest(memberId: string, testId: string): Promise<void> {
  return requestVoid(`${BASE}/members/${memberId}/body-tests/${testId}`, { method: 'DELETE' });
}

// ─── Health ───────────────────────────────────────────────────────────────────

export interface SerializedInjury {
  _id: string;
  title: string;
  status: 'active' | 'resolved';
  recordedAt: string;
  resolvedAt: string | null;
  trainerNotes: string | null;
  memberNotes: string | null;
  affectedMovements: string | null;
  injuryType: 'acute' | 'chronic' | 'post_surgery' | null;
  bodyPart: 'knee' | 'shoulder' | 'lower_back' | 'hip' | 'ankle' | 'wrist' | 'neck' | 'other' | null;
  bodySide: 'left' | 'right' | 'bilateral' | null;
  painAtRest: number | null;
  painDuringExercise: number | null;
  mechanism: string | null;
  aggravatingFactors: string | null;
  relievingFactors: string | null;
  doctorRestrictions: string | null;
  rehabilitationStatus: 'not_started' | 'in_progress' | 'cleared' | null;
  seenDoctor: boolean;
  createdByRole: 'trainer' | 'member';
}

export interface SerializedMedication {
  _id: string;
  name: string;
  purpose: string;
  duration: 'long_term' | 'short_term';
  startDate: string;
  endDate: string | null;
  notes: string | null;
  status: 'active' | 'ended';
  createdAt: string;
}

export interface SerializedMedicalHistory {
  _id: string;
  chronicConditions: string[];
  surgeries: string | null;
  allergies: string | null;
  familyHistory: string | null;
  currentDoctor: string | null;
  emergencyContact: string | null;
  pregnancyStatus: 'n/a' | 'not_pregnant' | 'pregnant' | 'postpartum' | null;
  updatedAt: string;
}

export interface MemberHealthData {
  injuries: SerializedInjury[];
  medications: SerializedMedication[];
  medicalHistory: SerializedMedicalHistory | null;
}

export async function fetchMemberHealth(memberId: string): Promise<MemberHealthData> {
  const [injuries, medications, medicalHistory] = await Promise.all([
    request<SerializedInjury[]>(`${BASE}/members/${memberId}/injuries`),
    request<SerializedMedication[]>(`${BASE}/members/${memberId}/medications`),
    safeRequest<SerializedMedicalHistory>(`${BASE}/members/${memberId}/medical-history`),
  ]);
  return { injuries, medications, medicalHistory: medicalHistory ?? null };
}

export type InjuryPayload = {
  title: string;
  injuryType?: string | null;
  bodyPart?: string | null;
  bodySide?: string | null;
  affectedMovements?: string | null;
  doctorRestrictions?: string | null;
  rehabilitationStatus?: string | null;
  trainerNotes?: string | null;
};

export function createInjury(memberId: string, payload: InjuryPayload): Promise<SerializedInjury> {
  return request<SerializedInjury>(`${BASE}/members/${memberId}/injuries`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateInjury(memberId: string, injuryId: string, payload: Partial<InjuryPayload> & { status?: 'active' | 'resolved'; memberNotes?: string | null }): Promise<SerializedInjury> {
  return request<SerializedInjury>(`${BASE}/members/${memberId}/injuries/${injuryId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteInjury(memberId: string, injuryId: string): Promise<void> {
  return requestVoid(`${BASE}/members/${memberId}/injuries/${injuryId}`, { method: 'DELETE' });
}

// ─── Check-ins ────────────────────────────────────────────────────────────────

export interface CheckInRecord {
  _id: string;
  submittedAt: string;
  sleepQuality: number;
  stress: number;
  fatigue: number;
  hunger: number;
  recovery: number;
  energy: number;
  digestion: number;
  weight: number | null;
  stuckToDiet: 'yes' | 'no' | 'partial';
  photos: string[];
}

export interface CheckInConfig {
  dayOfWeek: number;
  hour: number;
  minute: number;
  active: boolean;
}

export async function fetchMemberCheckIns(memberId: string): Promise<{ checkIns: CheckInRecord[]; config: CheckInConfig | null }> {
  const [checkIns, config] = await Promise.all([
    request<CheckInRecord[]>(`${BASE}/check-ins?memberId=${memberId}`),
    safeRequest<CheckInConfig>(`${BASE}/check-in-config?memberId=${memberId}`),
  ]);
  return { checkIns, config: config ?? null };
}

export function upsertCheckInConfig(memberId: string, data: CheckInConfig): Promise<void> {
  return requestVoid(`${BASE}/check-in-config`, {
    method: 'PUT',
    body: JSON.stringify({ memberId, ...data }),
  });
}

// ─── Progress ─────────────────────────────────────────────────────────────────

export interface ExerciseOption {
  exerciseId: string;
  exerciseName: string;
}

export interface ProgressPoint {
  date: string;
  estimatedOneRM: number;
}

export interface MemberProgressData {
  exercises: ExerciseOption[];
  heatmapData: { date: string }[];
}

export async function fetchMemberProgress(memberId: string): Promise<MemberProgressData> {
  const data = await safeRequest<{ exercises: ExerciseOption[]; heatmapData: { date: string }[] }>(`${BASE}/progress/${memberId}`);
  return {
    exercises: data?.exercises ?? [],
    heatmapData: data?.heatmapData ?? [],
  };
}

export function fetchExerciseHistory(memberId: string, exerciseId: string): Promise<{ history: ProgressPoint[] }> {
  return request<{ history: ProgressPoint[] }>(`${BASE}/progress/${memberId}?exerciseId=${exerciseId}`);
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
