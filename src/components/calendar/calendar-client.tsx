'use client';

import { useState, useEffect } from 'react';
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

interface ServiceType {
  _id: string;
  name: string;
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
  const [serviceTypeMap, setServiceTypeMap] = useState<Record<string, string>>({});
  const [createSlot, setCreateSlot] = useState<{ date: string; time: string } | null>(null);
  const [editSession, setEditSession] = useState<CalendarSession | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const memberMap = Object.fromEntries(members.map((m) => [m._id, m.name]));

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/service-types/active', { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { serviceTypes: ServiceType[] }) => {
        const map = Object.fromEntries((data.serviceTypes ?? []).map((st) => [st._id, st.name]));
        setServiceTypeMap(map);
      })
      .catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const startIso = weekStart.toISOString();
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    const endIso = end.toISOString();

    async function load() {
      const url = filterTrainerId
        ? `/api/schedule?start=${startIso}&end=${endIso}&trainerId=${filterTrainerId}`
        : `/api/schedule?start=${startIso}&end=${endIso}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return;
      const data = await res.json() as SessionsApiResponse;
      setSessions(data.sessions);
    }

    void load().catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [weekStart, refreshTick, filterTrainerId]);

  function goToPrevWeek() {
    setWeekStart((d) => { const nd = new Date(d); nd.setDate(nd.getDate() - 7); return nd; });
  }
  function goToNextWeek() {
    setWeekStart((d) => { const nd = new Date(d); nd.setDate(nd.getDate() + 7); return nd; });
  }
  function goToToday() { setWeekStart(getMondayOfWeek(new Date())); }

  function handleSuccess() {
    setRefreshTick((t) => t + 1);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 sm:px-8 py-4 border-b border-[#141414]">
        <Button variant="ghost" size="icon" onClick={goToPrevWeek}><ChevronLeft className="size-4" /></Button>
        <Button variant="ghost" size="icon" onClick={goToNextWeek}><ChevronRight className="size-4" /></Button>
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
          serviceTypeMap={serviceTypeMap}
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
