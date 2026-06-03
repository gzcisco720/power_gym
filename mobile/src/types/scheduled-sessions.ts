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
