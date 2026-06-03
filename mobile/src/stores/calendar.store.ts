import { create } from 'zustand';
import {
  fetchStaffSessions,
  createSession,
  updateSession,
  deleteSession,
} from '../lib/api/scheduled-sessions.api';
import { StaffSession, CreateSessionInput, UpdateSessionInput } from '../types/scheduled-sessions';

interface DayGroup {
  dateLabel: string;
  isoDate: string;
  sessions: StaffSession[];
}

interface CalendarState {
  items: StaffSession[];
  loading: boolean;
  error: string | null;
  range: 'upcoming' | 'past';
  fetch(range?: 'upcoming' | 'past'): Promise<void>;
  groupedByDay(): DayGroup[];
  create(dto: CreateSessionInput): Promise<void>;
  update(id: string, dto: UpdateSessionInput): Promise<void>;
  remove(id: string, scope: 'single' | 'series'): Promise<void>;
}

function toIsoDate(dateString: string): string {
  return dateString.slice(0, 10);
}

function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  range: 'upcoming',

  async fetch(range?: 'upcoming' | 'past'): Promise<void> {
    const effectiveRange = range ?? get().range;
    set({ loading: true, error: null, range: effectiveRange });
    try {
      const items = await fetchStaffSessions(effectiveRange);
      set({ items, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ loading: false, error: message });
    }
  },

  groupedByDay(): DayGroup[] {
    const { items } = get();
    const map = new Map<string, StaffSession[]>();

    for (const session of items) {
      const isoDate = toIsoDate(session.date);
      const existing = map.get(isoDate);
      if (existing) {
        existing.push(session);
      } else {
        map.set(isoDate, [session]);
      }
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([isoDate, sessions]) => ({
        isoDate,
        dateLabel: formatDateLabel(isoDate),
        sessions,
      }));
  },

  async create(dto: CreateSessionInput): Promise<void> {
    try {
      await createSession(dto);
      await get().fetch(get().range);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message });
    }
  },

  async update(id: string, dto: UpdateSessionInput): Promise<void> {
    try {
      await updateSession(id, dto);
      await get().fetch(get().range);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message });
    }
  },

  async remove(id: string, scope: 'single' | 'series'): Promise<void> {
    try {
      await deleteSession(id, scope);
      await get().fetch(get().range);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      set({ error: message });
    }
  },
}));
