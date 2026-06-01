// ─── Trainer Dashboard ───────────────────────────────────────────────────────

export interface TrainerDashboardStats {
  memberCount: number;
  sessionsTodayCount: number;
  checkinsLast7Days: number;
  needsAttentionCount: number;
}

export interface TrainerSession {
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

export interface ComplianceItem {
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

export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface ThisWeekEntry {
  day: WeekDay;
  count: number;
  isToday: boolean;
}

export interface TrainerMyTraining {
  streakDays: number;
  lastSessionType: string | null;
  lastSessionDate: string | null;
  last14Days: boolean[];
  sessionsThisMonth: number;
}

export interface TrainerDashboardResponse {
  stats: TrainerDashboardStats;
  todaysSessions: TrainerSession[];
  needsAttention: NeedsAttentionItem[];
  pendingCheckins: PendingCheckin[];
  compliance: ComplianceItem[];
  recentPRs: RecentPR[];
  myTraining: TrainerMyTraining;
  thisWeek: ThisWeekEntry[];
}

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
