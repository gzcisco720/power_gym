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
