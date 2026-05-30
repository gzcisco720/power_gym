import { useEffect, useReducer } from 'react';
import { m } from 'framer-motion';
import { RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { fetchSessions, createSession, updateSession, cancelSession, fetchCalendarParticipants } from '@/api/schedule';
import type { CalendarSession, RecurringScope } from '@/api/schedule';
import { fetchActiveServiceTypes } from '@/api/service-types';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { timeToMinutes, addOneHour } from '@/lib/time';
import { variants } from '@/lib/animations/variants';

// ─── SessionEventCard ─────────────────────────────────────────────────────────

const COMPACT_MAX = 30;
const MEDIUM_MAX = 56;

const TRAINER_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'];

function trainerColor(trainerId: string): string {
  const idx = parseInt(trainerId.slice(-2), 16) % TRAINER_COLORS.length;
  return TRAINER_COLORS[idx];
}

interface SessionEventCardProps {
  memberNames: string[];
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  serviceTypeName: string | null;
  heightPx: number;
  trainerId: string;
  onClick: () => void;
}

function SessionEventCard({ memberNames, startTime, endTime, isRecurring, serviceTypeName, heightPx, trainerId, onClick }: SessionEventCardProps) {
  const color = trainerColor(trainerId);
  const title = serviceTypeName ?? memberNames.join(', ');
  const isCompact = heightPx < COMPACT_MAX;
  const isMedium = heightPx < MEDIUM_MAX;
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute inset-x-0.5 inset-y-0 rounded text-left overflow-hidden text-[11px] leading-tight px-1.5 py-1 hover:brightness-110 transition-[filter]"
      style={{ backgroundColor: color, color: '#fff' }}
    >
      <div className="font-semibold truncate">{title}</div>
      {!isCompact && !isMedium && serviceTypeName && (
        <div className="truncate opacity-90">{memberNames.join(', ')}</div>
      )}
      {!isCompact && (
        <div className="opacity-80">
          {startTime}–{endTime}
          {isRecurring && <RefreshCw className="inline size-2.5 ml-0.5 opacity-80" />}
        </div>
      )}
    </button>
  );
}

// ─── WeekCalendarGrid ─────────────────────────────────────────────────────────

const HOUR_START = 6;
const HOUR_END = 22;
const SLOT_HEIGHT = 48;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getTopPx(startTime: string): number {
  return ((timeToMinutes(startTime) - HOUR_START * 60) / 30) * SLOT_HEIGHT;
}
function getHeightPx(startTime: string, endTime: string): number {
  return ((timeToMinutes(endTime) - timeToMinutes(startTime)) / 30) * SLOT_HEIGHT;
}

interface CalendarGridProps {
  weekStart: Date;
  sessions: CalendarSession[];
  memberMap: Record<string, string>;
  serviceTypeMap: Record<string, string>;
  onSlotClick: (date: Date, time: string) => void;
  onSessionClick: (session: CalendarSession) => void;
}

