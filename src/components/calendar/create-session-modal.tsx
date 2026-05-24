'use client';

import { useReducer, useEffect } from 'react';
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
import { addOneHour } from '@/lib/time';

interface Trainer {
  _id: string;
  name: string;
}
interface Member {
  _id: string;
  name: string;
  trainerId: string;
}
interface ServiceType {
  _id: string;
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
}

interface CreateSessionModalProps {
  open: boolean;
  defaultDate: string;
  defaultStartTime: string;
  trainers: Trainer[];
  members: Member[];
  currentUserRole: 'owner' | 'trainer';
  currentUserId: string;
  onSuccess: () => void;
  onClose: () => void;
}

interface CreateSessionState {
  trainerId: string;
  selectedMemberId: string;
  date: string;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
  serviceTypeId: string;
  customServiceName: string;
  customFee: string;
  serviceTypes: ServiceType[];
  loading: boolean;
  error: string;
}

type CreateSessionAction =
  | { type: 'SET_TRAINER_ID'; value: string }
  | { type: 'SET_SELECTED_MEMBER_ID'; value: string }
  | { type: 'SET_DATE'; value: string }
  | { type: 'SET_START_TIME'; value: string }
  | { type: 'SET_END_TIME'; value: string }
  | { type: 'SET_IS_RECURRING'; value: boolean }
  | { type: 'SET_SERVICE_TYPE_ID'; value: string }
  | { type: 'SET_CUSTOM_SERVICE_NAME'; value: string }
  | { type: 'SET_CUSTOM_FEE'; value: string }
  | { type: 'SET_SERVICE_TYPES'; value: ServiceType[] }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_ERROR'; value: string }
  | { type: 'SET_TRAINER_AND_MEMBER'; trainerId: string; memberId: string };

function createSessionReducer(state: CreateSessionState, action: CreateSessionAction): CreateSessionState {
  switch (action.type) {
    case 'SET_TRAINER_ID': return { ...state, trainerId: action.value };
    case 'SET_SELECTED_MEMBER_ID': return { ...state, selectedMemberId: action.value };
    case 'SET_DATE': return { ...state, date: action.value };
    case 'SET_START_TIME': return { ...state, startTime: action.value };
    case 'SET_END_TIME': return { ...state, endTime: action.value };
    case 'SET_IS_RECURRING': return { ...state, isRecurring: action.value };
    case 'SET_SERVICE_TYPE_ID': return { ...state, serviceTypeId: action.value };
    case 'SET_CUSTOM_SERVICE_NAME': return { ...state, customServiceName: action.value };
    case 'SET_CUSTOM_FEE': return { ...state, customFee: action.value };
    case 'SET_SERVICE_TYPES': return { ...state, serviceTypes: action.value };
    case 'SET_LOADING': return { ...state, loading: action.value };
    case 'SET_ERROR': return { ...state, error: action.value };
    case 'SET_TRAINER_AND_MEMBER': return { ...state, trainerId: action.trainerId, selectedMemberId: action.memberId };
    default: return state;
  }
}

export function CreateSessionModal({
  open,
  defaultDate,
  defaultStartTime,
  trainers,
  members,
  currentUserRole,
  currentUserId,
  onSuccess,
  onClose,
}: CreateSessionModalProps) {
  const defaultTrainerId =
    currentUserRole === 'trainer' ? currentUserId : (trainers[0]?._id ?? '');

  const initialFilteredMembers = members.filter(
    (m) => m.trainerId === defaultTrainerId,
  );

  const [state, dispatch] = useReducer(createSessionReducer, {
    trainerId: defaultTrainerId,
    selectedMemberId: initialFilteredMembers[0]?._id ?? '',
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
  const { trainerId, selectedMemberId, date, startTime, endTime, isRecurring, serviceTypeId, customServiceName, customFee, serviceTypes, loading, error } = state;

  // oxlint-disable-next-line react-doctor/no-fetch-in-effect
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch('/api/service-types/active', { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { serviceTypes: ServiceType[] }) => dispatch({ type: 'SET_SERVICE_TYPES', value: data.serviceTypes ?? [] }))
      .catch((err: unknown) => { if (err instanceof Error && err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [open]);

  const filteredMembers = members.filter((m) => m.trainerId === trainerId);
  const isCustomService = serviceTypeId === '__custom__';
  const selectedServiceType = isCustomService ? null : (serviceTypes.find((st) => st._id === serviceTypeId) ?? null);

  async function handleSubmit() {
    if (!selectedMemberId) {
      dispatch({ type: 'SET_ERROR', value: 'Select a member' });
      return;
    }
    if (!endTime) {
      dispatch({ type: 'SET_ERROR', value: 'End time is required' });
      return;
    }
    if (!serviceTypeId) {
      dispatch({ type: 'SET_ERROR', value: 'Select a service type or choose Custom' });
      return;
    }
    if (isCustomService && (!customServiceName.trim() || !customFee.trim())) {
      dispatch({ type: 'SET_ERROR', value: 'Enter a service name and fee' });
      return;
    }
    dispatch({ type: 'SET_ERROR', value: '' });
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      const body = isCustomService
        ? { trainerId, memberIds: [selectedMemberId], date, startTime, endTime, isRecurring,
            serviceTypeId: null, customServiceName: customServiceName.trim(), customFee: parseFloat(customFee) }
        : { trainerId, memberIds: [selectedMemberId], date, startTime, endTime, isRecurring,
            serviceTypeId, customServiceName: null, customFee: null };
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        dispatch({ type: 'SET_ERROR', value: 'Failed to create session' });
        return;
      }
      onSuccess();
      onClose();
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>New Training Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {currentUserRole === 'owner' && (
            <div>
              <Label>Trainer</Label>
              <select
                className="w-full mt-1 bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white"
                value={trainerId}
                onChange={(e) => {
                  const newTrainerId = e.target.value;
                  const first = members.find((m) => m.trainerId === newTrainerId);
                  dispatch({ type: 'SET_TRAINER_AND_MEMBER', trainerId: newTrainerId, memberId: first?._id ?? '' });
                }}
              >
                {trainers.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label>Member</Label>
            <select
              className="w-full mt-1 bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white"
              value={selectedMemberId}
              onChange={(e) => dispatch({ type: 'SET_SELECTED_MEMBER_ID', value: e.target.value })}
            >
              <option value="">Select member</option>
              {filteredMembers.map((m) => (
                <option key={m._id} value={m._id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="sessionDate">Date</Label>
            <Input
              id="sessionDate"
              type="date"
              className="mt-1"
              value={date}
              onChange={(e) => dispatch({ type: 'SET_DATE', value: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                className="mt-1"
                value={startTime}
                onChange={(e) => dispatch({ type: 'SET_START_TIME', value: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                className="mt-1"
                value={endTime}
                onChange={(e) => dispatch({ type: 'SET_END_TIME', value: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_IS_RECURRING', value: false })}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                !isRecurring ? 'bg-blue-600 text-white' : 'bg-[#1e1e2e] text-[#888]'
              }`}
            >
              Once
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_IS_RECURRING', value: true })}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                isRecurring ? 'bg-blue-600 text-white' : 'bg-[#1e1e2e] text-[#888]'
              }`}
            >
              Weekly Recurring
            </button>
          </div>

          <div>
            <Label htmlFor="serviceType">
              Service Type <span className="text-destructive">*</span>
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <select
                id="serviceType"
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
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
