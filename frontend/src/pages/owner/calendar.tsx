import { useEffect, useReducer } from 'react';
import { LazyMotion, domAnimation, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useScheduleStore } from '@/stores/scheduleStore';
import { useUsersStore } from '@/stores/usersStore';
import { PageHeader } from '@/components/shared/page-header';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekStart(ref: Date): Date {
  const d = new Date(ref);
  const day = d.getDay();
  // Shift so Monday = 0
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDayLabel(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

interface CalendarState {
  weekStart: Date;
  showCreate: boolean;
  createDate: string;
  createStartTime: string;
  createEndTime: string;
  createMemberIds: string[];
  createSubmitting: boolean;
  deleteId: string | null;
}

type CalendarAction =
  | { type: 'PREV_WEEK' }
  | { type: 'NEXT_WEEK' }
  | { type: 'OPEN_CREATE'; date: string }
  | { type: 'CLOSE_CREATE' }
  | { type: 'SET_CREATE_DATE'; value: string }
  | { type: 'SET_CREATE_START'; value: string }
  | { type: 'SET_CREATE_END'; value: string }
  | { type: 'SET_CREATE_MEMBERS'; ids: string[] }
  | { type: 'SET_CREATE_SUBMITTING'; value: boolean }
  | { type: 'SET_DELETE_ID'; id: string | null };

function reducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    case 'PREV_WEEK': {
      const d = new Date(state.weekStart);
      d.setDate(d.getDate() - 7);
      return { ...state, weekStart: d };
    }
    case 'NEXT_WEEK': {
      const d = new Date(state.weekStart);
      d.setDate(d.getDate() + 7);
      return { ...state, weekStart: d };
    }
    case 'OPEN_CREATE':
      return { ...state, showCreate: true, createDate: action.date, createStartTime: '09:00', createEndTime: '10:00', createMemberIds: [] };
    case 'CLOSE_CREATE':
      return { ...state, showCreate: false, createDate: '', createStartTime: '', createEndTime: '', createMemberIds: [] };
    case 'SET_CREATE_DATE': return { ...state, createDate: action.value };
    case 'SET_CREATE_START': return { ...state, createStartTime: action.value };
    case 'SET_CREATE_END': return { ...state, createEndTime: action.value };
    case 'SET_CREATE_MEMBERS': return { ...state, createMemberIds: action.ids };
    case 'SET_CREATE_SUBMITTING': return { ...state, createSubmitting: action.value };
    case 'SET_DELETE_ID': return { ...state, deleteId: action.id };
    default: return state;
  }
}

