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
import { Textarea } from '@/components/ui/textarea';

interface ServiceType {
  _id: string;
  name: string;
  durationMin: number;
  pricePerSession: number;
  currency: string;
  note: string | null;
  isActive: boolean;
}

interface ServiceTypeDialogProps {
  open: boolean;
  serviceType?: ServiceType;
  onSuccess: () => void;
  onClose: () => void;
}

export function ServiceTypeDialog({ open, serviceType, onSuccess, onClose }: ServiceTypeDialogProps) {
  const isEdit = !!serviceType;
  const [name, setName] = useState(serviceType?.name ?? '');
  const [durationMin, setDurationMin] = useState(String(serviceType?.durationMin ?? 60));
  const [pricePerSession, setPricePerSession] = useState(String(serviceType?.pricePerSession ?? ''));
  const [note, setNote] = useState(serviceType?.note ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) { setError('Name is required'); return; }
    const dur = Number(durationMin);
    const price = Number(pricePerSession);
    if (!dur || dur < 1) { setError('Duration must be at least 1 minute'); return; }
    if (isNaN(price) || price < 0) { setError('Price must be a non-negative number'); return; }

    setError('');
    setLoading(true);
    try {
      const url = isEdit ? `/api/service-types/${serviceType._id}` : '/api/service-types';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          durationMin: dur,
          pricePerSession: price,
          note: note.trim() || null,
        }),
      });
      if (!res.ok) { setError('Failed to save'); return; }
      onSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate() {
    if (!serviceType) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/service-types/${serviceType._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !serviceType.isActive }),
      });
      if (!res.ok) { setError('Failed to update'); return; }
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
          <DialogTitle>{isEdit ? 'Edit Service Type' : 'Add Service Type'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="stName">Name</Label>
            <Input
              id="stName"
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="1hr Personal Training"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="stDur">Duration (min)</Label>
              <Input
                id="stDur"
                type="text"
                inputMode="decimal"
                className="mt-1"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="stPrice">Price (AUD)</Label>
              <Input
                id="stPrice"
                type="text"
                inputMode="decimal"
                className="mt-1"
                value={pricePerSession}
                onChange={(e) => setPricePerSession(e.target.value)}
                placeholder="300"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="stNote">
              Note <span className="text-foreground/40">(optional)</span>
            </Label>
            <Textarea
              id="stNote"
              className="mt-1 resize-none"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Includes program design and session recap"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {isEdit && (
            <Button
              variant="ghost"
              onClick={handleDeactivate}
              disabled={loading}
              className="sm:mr-auto text-foreground/40"
            >
              {serviceType.isActive ? 'Deactivate' : 'Reactivate'}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
