'use client';

import { useEffect, useReducer } from 'react';
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

interface CalendarClientState {
  weekStart: Date;
  sessions: CalendarSession[];
  serviceTypeMap: Record<string, string>;
  createSlot: { date: string; time: string } | null;
  editSession: CalendarSession | null;
  refreshTick: number;
}

type CalendarClientAction =
  | { type: 'SET_WEEK_START'; value: Date }
  | { type: 'SET_SESSIONS'; value: CalendarSession[] }
  | { type: 'SET_SERVICE_TYPE_MAP'; value: Record<string, string> }
  | { type: 'SET_CREATE_SLOT'; value: { date: string; time: string } | null }
  | { type: 'SET_EDIT_SESSION'; value: CalendarSession | null }
  | { type: 'SET_REFRESH_TICK'; value: number };

function calendarClientReducer(state: CalendarClientState, action: CalendarClientAction): CalendarClientState {
  switch (action.type) {
    case 'SET_WEEK_START': return { ...state, weekStart: action.value };
    case 'SET_SESSIONS': return { ...state, sessions: action.value };
    case 'SET_SERVICE_TYPE_MAP': return { ...state, serviceTypeMap: action.value };
    case 'SET_CREATE_SLOT': return { ...state, createSlot: action.value };
    case 'SET_EDIT_SESSION': return { ...state, editSession: action.value };
    case 'SET_REFRESH_TICK': return { ...state, refreshTick: action.value };
    default: return state;
  }
}

export function CalendarClient({
  currentUserRole,
  currentUserId,
  trainers,
  members,
  readOnly = false,
  filterTrainerId,
}: CalendarClientProps) {
  const [state, dispatch] = useReducer(calendarClientReducer, undefined, () => ({
    weekStart: getMondayOfWeek(new Date()),
    sessions: [],
    serviceTypeMap: {},
    createSlot: null,
    editSession: null,
    refreshTick: 0,
  }));
  const { weekStart, sessions, serviceTypeMap, createSlot, editSession, refreshTick } = state;

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const memberMap = Object.fromEntries(members.map((m) => [m._id, m.name]));

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/service-types/active', { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { serviceTypes: ServiceType[] }) => {
        const map = Object.fromEntries((data.serviceTypes ?? []).map((st) => [st._id, st.name]));
        dispatch({ type: 'SET_SERVICE_TYPE_MAP', value: map });
      })
      .catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, []);

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
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
      dispatch({ type: 'SET_SESSIONS', value: data.sessions });
    }

    void load().catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [weekStart, refreshTick, filterTrainerId]);

  function goToPrevWeek() {
    const nd = new Date(weekStart); nd.setDate(nd.getDate() - 7);
    dispatch({ type: 'SET_WEEK_START', value: nd });
  }
  function goToNextWeek() {
    const nd = new Date(weekStart); nd.setDate(nd.getDate() + 7);
    dispatch({ type: 'SET_WEEK_START', value: nd });
  }
  function goToToday() { dispatch({ type: 'SET_WEEK_START', value: getMondayOfWeek(new Date()) }); }

  function handleSuccess() {
    dispatch({ type: 'SET_REFRESH_TICK', value: refreshTick + 1 });
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
            dispatch({ type: 'SET_CREATE_SLOT', value: { date: date.toISOString().slice(0, 10), time } })
          }
          onSessionClick={readOnly ? () => {} : (s) => dispatch({ type: 'SET_EDIT_SESSION', value: s })}
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
          onClose={() => dispatch({ type: 'SET_CREATE_SLOT', value: null })}
        />
      )}

      {!readOnly && editSession && (
        <EditSessionModal
          key={editSession._id}
          open
          session={editSession}
          memberMap={memberMap}
          onSuccess={handleSuccess}
          onClose={() => dispatch({ type: 'SET_EDIT_SESSION', value: null })}
        />
      )}
    </div>
  );
}