export function OwnerCalendarPage() {
  const { sessions, createSession, deleteSession } = useScheduleStore();
  const { members, fetchOwnerMembers } = useUsersStore();
  const shouldReduceMotion = useReducedMotion();

  const [state, dispatch] = useReducer(reducer, {
    weekStart: getWeekStart(new Date()),
    showCreate: false,
    createDate: '',
    createStartTime: '09:00',
    createEndTime: '10:00',
    createMemberIds: [],
    createSubmitting: false,
    deleteId: null,
  });

  useEffect(() => {
    void fetchOwnerMembers();
  }, [fetchOwnerMembers]);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(state.weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekLabel = `${formatDayLabel(weekDays[0])} – ${formatDayLabel(weekDays[6])} ${weekDays[0].getFullYear()}`;

  async function handleCreate() {
    if (!state.createDate || !state.createStartTime || !state.createEndTime) return;
    dispatch({ type: 'SET_CREATE_SUBMITTING', value: true });
    try {
      await createSession({
        memberIds: state.createMemberIds,
        date: state.createDate,
        startTime: state.createStartTime,
        endTime: state.createEndTime,
      });
      toast.success('Session scheduled');
      dispatch({ type: 'CLOSE_CREATE' });
    } catch {
      toast.error('Failed to schedule session');
    } finally {
      dispatch({ type: 'SET_CREATE_SUBMITTING', value: false });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSession(id);
      toast.success('Session cancelled');
      dispatch({ type: 'SET_DELETE_ID', id: null });
    } catch {
      toast.error('Failed to cancel session');
    }
  }

  const addActions = (
    <Button
      size="sm"
      onClick={() => dispatch({ type: 'OPEN_CREATE', date: formatDate(new Date()) })}
    >
      <Plus className="size-3.5" />
      Schedule
    </Button>
  );

  return (
    <LazyMotion features={domAnimation}>
      <PageHeader
        title="Calendar"
        subtitle="Manage all training sessions"
        actions={addActions}
      />

      <div className="px-4 sm:px-8 py-6 space-y-4">
        {/* Week nav */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Previous week"
            onClick={() => dispatch({ type: 'PREV_WEEK' })}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium text-foreground min-w-[160px] text-center">
            {weekLabel}
          </span>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Next week"
            onClick={() => dispatch({ type: 'NEXT_WEEK' })}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        {/* Week grid */}
        <div className="rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden">
          {/* Header row — 7 day columns */}
          <div className="grid grid-cols-7 border-b border-foreground/[.06]">
            {weekDays.map((day, i) => {
              const isToday = formatDate(day) === formatDate(new Date());
              return (
                <div
                  key={day.toISOString()}
                  data-day-column={DAYS[i]}
                  className="py-2 text-center border-r border-foreground/[.04] last:border-0"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-foreground/65">
                    {DAYS[i]}
                  </div>
                  <div
                    className={`text-sm font-semibold mt-0.5 ${isToday ? 'text-primary-light' : 'text-foreground'}`}
                  >
                    {formatDayLabel(day)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Session rows per day */}
          <div className="grid grid-cols-7 min-h-[200px]">
            {weekDays.map((day, i) => {
              const iso = formatDate(day);
              const daySessions = sessions.filter((s) => s.date.slice(0, 10) === iso);
              return (
                <div
                  key={day.toISOString()}
                  className="border-r border-foreground/[.04] last:border-0 p-1 space-y-1"
                >
                  <button
                    type="button"
                    aria-label={`Add session on ${DAYS[i]}`}
                    onClick={() => dispatch({ type: 'OPEN_CREATE', date: iso })}
                    className="w-full h-7 rounded-lg border border-dashed border-foreground/10 hover:border-foreground/25 hover:bg-foreground/[.03] transition-all flex items-center justify-center"
                  >
                    <Plus className="size-3 text-foreground/30" />
                  </button>
                  {daySessions.map((s) => {
                    const memberNames = s.memberIds
                      .map((id) => members.find((m) => m._id === id)?.name ?? id)
                      .join(', ');
                    return (
                      <div
                        key={s._id}
                        data-session-id={s._id}
                        className="rounded-lg bg-primary/10 ring-1 ring-primary/20 px-2 py-1 text-[10px] group relative"
                      >
                        <div className="font-semibold text-primary-light truncate">
                          {s.startTime}–{s.endTime}
                        </div>
                        {memberNames && (
                          <div className="text-foreground/65 truncate">{memberNames}</div>
                        )}
                        <button
                          type="button"
                          aria-label="Cancel session"
                          onClick={() => void handleDelete(s._id)}
                          className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3 text-foreground/40 hover:text-destructive" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming sessions list (mobile-friendly) */}
        {sessions.length === 0 && (
          <p className="text-sm text-foreground/65 text-center py-4">
            No sessions scheduled. Click a day column or use "Schedule" to add one.
          </p>
        )}
      </div>

      {/* Create Session Dialog */}
      <Dialog
        open={state.showCreate}
        onOpenChange={(open) => {
          if (!open) dispatch({ type: 'CLOSE_CREATE' });
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <label
                htmlFor="cal-member"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Member
              </label>
              <select
                id="cal-member"
                aria-label="Member"
                value={state.createMemberIds[0] ?? ''}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_CREATE_MEMBERS',
                    ids: e.target.value ? [e.target.value] : [],
                  })
                }
                className="w-full rounded-xl border border-foreground/10 bg-input px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select member (optional)</option>
                {members.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="cal-date"
                className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
              >
                Date <span className="text-destructive">*</span>
              </label>
              <Input
                id="cal-date"
                type="date"
                value={state.createDate}
                onChange={(e) => dispatch({ type: 'SET_CREATE_DATE', value: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="cal-start"
                  className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
                >
                  Start Time <span className="text-destructive">*</span>
                </label>
                <Input
                  id="cal-start"
                  type="time"
                  value={state.createStartTime}
                  onChange={(e) => dispatch({ type: 'SET_CREATE_START', value: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="cal-end"
                  className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65"
                >
                  End Time <span className="text-destructive">*</span>
                </label>
                <Input
                  id="cal-end"
                  type="time"
                  value={state.createEndTime}
                  onChange={(e) => dispatch({ type: 'SET_CREATE_END', value: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => dispatch({ type: 'CLOSE_CREATE' })}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCreate()}
              disabled={
                state.createSubmitting || !state.createDate || !state.createStartTime || !state.createEndTime
              }
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {shouldReduceMotion && null}
    </LazyMotion>
  );
}
