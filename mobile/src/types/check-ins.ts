export type StuckToDiet = 'yes' | 'no' | 'partial';

export interface CheckIn {
  _id: string;
  memberId: string;
  trainerId: string;
  submittedAt: string; // ISO date string
  sleepQuality: number; // 1–10
  stress: number;
  fatigue: number;
  hunger: number;
  recovery: number;
  energy: number;
  digestion: number;
  weight: number | null;
  waist: number | null;
  steps: number | null;
  exerciseMinutes: number | null;
  walkRunDistance: number | null;
  sleepHours: number | null;
  stuckToDiet: StuckToDiet;
  dietDetails: string | null;
  wellbeing: string | null;
  notes: string | null;
  photos: string[];
  createdAt: string;
}

export interface CreateCheckInDto {
  sleepQuality: number;
  stress: number;
  fatigue: number;
  hunger: number;
  recovery: number;
  energy: number;
  digestion: number;
  stuckToDiet: StuckToDiet;
  weight?: number;
  waist?: number;
  steps?: number;
  exerciseMinutes?: number;
  walkRunDistance?: number;
  sleepHours?: number;
  dietDetails?: string;
  wellbeing?: string;
  notes?: string;
  photos?: string[];
}
