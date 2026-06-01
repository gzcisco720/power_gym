// ─── Owner Dashboard ─────────────────────────────────────────────────────────

export interface OwnerDashboardStats {
  trainerCount: number;
  memberCount: number;
  membersJoinedThisMonth: number;
  sessionsThisMonth: number;
  sessionsLastMonth: number;
  activeToday: number;
  checkinRateThisWeek: number;
  checkinRateLastWeek: number;
  pendingInviteCount: number;
  expiringInviteCount: number;
}

export interface MemberGrowthEntry {
  month: string;
  count: number;
}

export interface TrainerPerformanceEntry {
  trainerId: string;
  name: string;
  sessionCount: number;
  memberCount: number;
}

export interface EquipmentStatusItem {
  name: string;
  status: 'maintenance' | 'retired' | 'overdue';
  notes: string | null;
}

export interface EquipmentStatus {
  activeCount: number;
  maintenanceCount: number;
  retiredCount: number;
  overdueCount: number;
  nonActiveItems: EquipmentStatusItem[];
}

export interface OwnerDashboardResponse {
  stats: OwnerDashboardStats;
  memberGrowth: MemberGrowthEntry[];
  trainerPerformance: TrainerPerformanceEntry[];
  equipment: EquipmentStatus;
}

// ─── Trainer Dashboard ───────────────────────────────────────────────────────

export interface TrainerDashboardStats {
  memberCount: number;
  sessionsTodayCount: number;
  checkinsLast7Days: number;
  needsAttentionCount: number;
}

export interface TodaySession {
  memberId: string;
  memberName: string;
  planName: string | null;
  startTime: string;
  endTime: string;
  status: 'completed' | 'active' | 'upcoming';
}

export interface NeedsAttentionItem {
  memberId: string;
  memberName: string;
  alertType: 'idle' | 'no_plan' | 'no_nutrition' | 'body_test_overdue';
  detail: string;
}

export interface PendingCheckin {
  memberId: string;
  memberName: string;
  checkinId: string;
  createdAt: string;
}

export interface ComplianceEntry {
  memberId: string;
  memberName: string;
  percentage: number;
}

export interface RecentPR {
  memberId: string;
  memberName: string;
  exercise: string;
  estimatedOneRM: number;
}

export interface MyTraining {
  streakDays: number;
  lastSessionType: string | null;
  lastSessionDate: string | null;
  last14Days: boolean[];
  sessionsThisMonth: number;
}

export interface ThisWeekEntry {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  count: number;
  isToday: boolean;
}

export interface TrainerDashboardResponse {
  stats: TrainerDashboardStats;
  todaysSessions: TodaySession[];
  needsAttention: NeedsAttentionItem[];
  pendingCheckins: PendingCheckin[];
  compliance: ComplianceEntry[];
  recentPRs: RecentPR[];
  myTraining: MyTraining;
  thisWeek: ThisWeekEntry[];
}

// ─── Member Dashboard ────────────────────────────────────────────────────────

export interface MemberGreeting {
  firstName: string;
  streakDays: number;
}

export interface TodaysPlan {
  planName: string;
  dayType: string;
  exercises: { name: string }[];
  exerciseCount: number;
  setCount: number;
  estimatedMinutes: number;
  scheduledTime: string | null;
}

export interface MemberStats {
  sessionsThisMonth: number;
  latestWeight: number | null;
  previousWeight: number | null;
  latestBodyFat: number | null;
  previousBodyFat: number | null;
  topPR: { exercise: string; estimatedOneRM: number } | null;
  newPRThisMonth: boolean;
}

export interface BodyCompositionEntry {
  date: string;
  weight: number;
  bodyFat: number;
}

export interface StrengthProgress {
  exercises: string[];
  data: { date: string; estimatedOneRM: number }[];
}

export interface NutritionToday {
  dayType: string;
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
}

export interface UpcomingSession {
  datetime: string;
  type: 'individual' | 'group';
  groupSize: number | null;
  daysFromNow: number;
}

export interface MemberDashboardResponse {
  greeting: MemberGreeting;
  todaysPlan: TodaysPlan | null;
  stats: MemberStats;
  trainingHeatmap: boolean[];
  bodyComposition: BodyCompositionEntry[];
  strengthProgress: StrengthProgress;
  nutritionToday: NutritionToday | null;
  upcomingSessions: UpcomingSession[];
}
