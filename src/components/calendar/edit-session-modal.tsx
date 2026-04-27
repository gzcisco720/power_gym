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
import { RecurringScopeDialog } from './recurring-scope-dialog';
import type { CalendarSession } from './week-calendar-grid';

type Scope = 'one' | 'future' | 'all';

interface EditSessionModalProps {
  open: boolean;
  session: CalendarSession;
  memberMap: Record<string, string>;
  onSuccess: () => void;
  onClose: () => void;
}

export function EditSessionModal({
  open,
  session,
  memberMap,
  onSuccess,
  onClose,
}: EditSessionModalProps) {
  const [startTime, setStartTime] = useState(session.startTime);
  const [endTime, setEndTime] = useState(session.endTime);
  const [action, setAction] = useState<'edit' | 'cancel' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isRecurring = session.seriesId !== null;

  async function executeAction(scope: Scope) {
    setLoading(true);
    setError('');
    try {
      if (action === 'edit') {
        const res = await fetch(`/api/schedule/${session._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, startTime, endTime }),
        });
        if (!res.ok) {
          setError('Failed to update');
          return;
        }
      } else {
        const res = await fetch(`/api/schedule/${session._id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope }),
        });
        if (!res.ok) {
          setError('Failed to cancel');
          return;
        }
      }
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
      setAction(null);
    }
  }

  function handleSave() {
    if (isRecurring) {
      setAction('edit');
    } else {
      void executeAction('one');
    }
  }

  function handleCancel() {
    if (isRecurring) {
      setAction('cancel');
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
              <p className="text-xs text-blue-400">🔄 This is a recurring session</p>
            )}
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Start Time</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label>End Time</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
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
          onCancel={() => setAction(null)}
        />
      )}
    </>
  );
}
