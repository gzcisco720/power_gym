import { cn } from '@/lib/utils';

export interface SelfCalendarLog {
  _id: string;
  dayName: string;
  startedAt: string;
  completedAt: string | null;
  setCount: number;
  rpe: number | null;
}

interface Props {
  logs: SelfCalendarLog[];
  weekStart: Date;
  onEventClick: (logId: string) => void;
}

const HOUR_START = 5;
const HOUR_END = 23;
const SLOT_HEIGHT = 48;

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

function dayIndex(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1; // Mon=0 … Sun=6
}

function topPx(date: Date): number {
  const minutesFromStart = (date.getHours() - HOUR_START) * 60 + date.getMinutes();
  return Math.max(0, (minutesFromStart / 30) * SLOT_HEIGHT);
}

function heightPx(startIso: string, endIso: string | null): number {
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : new Date(start.getTime() + 3_600_000);
  const durationMin = Math.max(30, (end.getTime() - start.getTime()) / 60_000);
  return (durationMin / 30) * SLOT_HEIGHT;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const totalGridHeight = (HOUR_END - HOUR_START) * 2 * SLOT_HEIGHT;
const hourCount = HOUR_END - HOUR_START;

export function SelfWeekCalendarGrid({ logs, weekStart, onEventClick }: Props) {
  const weekDates = getWeekDates(weekStart);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const logsByDay = new Map<number, SelfCalendarLog[]>();
  for (const log of logs) {
    const d = new Date(log.startedAt);
    const idx = dayIndex(d);
    const existing = logsByDay.get(idx) ?? [];
    existing.push(log);
    logsByDay.set(idx, existing);
  }

  return (
    <div className="overflow-auto">
      {/* Day headers */}
      <div className="flex ml-14 border-b border-foreground/10">
        {weekDates.map((date) => {
          const isToday = date.getTime() === today.getTime();
          return (
            <div
              key={date.toISOString()}
              className={cn(
                'flex-1 text-center py-2',
                isToday ? 'text-foreground font-semibold' : 'text-foreground/65',
              )}
            >
              <div className="text-[10px] uppercase tracking-wider">{DAY_SHORT[i]}</div>
              <div
                className={cn(
                  'text-[13px] mt-0.5',
                  isToday &&
                    'inline-flex items-center justify-center w-6 h-6 rounded-full bg-foreground text-background font-bold text-[11px]',
                )}
              >
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="flex" style={{ height: totalGridHeight }}>
        {/* Hour labels */}
        <div className="w-14 shrink-0 relative">
          {Array.from({ length: hourCount }, (_, i) => (
            <div
              key={i}
              style={{ top: i * 2 * SLOT_HEIGHT }}
              className="absolute right-2 text-[9px] text-foreground/40 tabular-nums"
            >
              {String(HOUR_START + i).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Day columns */}
        {weekDates.map((date) => (
          <div key={date.toISOString()} className="flex-1 border-l border-foreground/5 relative">
            {/* Hour lines */}
            {Array.from({ length: hourCount * 2 }, (_, i) => (
              <div
                key={i}
                style={{ top: i * SLOT_HEIGHT }}
                className={cn(
                  'absolute w-full border-t',
                  i % 2 === 0 ? 'border-foreground/5' : 'border-foreground/[0.03]',
                )}
              />
            ))}

            {/* Events */}
            {(logsByDay.get(dayIndex(date)) ?? []).map((log) => {
              const top = topPx(new Date(log.startedAt));
              const height = heightPx(log.startedAt, log.completedAt);
              const isActive = log.completedAt === null;
              return (
                <button
                  type="button"
                  key={log._id}
                  onClick={() => onEventClick(log._id)}
                  style={{ top, height, minHeight: SLOT_HEIGHT }}
                  className={cn(
                    'absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-left overflow-hidden transition-opacity hover:opacity-80',
                    isActive
                      ? 'bg-sky-500/20 ring-1 ring-sky-500/40'
                      : 'bg-emerald-500/15 ring-1 ring-emerald-500/30',
                  )}
                >
                  <div
                    className={cn(
                      'text-[11px] font-semibold truncate leading-tight',
                      isActive ? 'text-sky-300' : 'text-emerald-300',
                    )}
                  >
                    {log.dayName}
                  </div>
                  <div
                    className={cn(
                      'text-[9px] mt-0.5',
                      isActive ? 'text-sky-300/65' : 'text-emerald-300/65',
                    )}
                  >
                    {formatTime(log.startedAt)}
                    {log.setCount > 0 && ` · ${log.setCount} sets`}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
