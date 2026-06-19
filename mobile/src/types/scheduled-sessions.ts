export interface ScheduledSession {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  trainerName: string;
  serviceTypeName: string | null;
  isRecurring: boolean;
}

export interface StaffSession {
  _id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  trainerId: string;
  trainerName: string;
  memberIds: string[];
  memberNames: string[];
  serviceTypeId: string | null;
  serviceTypeName: string | null;
  customServiceName: string | null;
  seriesId: string | null;
  isRecurring: boolean;
}

export interface CreateSessionInput {
  date: string;
  startTime: string;
  endTime: string;
  memberIds: string[];
  trainerId?: string;
  serviceTypeId?: string;
  customServiceName?: string;
  customFee?: number;
  recurrence?: { weeks: number };
}

export interface UpdateSessionInput {
  date?: string;
  startTime?: string;
  endTime?: string;
  memberIds?: string[];
  serviceTypeId?: string | null;
  customServiceName?: string | null;
  scope?: 'single' | 'series';
}
