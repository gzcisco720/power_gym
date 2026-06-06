export interface Member {
  id: string;
  name: string;
  email: string;
  trainerId: string | null;
  trainerName: string | null;
}

export interface MemberOverview {
  joinedAt: string | null;
  lastBodyTestDate: string | null;
  lastCheckinDate: string | null;
}

export interface MemberOverviewStats {
  sessionsThisMonth: number;
  weight: { value: number; deltaKg: number } | null;
  bodyFat: { pct: number; deltaPct: number } | null;
  topPR: { exerciseName: string; estimatedOneRM: number } | null;
  activePlan: { name: string; dayCount: number } | null;
  activeInjuryCount: number;
  activeMedicationCount: number;
  weightTrend: { date: string; weight: number }[];
  heatmap: { date: string; count: number }[];
}
