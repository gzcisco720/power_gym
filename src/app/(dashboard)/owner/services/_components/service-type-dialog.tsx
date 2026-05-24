'use client';

import { useReducer } from 'react';
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

interface ServiceTypeDialogState {
  name: string;
  durationMin: string;
  pricePerSession: string;
  note: string;
  loading: boolean;
  error: string;
}

type ServiceTypeDialogAction =
  | { type: 'SET_NAME'; value: string }
  | { type: 'SET_DURATION_MIN'; value: string }
  | { type: 'SET_PRICE_PER_SESSION'; value: string }
  | { type: 'SET_NOTE'; value: string }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_ERROR'; value: string };

function serviceTypeDialogReducer(state: ServiceTypeDialogState, action: ServiceTypeDialogAction): ServiceTypeDialogState {
  switch (action.type) {
    case 'SET_NAME': return { ...state, name: action.value };
    case 'SET_DURATION_MIN': return { ...state, durationMin: action.value };
    case 'SET_PRICE_PER_SESSION': return { ...state, pricePerSession: action.value };
    case 'SET_NOTE': return { ...state, note: action.value };
    case 'SET_LOADING': return { ...state, loading: action.value };
    case 'SET_ERROR': return { ...state, error: action.value };
    default: return state;
  }
}

export function ServiceTypeDialog({ open, serviceType, onSuccess, onClose }: ServiceTypeDialogProps) {
  const isEdit = !!serviceType;
  const [state, dispatch] = useReducer(serviceTypeDialogReducer, undefined, () => ({
    name: serviceType?.name ?? '',
    durationMin: String(serviceType?.durationMin ?? 60),
    pricePerSession: String(serviceType?.pricePerSession ?? ''),
    note: serviceType?.note ?? '',
    loading: false,
    error: '',
  }));
  const { name, durationMin, pricePerSession, note, loading, error } = state;

  async function handleSubmit() {
    if (!name.trim()) { dispatch({ type: 'SET_ERROR', value: 'Name is required' }); return; }
    const dur = Number(durationMin);
    const price = Number(pricePerSession);
    if (!dur || dur < 1) { dispatch({ type: 'SET_ERROR', value: 'Duration must be at least 1 minute' }); return; }
    if (isNaN(price) || price < 0) { dispatch({ type: 'SET_ERROR', value: 'Price must be a non-negative number' }); return; }

    dispatch({ type: 'SET_ERROR', value: '' });
    dispatch({ type: 'SET_LOADING', value: true });
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
      if (!res.ok) { dispatch({ type: 'SET_ERROR', value: 'Failed to save' }); return; }
      onSuccess();
      onClose();
    } finally {
      dispatch({ type: 'SET_LOADING', value: false });
    }
  }

  async function handleDeactivate() {
    if (!serviceType) return;
    dispatch({ type: 'SET_LOADING', value: true });
    try {
      const res = await fetch(`/api/service-types/${serviceType._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !serviceType.isActive }),
      });
      if (!res.ok) { dispatch({ type: 'SET_ERROR', value: 'Failed to update' }); return; }
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
          <DialogTitle>{isEdit ? 'Edit Service Type' : 'Add Service Type'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="stName">Name</Label>
            <Input
              id="stName"
              className="mt-1"
              value={name}
              onChange={(e) => dispatch({ type: 'SET_NAME', value: e.target.value })}
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
                onChange={(e) => dispatch({ type: 'SET_DURATION_MIN', value: e.target.value })}
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
                onChange={(e) => dispatch({ type: 'SET_PRICE_PER_SESSION', value: e.target.value })}
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
              onChange={(e) => dispatch({ type: 'SET_NOTE', value: e.target.value })}
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
