'use client';

import { useState, useEffect, useRef } from 'react';
import { WeekCalendarGrid } from './week-calendar-grid';
import { CreateSessionModal } from './create-session-modal';
import { EditSessionModal } from './edit-session-modal';
import type { CalendarSession } from './week-calendar-grid';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Trainer { _id: string; name: string }
interface Member { _id: string; name: string; trainerId: string }

interface CalendarClientProps {
  currentUserRole: 'owner' | 'trainer';
  currentUserId: string;
  trainers: Trainer[];
  members: Member[];
  readOnly?: boolean;
  filterTrainerId?: string;
}

interface SessionsApiResponse {
  sessions: CalendarSession[];
}

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function CalendarClient({
  currentUserRole,
  currentUserId,
  trainers,
  members,
  readOnly = false,
  filterTrainerId,
}: CalendarClientProps) {
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [createSlot, setCreateSlot] = useState<{ date: string; time: string } | null>(null);
  const [editSession, setEditSession] = useState<CalendarSession | null>(null);
  const refreshCountRef = useRef(0);
  const [refreshTick, setRefreshTick] = useState(0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const memberMap = Object.fromEntries(members.map((m) => [m._id, m.name]));

  useEffect(() => {
    let cancelled = false;
    const startIso = weekStart.toISOString();
    const endIso = weekEnd.toISOString();

    async function load() {
      const url = filterTrainerId
        ? `/api/schedule?start=${startIso}&end=${endIso}&trainerId=${filterTrainerId}`
        : `/api/schedule?start=${startIso}&end=${endIso}`;
      const res = await fetch(url);
      if (!res.ok || cancelled) return;
      const data = await res.json() as SessionsApiResponse;
      if (!cancelled) setSessions(data.sessions);
    }

    void load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, refreshTick, filterTrainerId]);

  function goToPrevWeek() {
    setWeekStart((d) => { const nd = new Date(d); nd.setDate(nd.getDate() - 7); return nd; });
  }
  function goToNextWeek() {
    setWeekStart((d) => { const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd; });
  }
  function goToToday() { setWeekStart(getMondayOfWeek(new Date())); }

  function handleSuccess() {
    refreshCountRef.current += 1;
    setRefreshTick(refreshCountRef.current);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 sm:px-8 py-4 border-b border-[#141414]">
        <Button variant="ghost" size="icon" onClick={goToPrevWeek}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={goToNextWeek}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" onClick={goToToday}>Today</Button>
        <span className="text-sm text-[#888] ml-2">
          {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} –{' '}
          {weekEnd.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      <div className="flex-1 overflow-auto px-4 sm:px-8">
        <WeekCalendarGrid
          weekStart={weekStart}
          sessions={sessions}
          memberMap={memberMap}
          trainerColorMap={{}}
          onSlotClick={readOnly ? () => {} : (date, time) =>
            setCreateSlot({ date: date.toISOString().slice(0, 10), time })
          }
          onSessionClick={readOnly ? () => {} : (s) => setEditSession(s)}
        />
      </div>

      {!readOnly && createSlot && (
        <CreateSessionModal
          open
          defaultDate={createSlot.date}
          defaultStartTime={createSlot.time}
          trainers={trainers}
          members={members}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          onSuccess={handleSuccess}
          onClose={() => setCreateSlot(null)}
        />
      )}

      {!readOnly && editSession && (
        <EditSessionModal
          open
          session={editSession}
          memberMap={memberMap}
          onSuccess={handleSuccess}
          onClose={() => setEditSession(null)}
        />
      )}
    </div>
  );
}
