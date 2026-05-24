'use client';

import { useEffect, useReducer } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RefreshCw } from 'lucide-react';
import { RecurringScopeDialog } from './recurring-scope-dialog';
import type { CalendarSession } from './week-calendar-grid';

type Scope = 'one' | 'future' | 'all';

interface ServiceType {
  _id: string;
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
}

interface EditSessionModalProps {
  open: boolean;
  session: CalendarSession;
  memberMap: Record<string, string>;
  onSuccess: () => void;
  onClose: () => void;
}

interface EditSessionModalState {
  startTime: string;
  endTime: string;
  action: 'edit' | 'cancel' | null;
  loading: boolean;
  error: string;
  serviceTypeId: string;
  customServiceName: string;
  customFee: string;
  serviceTypes: ServiceType[];
}

type EditSessionModalAction =
  | { type: 'SET_START_TIME'; value: string }
  | { type: 'SET_END_TIME'; value: string }
  | { type: 'SET_ACTION'; value: 'edit' | 'cancel' | null }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_ERROR'; value: string }
  | { type: 'SET_SERVICE_TYPE_ID'; value: string }
  | { type: 'SET_CUSTOM_SERVICE_NAME'; value: string }
  | { type: 'SET_CUSTOM_FEE'; value: string }
  | { type: 'SET_SERVICE_TYPES'; value: ServiceType[] };

function editSessionModalReducer(state: EditSessionModalState, action: EditSessionModalAction): EditSessionModalState {
  switch (action.type) {
    case 'SET_START_TIME': return { ...state, startTime: action.value };
    case 'SET_END_TIME': return { ...state, endTime: action.value };
    case 'SET_ACTION': return { ...state, action: action.value };
    case 'SET_LOADING': return { ...state, loading: action.value };
    case 'SET_ERROR': return { ...state, error: action.value };
    case 'SET_SERVICE_TYPE_ID': return { ...state, serviceTypeId: action.value };
    case 'SET_CUSTOM_SERVICE_NAME': return { ...state, customServiceName: action.value };
    case 'SET_CUSTOM_FEE': return { ...state, customFee: action.value };
    case 'SET_SERVICE_TYPES': return { ...state, serviceTypes: action.value };
    default: return state;
  }
}

export function EditSessionModal({
  open,
  session,
  memberMap,
  onSuccess,
  onClose,
}: EditSessionModalProps) {
  const [state, dispatch] = useReducer(editSessionModalReducer, {
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
  const { startTime, endTime, action, loading, error, serviceTypeId, customServiceName, customFee, serviceTypes } = state;

  const isRecurring = session.seriesId !== null;

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect, react-doctor/no-effect-event-handler
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch('/api/service-types/active', { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { serviceTypes: ServiceType[] }) => dispatch({ type: 'SET_SERVICE_TYPES', value: data.serviceTypes ?? [] }))
      .catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [open]);

  const isCustomService = serviceTypeId === '__custom__';
  const selectedServiceType = isCustomService ? null : (serviceTypes.find((st) => st._id === serviceTypeId) ?? null);

  async function executeAction(scope: Scope) {
    dispatch({ type: 'SET_LOADING', value: true });
    dispatch({ type: 'SET_ERROR', value: '' });
    try {
      if (action === 'edit') {
        const servicePayload = isCustomService
          ? { serviceTypeId: null, customServiceName: customServiceName.trim(), customFee: parseFloat(customFee) }
          : { serviceTypeId: serviceTypeId || null, customServiceName: null, customFee: null };
        const res = await fetch(`/api/schedule/${session._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, startTime, endTime, ...servicePayload }),
        });
        if (!res.ok) {
          dispatch({ type: 'SET_ERROR', value: 'Failed to update' });
          return;
        }
      } else {
        const res = await fetch(`/api/schedule/${session._id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope }),
        });
        if (!res.ok) {
          dispatch({ type: 'SET_ERROR', value: 'Failed to cancel' });
          return;
        }
      }
      onSuccess();
      onClose();
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
      dispatch({ type: 'SET_ACTION', value: null });
    }
  }

  function handleSave() {
    if (isRecurring) {
      dispatch({ type: 'SET_ACTION', value: 'edit' });
    } else {
      void executeAction('one');
    }
  }

  function handleCancel() {
    if (isRecurring) {
      dispatch({ type: 'SET_ACTION', value: 'cancel' });
    } else {
      void executeAction('one');
    }
  }

  return (
    <>
      <Dialog open={open && action === null} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Members</Label>
              <p className="mt-1 text-sm text-[#888]">
                {session.memberIds.map((id) => memberMap[id] ?? id).join(', ')}
              </p>
            </div>
            {isRecurring && (
              <p className="flex items-center gap-1 text-xs text-blue-400">
                <RefreshCw className="size-3" />
                This is a recurring session
              </p>
            )}
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={startTime}
                  onChange={(e) => dispatch({ type: 'SET_START_TIME', value: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <Label>End Time</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={endTime}
                  onChange={(e) => dispatch({ type: 'SET_END_TIME', value: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="editServiceType">Service Type</Label>
              <div className="mt-1 flex items-center gap-2">
                <select
                  id="editServiceType"
                  className="flex-1 bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white"
                  value={serviceTypeId}
                  onChange={(e) => dispatch({ type: 'SET_SERVICE_TYPE_ID', value: e.target.value })}
                >
                  <option value="">Select</option>
                  {serviceTypes.map((st) => (
                    <option key={st._id} value={st._id}>
                      {st.name} ({st.durationMin} min)
                    </option>
                  ))}
                  <option value="__custom__">Custom…</option>
                </select>
                {selectedServiceType && (
                  <span className="text-sm text-primary-light font-semibold shrink-0">
                    {selectedServiceType.currency} {selectedServiceType.pricePerSession}
                  </span>
                )}
              </div>
              {isCustomService && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    placeholder="Service name"
                    aria-label="Custom service name"
                    className="flex-1 bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder:text-foreground/40"
                    value={customServiceName}
                    onChange={(e) => dispatch({ type: 'SET_CUSTOM_SERVICE_NAME', value: e.target.value })}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Fee (AUD)"
                    aria-label="Custom service fee (AUD)"
                    className="w-28 bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder:text-foreground/40"
                    value={customFee}
                    onChange={(e) => dispatch({ type: 'SET_CUSTOM_FEE', value: e.target.value })}
                  />
                </div>
              )}
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={loading}
              className="sm:mr-auto"
            >
              Cancel Session
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Dismiss
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {action !== null && isRecurring && (
        <RecurringScopeDialog
          open
          onConfirm={(scope) => {
            void executeAction(scope);
          }}
          onCancel={() => dispatch({ type: 'SET_ACTION', value: null })}
        />
      )}
    </>
  );
}
