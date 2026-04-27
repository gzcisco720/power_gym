'use client';

import { useState } from 'react';
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

interface Trainer {
  _id: string;
  name: string;
}
interface Member {
  _id: string;
  name: string;
  trainerId: string;
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

function addOneHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const totalMin = h * 60 + m + 60;
  const hh = Math.min(Math.floor(totalMin / 60), 23);
  const mm = totalMin % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
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
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>(
    initialFilteredMembers.length > 0 ? [initialFilteredMembers[0]._id] : [],
  );
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState(defaultStartTime);
  const [endTime, setEndTime] = useState(addOneHour(defaultStartTime));
  const [isRecurring, setIsRecurring] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filteredMembers = members.filter((m) => m.trainerId === trainerId);

  function toggleMember(id: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit() {
    if (selectedMemberIds.length === 0) {
      setError('Select at least one member');
      return;
    }
    if (!endTime) {
      setError('End time is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId,
          memberIds: selectedMemberIds,
          date,
          startTime,
          endTime,
          isRecurring,
        }),
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
                  setTrainerId(e.target.value);
                  setSelectedMemberIds([]);
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
            <Label>Members</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {filteredMembers.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  onClick={() => toggleMember(m._id)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedMemberIds.includes(m._id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#1e1e2e] text-[#888] hover:text-white'
                  }`}
                >
                  {m.name}
                </button>
              ))}
              {filteredMembers.length === 0 && (
                <span className="text-xs text-[#555]">
                  No members for this trainer
                </span>
              )}
            </div>
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
