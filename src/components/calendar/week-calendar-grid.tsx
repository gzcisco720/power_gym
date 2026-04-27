'use client';

import { SessionEventCard } from './session-event-card';

const HOUR_START = 6;
const HOUR_END = 22;
const SLOT_HEIGHT = 48;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export interface CalendarSession {
  _id: string;
  seriesId: string | null;
  trainerId: string;
  memberIds: string[];
  date: string;
  startTime: string;
  endTime: string;
  status: 'scheduled' | 'cancelled';
  reminderSentAt: string | null;
}

interface WeekCalendarGridProps {
  weekStart: Date;
  sessions: CalendarSession[];
  memberMap: Record<string, string>;
  trainerColorMap: Record<string, string>;
  onSlotClick: (date: Date, time: string) => void;
  onSessionClick: (session: CalendarSession) => void;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getTopPx(startTime: string): number {
  return ((timeToMinutes(startTime) - HOUR_START * 60) / 30) * SLOT_HEIGHT;
}

function getHeightPx(startTime: string, endTime: string): number {
  return ((timeToMinutes(endTime) - timeToMinutes(startTime)) / 30) * SLOT_HEIGHT;
}

const TRAINER_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
];

function trainerColorFallback(
  trainerId: string,
  trainerColorMap: Record<string, string>,
): string {
  const idx = parseInt(trainerId.slice(-2), 16) % TRAINER_COLORS.length;
  return trainerColorMap[trainerId] ?? TRAINER_COLORS[idx];
}

export function WeekCalendarGrid({
  weekStart,
  sessions,
  memberMap,
  trainerColorMap,
  onSlotClick,
  onSessionClick,
}: WeekCalendarGridProps) {
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const totalHeight = (HOUR_END - HOUR_START) * 2 * SLOT_HEIGHT;

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const sessionsByDay = days.map((day) => {
    const iso = day.toISOString().slice(0, 10);
    return sessions.filter((s) => s.date.slice(0, 10) === iso && s.status === 'scheduled');
  });

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Header row */}
      <div className="flex border-b border-[#1e1e2e] sticky top-0 bg-[#0c0c0c] z-10">
        <div className="w-14 flex-shrink-0" />
        {days.map((day, i) => (
          <div key={i} className="flex-1 text-center py-2 text-xs text-[#555]">
            <div>{DAYS[i]}</div>
            <div className="text-white font-semibold">{day.getDate()}</div>
          </div>
        ))}
      </div>

      {/* Grid body */}
      <div className="flex flex-1" style={{ height: totalHeight }}>
        {/* Time labels */}
        <div className="w-14 flex-shrink-0 relative">
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-2 text-[10px] text-[#555] -translate-y-2"
              style={{ top: (h - HOUR_START) * 2 * SLOT_HEIGHT }}
            >
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, di) => (
          <div key={di} className="flex-1 relative border-l border-[#1a1a2e]">
            {/* Slot click areas */}
            {Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, si) => {
              const totalMin = HOUR_START * 60 + si * 30;
              const hh = Math.floor(totalMin / 60);
              const mm = totalMin % 60;
              const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
              return (
                <div
                  key={si}
                  className="absolute inset-x-0 border-t border-[#111] cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ top: si * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                  onClick={() => onSlotClick(day, time)}
                />
              );
            })}

            {/* Events */}
            {sessionsByDay[di].map((s) => (
              <div
                key={s._id}
                className="absolute inset-x-0"
                style={{
                  top: getTopPx(s.startTime),
                  height: Math.max(getHeightPx(s.startTime, s.endTime), SLOT_HEIGHT),
                }}
              >
                <SessionEventCard
                  memberNames={s.memberIds.map((id) => memberMap[id] ?? id)}
                  startTime={s.startTime}
                  endTime={s.endTime}
                  isRecurring={s.seriesId !== null}
                  trainerColor={trainerColorFallback(s.trainerId, trainerColorMap)}
                  onClick={() => onSessionClick(s)}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
