'use client';

import { useEffect, useState } from 'react';
import type { CheckInRecord } from '@/lib/check-in-stats';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onClose: () => void;
  beforeCheckIn: CheckInRecord | null;
  afterCheckIn: CheckInRecord | null;
}

function PhotoColumn({ checkIn, side }: { checkIn: CheckInRecord; side: 'before' | 'after' }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const photos = checkIn.photos;
  const colour = side === 'before' ? 'text-primary-light' : 'text-emerald-400';

  return (
    <div className="flex flex-col min-h-0">
      <div className="px-3 py-2 border-b border-foreground/[0.06] bg-foreground/[0.02] flex-shrink-0">
        <span className={`text-[10px] font-semibold ${colour}`}>
          {side === 'before' ? 'Before' : 'After'} · {format(new Date(checkIn.submittedAt), 'd MMM yyyy')}
        </span>
        {checkIn.weight && (
          <span className="text-[10px] text-foreground/35 ml-2">{checkIn.weight} kg</span>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[selectedIdx]}
          alt={`${side} photo`}
          className="w-full h-full object-cover"
        />
      </div>
      {photos.length > 1 && (
        <div className="flex gap-1.5 p-2 border-t border-foreground/[0.06] flex-shrink-0">
          {photos.map((url, i) => (
            <button
              type="button"
              key={i}
              onClick={() => setSelectedIdx(i)}
              className={`w-10 h-12 rounded overflow-hidden border-2 flex-shrink-0 ${i === selectedIdx ? 'border-primary' : 'border-foreground/10'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CompareModal({ open, onClose, beforeCheckIn, afterCheckIn }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open || !beforeCheckIn || !afterCheckIn) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" role="dialog" aria-modal="true">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-12 flex-shrink-0 border-b border-foreground/[0.07] bg-foreground/[0.03]">
        <span className="text-sm font-semibold">Before / After Comparison</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close comparison"
          className="w-8 h-8 rounded-lg bg-foreground/[0.07] border border-foreground/10 text-foreground/60 flex items-center justify-center hover:bg-foreground/10 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Two columns */}
      <div className="flex flex-col md:flex-row flex-1 gap-px bg-foreground/[0.06] min-h-0">
        <div className="flex-1 bg-background min-h-0">
          <PhotoColumn checkIn={beforeCheckIn} side="before" />
        </div>
        <div className="flex-1 bg-background min-h-0">
          <PhotoColumn checkIn={afterCheckIn} side="after" />
        </div>
      </div>
    </div>
  );
}
