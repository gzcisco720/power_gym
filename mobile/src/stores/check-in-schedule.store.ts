import { create } from 'zustand';
import {
  CheckInSchedule,
  UpdateCheckInScheduleDto,
  fetchCheckInSchedule,
  updateCheckInSchedule,
} from '../lib/api/check-in-schedule.api';

interface CheckInScheduleState {
  schedule: CheckInSchedule | null;
  loading: boolean;
  error: string | null;

  fetchSchedule(memberId: string): Promise<void>;
  saveSchedule(memberId: string, dto: UpdateCheckInScheduleDto): Promise<void>;
}

export const useCheckInScheduleStore = create<CheckInScheduleState>((set) => ({
  schedule: null,
  loading: false,
  error: null,

  async fetchSchedule(memberId: string): Promise<void> {
    set({ loading: true, error: null });
    try {
      const schedule = await fetchCheckInSchedule(memberId);
      set({ schedule, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  async saveSchedule(memberId: string, dto: UpdateCheckInScheduleDto): Promise<void> {
    set({ loading: true, error: null });
    try {
      const schedule = await updateCheckInSchedule(memberId, dto);
      set({ schedule, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },
}));