function WeekCalendarGrid({ weekStart, sessions, memberMap, serviceTypeMap, onSlotClick, onSessionClick }: CalendarGridProps) {
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
      <div className="flex border-b border-foreground/[.08] sticky top-0 bg-background z-10">
        <div className="w-14 flex-shrink-0" />
        {days.map((day, i) => (
          <div key={day.toISOString()} className="flex-1 text-center py-2 text-xs text-foreground/65">
            <div>{DAYS[i]}</div>
            <div className="text-foreground font-semibold">{day.getDate()}</div>
          </div>
        ))}
      </div>

      <div className="flex shrink-0" style={{ height: totalHeight }}>
        <div className="w-14 flex-shrink-0 relative">
          {hours.map((h) => (
            <div key={h} className="absolute right-2 text-[10px] text-foreground/40 -translate-y-2" style={{ top: (h - HOUR_START) * 2 * SLOT_HEIGHT }}>
              {String(h).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {days.map((day, di) => (
          <div key={day.toISOString()} className="flex-1 relative border-l border-foreground/[.05]">
            {Array.from({ length: (HOUR_END - HOUR_START) * 2 }, (_, si) => {
              const totalMin = HOUR_START * 60 + si * 30;
              const hh = Math.floor(totalMin / 60);
              const mm = totalMin % 60;
              const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
              return (
                <button
                  type="button"
                  key={si}
                  aria-label={`Add session at ${time}`}
                  className="absolute inset-x-0 border-t border-foreground/[.04] cursor-pointer hover:bg-foreground/5 transition-colors"
                  style={{ top: si * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                  onClick={() => onSlotClick(day, time)}
                />
              );
            })}

            <m.div variants={variants.staggerContainer} initial="hidden" animate="visible">
              {sessionsByDay[di].map((s) => {
                const heightPx = getHeightPx(s.startTime, s.endTime);
                return (
                  <m.div
                    key={s._id}
                    variants={variants.staggerItem}
                    className="absolute inset-x-0"
                    style={{ top: getTopPx(s.startTime), height: heightPx }}
                  >
                    <SessionEventCard
                      memberNames={s.memberIds.map((id) => memberMap[id] ?? id)}
                      startTime={s.startTime}
                      endTime={s.endTime}
                      isRecurring={s.seriesId !== null}
                      serviceTypeName={s.serviceTypeId ? (serviceTypeMap[s.serviceTypeId] ?? null) : (s.customServiceName ?? null)}
                      trainerId={s.trainerId}
                      heightPx={heightPx}
                      onClick={() => onSessionClick(s)}
                    />
                  </m.div>
                );
              })}
            </m.div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RecurringScopeDialog ─────────────────────────────────────────────────────

const SCOPE_OPTIONS: { scope: RecurringScope; label: string; description: string }[] = [
  { scope: 'one', label: 'This occurrence only', description: 'Only this single session is affected.' },
  { scope: 'future', label: 'This and all future occurrences', description: 'This session and every following session in the series.' },
  { scope: 'all', label: 'All occurrences', description: 'The entire series, including past sessions.' },
];

interface RecurringScopeDialogProps {
  open: boolean;
  onConfirm: (scope: RecurringScope) => void;
  onCancel: () => void;
}

function RecurringScopeDialog({ open, onConfirm, onCancel }: RecurringScopeDialogProps) {
  const [selected, setSelected] = useReducer(
    (_: RecurringScope, v: RecurringScope) => v,
    'one' as RecurringScope,
  );
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Edit recurring session</DialogTitle></DialogHeader>
        <div className="space-y-2 my-2">
          {SCOPE_OPTIONS.map(({ scope, label, description }) => (
            <button
              type="button"
              key={scope}
              onClick={() => setSelected(scope)}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${selected === scope ? 'border-primary bg-primary/10' : 'border-foreground/10 hover:border-foreground/20'}`}
            >
              <div className="text-sm font-medium text-foreground">{label}</div>
              <div className="text-xs text-foreground/65 mt-0.5">{description}</div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} className="text-foreground/65">Cancel</Button>
          <Button onClick={() => onConfirm(selected)}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Service type helper ──────────────────────────────────────────────────────

interface ServiceTypeMeta { _id: string; name: string; durationMin: number; pricePerSession: number; currency: string }

// ─── CreateSessionModal ───────────────────────────────────────────────────────

interface Trainer { _id: string; name: string }
interface Member { _id: string; name: string; trainerId: string }

interface CreateSessionModalProps {
  open: boolean;
  defaultDate: string;
  defaultStartTime: string;
  trainers: Trainer[];
  members: Member[];
  currentUserId: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface CreateState {
  trainerId: string;
  memberId: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  serviceTypeId: string;
  customServiceName: string;
  customFee: string;
  serviceTypes: ServiceTypeMeta[];
  loading: boolean;
  error: string;
}

type CreateAction =
  | { type: 'SET'; key: keyof CreateState; value: CreateState[keyof CreateState] }
  | { type: 'SET_TRAINER_AND_MEMBER'; trainerId: string; memberId: string };

function createReducer(s: CreateState, a: CreateAction): CreateState {
  if (a.type === 'SET_TRAINER_AND_MEMBER') return { ...s, trainerId: a.trainerId, memberId: a.memberId };
  return { ...s, [a.key]: a.value };
}

function CreateSessionModal({ open, defaultDate, defaultStartTime, trainers, members, currentUserId, onSuccess, onClose }: CreateSessionModalProps) {
  const defaultTrainerId = trainers[0]?._id ?? currentUserId;
  const initialMembers = members.filter((m) => m.trainerId === defaultTrainerId);
  const [state, dispatch] = useReducer(createReducer, {
    trainerId: defaultTrainerId,
    memberId: initialMembers[0]?._id ?? '',
    date: defaultDate,
    startTime: defaultStartTime,
    endTime: addOneHour(defaultStartTime),
    isRecurring: false,
    serviceTypeId: '',
    customServiceName: '',
    customFee: '',
    serviceTypes: [],
    loading: false,
    error: '',
  });

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetchActiveServiceTypes()
      .then((sts) => dispatch({ type: 'SET', key: 'serviceTypes', value: sts as ServiceTypeMeta[] }))
      .catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [open]);

  const filteredMembers = members.filter((m) => m.trainerId === state.trainerId);
  const isCustom = state.serviceTypeId === '__custom__';
  const selectedST = isCustom ? null : (state.serviceTypes.find((st) => st._id === state.serviceTypeId) ?? null);

  async function handleSubmit() {
    if (!state.memberId) { dispatch({ type: 'SET', key: 'error', value: 'Select a member' }); return; }
    if (!state.endTime) { dispatch({ type: 'SET', key: 'error', value: 'End time is required' }); return; }
    if (!state.serviceTypeId) { dispatch({ type: 'SET', key: 'error', value: 'Select a service type or choose Custom' }); return; }
    if (isCustom && (!state.customServiceName.trim() || !state.customFee.trim())) {
      dispatch({ type: 'SET', key: 'error', value: 'Enter a service name and fee' }); return;
    }
    dispatch({ type: 'SET', key: 'error', value: '' });
    dispatch({ type: 'SET', key: 'loading', value: true });
    try {
      const body = isCustom
        ? { trainerId: state.trainerId, memberIds: [state.memberId], date: state.date, startTime: state.startTime, endTime: state.endTime, isRecurring: state.isRecurring, serviceTypeId: null, customServiceName: state.customServiceName.trim(), customFee: parseFloat(state.customFee) }
        : { trainerId: state.trainerId, memberIds: [state.memberId], date: state.date, startTime: state.startTime, endTime: state.endTime, isRecurring: state.isRecurring, serviceTypeId: state.serviceTypeId, customServiceName: null, customFee: null };
      await createSession(body);
      onSuccess();
      onClose();
    } catch {
      dispatch({ type: 'SET', key: 'error', value: 'Failed to create session' });
    } finally {
      dispatch({ type: 'SET', key: 'loading', value: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>New Training Session</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Trainer</label>
            <select
              className="w-full mt-1 bg-card border border-foreground/10 rounded px-3 py-2 text-sm text-foreground"
              value={state.trainerId}
              onChange={(e) => {
                const newId = e.target.value;
                const first = members.find((m) => m.trainerId === newId);
                dispatch({ type: 'SET_TRAINER_AND_MEMBER', trainerId: newId, memberId: first?._id ?? '' });
              }}
            >
              {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Member</label>
            <select
              className="w-full mt-1 bg-card border border-foreground/10 rounded px-3 py-2 text-sm text-foreground"
              value={state.memberId}
              onChange={(e) => dispatch({ type: 'SET', key: 'memberId', value: e.target.value })}
            >
              <option value="">Select member</option>
              {filteredMembers.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="cs-date" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Date</label>
            <Input id="cs-date" type="date" className="mt-1" value={state.date} onChange={(e) => dispatch({ type: 'SET', key: 'date', value: e.target.value })} />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label htmlFor="cs-start" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Start Time</label>
              <Input id="cs-start" type="time" className="mt-1" value={state.startTime} onChange={(e) => dispatch({ type: 'SET', key: 'startTime', value: e.target.value })} />
            </div>
            <div className="flex-1">
              <label htmlFor="cs-end" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">End Time</label>
              <Input id="cs-end" type="time" className="mt-1" value={state.endTime} onChange={(e) => dispatch({ type: 'SET', key: 'endTime', value: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-2">
            {[false, true].map((recurring) => (
              <button
                type="button"
                key={String(recurring)}
                onClick={() => dispatch({ type: 'SET', key: 'isRecurring', value: recurring })}
                className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${state.isRecurring === recurring ? 'bg-primary text-white' : 'bg-muted text-foreground/65'}`}
              >
                {recurring ? 'Weekly Recurring' : 'Once'}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="cs-st" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">
              Service Type <span className="text-destructive">*</span>
            </label>
            <div className="mt-1 flex items-center gap-2">
              <select
                id="cs-st"
                className="flex-1 bg-card border border-foreground/10 rounded px-3 py-2 text-sm text-foreground"
                value={state.serviceTypeId}
                onChange={(e) => dispatch({ type: 'SET', key: 'serviceTypeId', value: e.target.value })}
              >
                <option value="">Select</option>
                {state.serviceTypes.map((st) => <option key={st._id} value={st._id}>{st.name} ({st.durationMin} min)</option>)}
                <option value="__custom__">Custom…</option>
              </select>
              {selectedST && (
                <span className="text-sm text-primary-light font-semibold shrink-0">{selectedST.currency} {selectedST.pricePerSession}</span>
              )}
            </div>
            {isCustom && (
              <div className="mt-2 flex gap-2">
                <input type="text" placeholder="Service name" aria-label="Custom service name" className="flex-1 bg-card border border-foreground/10 rounded px-3 py-2 text-sm text-foreground placeholder:text-foreground/40" value={state.customServiceName} onChange={(e) => dispatch({ type: 'SET', key: 'customServiceName', value: e.target.value })} />
                <input type="text" inputMode="decimal" placeholder="Fee (AUD)" aria-label="Custom service fee (AUD)" className="w-28 bg-card border border-foreground/10 rounded px-3 py-2 text-sm text-foreground placeholder:text-foreground/40" value={state.customFee} onChange={(e) => dispatch({ type: 'SET', key: 'customFee', value: e.target.value })} />
              </div>
            )}
          </div>

          {state.error && <p className="text-xs text-destructive">{state.error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-foreground/65">Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={state.loading}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── EditSessionModal ─────────────────────────────────────────────────────────

interface EditSessionModalProps {
  open: boolean;
  session: CalendarSession;
  memberMap: Record<string, string>;
  onSuccess: () => void;
  onClose: () => void;
}

interface EditState {
  startTime: string;
  endTime: string;
  action: 'edit' | 'cancel' | null;
  loading: boolean;
  error: string;
  serviceTypeId: string;
  customServiceName: string;
  customFee: string;
  serviceTypes: ServiceTypeMeta[];
}

type EditAction =
  | { type: 'SET'; key: keyof EditState; value: EditState[keyof EditState] };

function editReducer(s: EditState, a: EditAction): EditState {
  return { ...s, [a.key]: a.value };
}

function EditSessionModal({ open, session, memberMap, onSuccess, onClose }: EditSessionModalProps) {
  const [state, dispatch] = useReducer(editReducer, {
    startTime: session.startTime,
    endTime: session.endTime,
    action: null,
    loading: false,
    error: '',
    serviceTypeId: session.customServiceName ? '__custom__' : (session.serviceTypeId ?? ''),
    customServiceName: session.customServiceName ?? '',
    customFee: session.customFee != null ? String(session.customFee) : '',
    serviceTypes: [],
  });

  const isRecurring = session.seriesId !== null;
  const isCustom = state.serviceTypeId === '__custom__';
  const selectedST = isCustom ? null : (state.serviceTypes.find((st) => st._id === state.serviceTypeId) ?? null);

  useEffect(() => {
    if (!open) return;
    fetchActiveServiceTypes()
      .then((sts) => dispatch({ type: 'SET', key: 'serviceTypes', value: sts as ServiceTypeMeta[] }))
      .catch(console.error);
  }, [open]);

  async function executeAction(scope: RecurringScope) {
    dispatch({ type: 'SET', key: 'loading', value: true });
    dispatch({ type: 'SET', key: 'error', value: '' });
    try {
      if (state.action === 'edit') {
        const servicePayload = isCustom
          ? { serviceTypeId: null, customServiceName: state.customServiceName.trim(), customFee: parseFloat(state.customFee) }
          : { serviceTypeId: state.serviceTypeId || null, customServiceName: null, customFee: null };
        await updateSession(session._id, { scope, startTime: state.startTime, endTime: state.endTime, ...servicePayload });
      } else {
        await cancelSession(session._id, scope);
      }
      onSuccess();
      onClose();
    } catch {
      dispatch({ type: 'SET', key: 'error', value: state.action === 'edit' ? 'Failed to update' : 'Failed to cancel' });
    } finally {
      dispatch({ type: 'SET', key: 'loading', value: false });
      dispatch({ type: 'SET', key: 'action', value: null });
    }
  }

  function handleSave() {
    if (isRecurring) { dispatch({ type: 'SET', key: 'action', value: 'edit' }); }
    else { void executeAction('one'); }
  }

  function handleCancel() {
    if (isRecurring) { dispatch({ type: 'SET', key: 'action', value: 'cancel' }); }
    else { dispatch({ type: 'SET', key: 'action', value: 'cancel' }); void executeAction('one'); }
  }

  return (
    <>
      <Dialog open={open && state.action === null} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Edit Session</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Members</label>
              <p className="mt-1 text-sm text-foreground/65">{session.memberIds.map((id) => memberMap[id] ?? id).join(', ')}</p>
            </div>
            {isRecurring && (
              <p className="flex items-center gap-1 text-xs text-primary-light">
                <RefreshCw className="size-3" />
                This is a recurring session
              </p>
            )}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Start Time</label>
                <Input type="time" className="mt-1" value={state.startTime} onChange={(e) => dispatch({ type: 'SET', key: 'startTime', value: e.target.value })} />
              </div>
              <div className="flex-1">
                <label className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">End Time</label>
                <Input type="time" className="mt-1" value={state.endTime} onChange={(e) => dispatch({ type: 'SET', key: 'endTime', value: e.target.value })} />
              </div>
            </div>
            <div>
              <label htmlFor="es-st" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-foreground/65">Service Type</label>
              <div className="mt-1 flex items-center gap-2">
                <select
                  id="es-st"
                  className="flex-1 bg-card border border-foreground/10 rounded px-3 py-2 text-sm text-foreground"
                  value={state.serviceTypeId}
                  onChange={(e) => dispatch({ type: 'SET', key: 'serviceTypeId', value: e.target.value })}
                >
                  <option value="">Select</option>
                  {state.serviceTypes.map((st) => <option key={st._id} value={st._id}>{st.name} ({st.durationMin} min)</option>)}
                  <option value="__custom__">Custom…</option>
                </select>
                {selectedST && <span className="text-sm text-primary-light font-semibold shrink-0">{selectedST.currency} {selectedST.pricePerSession}</span>}
              </div>
              {isCustom && (
                <div className="mt-2 flex gap-2">
                  <input type="text" placeholder="Service name" aria-label="Custom service name" className="flex-1 bg-card border border-foreground/10 rounded px-3 py-2 text-sm text-foreground placeholder:text-foreground/40" value={state.customServiceName} onChange={(e) => dispatch({ type: 'SET', key: 'customServiceName', value: e.target.value })} />
                  <input type="text" inputMode="decimal" placeholder="Fee (AUD)" aria-label="Custom service fee (AUD)" className="w-28 bg-card border border-foreground/10 rounded px-3 py-2 text-sm text-foreground placeholder:text-foreground/40" value={state.customFee} onChange={(e) => dispatch({ type: 'SET', key: 'customFee', value: e.target.value })} />
                </div>
              )}
            </div>
            {state.error && <p className="text-xs text-destructive">{state.error}</p>}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="destructive" onClick={handleCancel} disabled={state.loading} className="sm:mr-auto">Cancel Session</Button>
            <Button variant="ghost" onClick={onClose} className="text-foreground/65">Dismiss</Button>
            <Button onClick={handleSave} disabled={state.loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {state.action !== null && isRecurring && (
        <RecurringScopeDialog
          open
          onConfirm={(scope) => void executeAction(scope)}
          onCancel={() => dispatch({ type: 'SET', key: 'action', value: null })}
        />
      )}
    </>
  );
}

// ─── Calendar Page ────────────────────────────────────────────────────────────

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

interface CalendarPageState {
  weekStart: Date;
  sessions: CalendarSession[];
  serviceTypeMap: Record<string, string>;
  trainers: Trainer[];
  members: Member[];
  createSlot: { date: string; time: string } | null;
  editSession: CalendarSession | null;
  refreshTick: number;
}

type CalendarPageAction =
  | { type: 'SET_WEEK_START'; value: Date }
  | { type: 'SET_SESSIONS'; value: CalendarSession[] }
  | { type: 'SET_SERVICE_TYPE_MAP'; value: Record<string, string> }
  | { type: 'SET_PARTICIPANTS'; trainers: Trainer[]; members: Member[] }
  | { type: 'SET_CREATE_SLOT'; value: { date: string; time: string } | null }
  | { type: 'SET_EDIT_SESSION'; value: CalendarSession | null }
  | { type: 'REFRESH' };

function calendarPageReducer(s: CalendarPageState, a: CalendarPageAction): CalendarPageState {
  switch (a.type) {
    case 'SET_WEEK_START': return { ...s, weekStart: a.value };
    case 'SET_SESSIONS': return { ...s, sessions: a.value };
    case 'SET_SERVICE_TYPE_MAP': return { ...s, serviceTypeMap: a.value };
    case 'SET_PARTICIPANTS': return { ...s, trainers: a.trainers, members: a.members };
    case 'SET_CREATE_SLOT': return { ...s, createSlot: a.value };
    case 'SET_EDIT_SESSION': return { ...s, editSession: a.value };
    case 'REFRESH': return { ...s, refreshTick: s.refreshTick + 1, createSlot: null, editSession: null };
    default: return s;
  }
}

export function OwnerCalendarPage() {
  const user = useAuthStore((s) => s.user);
  const [state, dispatch] = useReducer(calendarPageReducer, undefined, () => ({
    weekStart: getMondayOfWeek(new Date()),
    sessions: [],
    serviceTypeMap: {},
    trainers: [],
    members: [],
    createSlot: null,
    editSession: null,
    refreshTick: 0,
  }));
  const { weekStart, sessions, serviceTypeMap, trainers, members, createSlot, editSession, refreshTick } = state;

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Load service types
  useEffect(() => {
    fetchActiveServiceTypes()
      .then((sts) => {
        const map = Object.fromEntries(sts.map((st) => [st._id, st.name]));
        dispatch({ type: 'SET_SERVICE_TYPE_MAP', value: map });
      })
      .catch(console.error);
  }, []);

  // Load trainers + members for the calendar
  useEffect(() => {
    if (!user) return;
    const name = user.name || 'Owner';
    fetchCalendarParticipants(name, user.id)
      .then(({ trainers: ts, members: ms }) => {
        dispatch({ type: 'SET_PARTICIPANTS', trainers: ts, members: ms });
      })
      .catch(console.error);
  }, [user]);

  // Load sessions for current week
  useEffect(() => {
    fetchSessions(weekStart.toISOString(), weekEnd.toISOString())
      .then((sess) => dispatch({ type: 'SET_SESSIONS', value: sess }))
      .catch(console.error);
  }, [weekStart, refreshTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const memberMap = Object.fromEntries(members.map((m) => [m._id, m.name]));

  function goToPrevWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7);
    dispatch({ type: 'SET_WEEK_START', value: d });
  }
  function goToNextWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7);
    dispatch({ type: 'SET_WEEK_START', value: d });
  }
  function goToToday() { dispatch({ type: 'SET_WEEK_START', value: getMondayOfWeek(new Date()) }); }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="Calendar" subtitle="Manage all training sessions" />

      <div className="flex items-center gap-3 px-4 sm:px-8 py-4 border-b border-foreground/[.06]">
        <Button variant="ghost" size="icon" onClick={goToPrevWeek}><ChevronLeft className="size-4" /></Button>
        <Button variant="ghost" size="icon" onClick={goToNextWeek}><ChevronRight className="size-4" /></Button>
        <Button variant="ghost" size="sm" onClick={goToToday}>Today</Button>
        <span className="text-sm text-foreground/65 ml-2">
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
          onSlotClick={(date, time) =>
            dispatch({ type: 'SET_CREATE_SLOT', value: { date: date.toISOString().slice(0, 10), time } })
          }
          onSessionClick={(s) => dispatch({ type: 'SET_EDIT_SESSION', value: s })}
        />
      </div>

      {createSlot && (
        <CreateSessionModal
          open
          defaultDate={createSlot.date}
          defaultStartTime={createSlot.time}
          trainers={trainers}
          members={members}
          currentUserId={user?.id ?? ''}
          onSuccess={() => dispatch({ type: 'REFRESH' })}
          onClose={() => dispatch({ type: 'SET_CREATE_SLOT', value: null })}
        />
      )}

      {editSession && (
        <EditSessionModal
          key={editSession._id}
          open
          session={editSession}
          memberMap={memberMap}
          onSuccess={() => dispatch({ type: 'REFRESH' })}
          onClose={() => dispatch({ type: 'SET_EDIT_SESSION', value: null })}
        />
      )}
    </div>
  );
}
