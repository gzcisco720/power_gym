export interface TrainerListItem {
  id: string;
  name: string;
  email: string;
  memberCount: number;
}

export interface TrainerMember {
  id: string;
  name: string;
  email: string;
}

export interface TrainerDetailResponse {
  id: string;
  name: string;
  email: string;
  memberCount: number;
  joinDate: string; // ISO string from createdAt
  members: TrainerMember[];
}

export interface TrainerMemberMetrics {
  id: string;
  name: string;
  email: string;
  streak: number;
  sessionsThisMonth: number;
  status: 'active' | 'needs-attn' | 'no-plan';
}

export interface TrainerSessionItem {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  memberNames: string[];
  serviceTypeName: string | null;
  status: string;
}

export interface TrainerTemplateItem {
  id: string;
  name: string;
  dayCount: number;
  createdAt: string;
}

export type WeekDay = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface TrainerOverviewStats {
  memberCount: number;
  sessionsThisMonth: number;
  templateCount: number;
  activeMembersThisMonth: number;
  newPRsThisMonth: number;
  avgStreakDays: number;
  weeklySchedule: { day: WeekDay; count: number }[];
  sessionsTrend: { month: string; count: number }[];
}
