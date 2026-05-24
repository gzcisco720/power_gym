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
  const [serviceTypeId, setServiceTypeId] = useState<string>(
    session.customServiceName ? '__custom__' : (session.serviceTypeId ?? ''),
  );
  const [customServiceName, setCustomServiceName] = useState(session.customServiceName ?? '');
  const [customFee, setCustomFee] = useState(session.customFee != null ? String(session.customFee) : '');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);

  const isRecurring = session.seriesId !== null;

  useEffect(() => {
    if (!open) return;
    fetch('/api/service-types/active')
      .then((r) => r.json())
      .then((data: { serviceTypes: ServiceType[] }) => setServiceTypes(data.serviceTypes ?? []))
      .catch(() => {});
  }, [open]);

  const isCustomService = serviceTypeId === '__custom__';
  const selectedServiceType = isCustomService ? null : (serviceTypes.find((st) => st._id === serviceTypeId) ?? null);

  async function executeAction(scope: Scope) {
    setLoading(true);
    setError('');
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
            <div>
              <Label htmlFor="editServiceType">Service Type</Label>
              <div className="mt-1 flex items-center gap-2">
                <select
                  id="editServiceType"
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
