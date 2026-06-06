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

export interface TrainerMemberMetrics extends TrainerMember {
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

export interface TrainerDetail {
  id: string;
  name: string;
  email: string;
  memberCount: number;
  joinDate: string;
  members: TrainerMember[];
}
