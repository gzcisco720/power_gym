'use client';

import { useState, useEffect } from 'react';
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

  const [trainerId, setTrainerId] = useState(defaultTrainerId);
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    initialFilteredMembers[0]?._id ?? '',
  );
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(addOneHour(defaultStartTime));
  const [isRecurring, setIsRecurring] = useState(false);
  const [serviceTypeId, setServiceTypeId] = useState<string>('');
  const [customServiceName, setCustomServiceName] = useState('');
  const [customFee, setCustomFee] = useState('');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    fetch('/api/service-types/active')
      .then((r) => r.json())
      .then((data: { serviceTypes: ServiceType[] }) => setServiceTypes(data.serviceTypes ?? []))
      .catch(() => {});
  }, [open]);

  const filteredMembers = members.filter((m) => m.trainerId === trainerId);
  const isCustomService = serviceTypeId === '__custom__';
  const selectedServiceType = isCustomService ? null : (serviceTypes.find((st) => st._id === serviceTypeId) ?? null);

  async function handleSubmit() {
    if (!selectedMemberId) {
      setError('Select a member');
      return;
    }
    if (!endTime) {
      setError('End time is required');
      return;
    }
    if (!serviceTypeId) {
      setError('Select a service type or choose Custom');
      return;
    }
    if (isCustomService && (!customServiceName.trim() || !customFee.trim())) {
      setError('Enter a service name and fee');
      return;
    }
    setError('');
    setLoading(true);
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
        setError('Failed to create session');
        return;
      }
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
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
                  setTrainerId(newTrainerId);
                  const first = members.find((m) => m.trainerId === newTrainerId);
                  setSelectedMemberId(first?._id ?? '');
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
              onChange={(e) => setSelectedMemberId(e.target.value)}
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
              onChange={(e) => setDate(e.target.value)}
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
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                className="mt-1"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsRecurring(false)}
              className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                !isRecurring ? 'bg-blue-600 text-white' : 'bg-[#1e1e2e] text-[#888]'
              }`}
            >
              Once
            </button>
            <button
              type="button"
              onClick={() => setIsRecurring(true)}
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
                onChange={(e) => setServiceTypeId(e.target.value)}
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
                  onChange={(e) => setCustomServiceName(e.target.value)}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Fee (AUD)"
                  aria-label="Custom service fee (AUD)"
                  className="w-28 bg-[#111] border border-[#222] rounded px-3 py-2 text-sm text-white placeholder:text-foreground/40"
                  value={customFee}
                  onChange={(e) => setCustomFee(e.target.value)}
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
