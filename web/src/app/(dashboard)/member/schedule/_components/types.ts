export interface SessionDto {
  _id: string;
  date: string;       // ISO string
  startTime: string;  // "HH:MM"
  endTime: string;    // "HH:MM"
  trainerName: string;
  memberCount: number;
  status: 'scheduled' | 'cancelled';
  isRecurring: boolean;
}
