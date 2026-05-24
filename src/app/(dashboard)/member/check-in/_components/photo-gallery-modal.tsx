'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

interface PhotoEntry {
  url: string;
  submittedAt: string;
}

interface MonthGroup {
  label: string;
  photos: PhotoEntry[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  photos: PhotoEntry[];
  totalCount: number;
}

function groupByMonth(photos: PhotoEntry[]): MonthGroup[] {
  const map = new Map<string, PhotoEntry[]>();
  for (const p of photos) {
    const key = format(new Date(p.submittedAt), 'MMMM yyyy');
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return Array.from(map.entries()).map(([label, ps]) => ({ label, photos: ps }));
}

interface LightboxProps {
  photos: PhotoEntry[];
  initialIdx: number;
  onClose: () => void;
}

function Lightbox({ photos, initialIdx, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(initialIdx);
  const photo = photos[idx];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIdx(i => Math.min(photos.length - 1, i + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [photos.length, onClose]);

  return (
    <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 z-10" role="dialog" aria-modal="true">
      <div className="absolute top-3 left-4 right-4 flex items-center justify-between">
        <button type="button" onClick={onClose} className="text-xs text-foreground/45">← All photos</button>
        <span className="text-xs text-foreground/35">{idx + 1} / {photos.length}</span>
        <button type="button" onClick={onClose} aria-label="Close lightbox" className="w-8 h-8 rounded-lg bg-foreground/[0.07] border border-foreground/10 flex items-center justify-center text-foreground/60">✕</button>
      </div>

      <div className="max-h-[60vh] max-w-[300px] rounded-xl overflow-hidden border border-foreground/10 shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt="" className="w-full display-block" />
      </div>
      <div className="text-center">
        <div className="text-sm font-semibold">{format(new Date(photo.submittedAt), 'd MMMM yyyy')}</div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="bg-foreground/[0.08] border border-foreground/[0.12] text-foreground/70 rounded-lg px-5 py-2 text-xs disabled:opacity-30"
        >
          ← Prev
        </button>
        <button
          type="button"
          onClick={() => setIdx(i => Math.min(photos.length - 1, i + 1))}
          disabled={idx === photos.length - 1}
          className="bg-foreground/[0.08] border border-foreground/[0.12] text-foreground/70 rounded-lg px-5 py-2 text-xs disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export function PhotoGalleryModal({ open, onClose, photos, totalCount }: Props) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxIdx === null) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, lightboxIdx, onClose]);

  if (!open) return null;

  const sorted = [...photos].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
  const groups = groupByMonth(sorted);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" role="dialog" aria-modal="true">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 h-12 flex-shrink-0 border-b border-foreground/[0.07] bg-foreground/[0.03]">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onClose} className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors">
            ← Dashboard
          </button>
          <span className="text-sm font-semibold">Progress Photos</span>
          <span className="text-xs text-foreground/35">{totalCount} total</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close gallery"
          className="w-8 h-8 rounded-lg bg-foreground/[0.07] border border-foreground/10 text-foreground/60 flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto px-5 py-5 pb-8 relative">
        {groups.map(group => (
          <div key={group.label} className="mb-6">
            <div className="flex items-baseline gap-2 mb-2.5">
              <span className="text-sm font-semibold">{group.label}</span>
              <span className="text-xs text-foreground/30">{group.photos.length} photos</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              {group.photos.map((photo) => {
                const globalIdx = sorted.indexOf(photo);
                return (
                  <button
                    type="button"
                    key={photo.url}
                    onClick={() => setLightboxIdx(globalIdx >= 0 ? globalIdx : 0)}
                    className="aspect-[3/4] rounded-lg overflow-hidden border-2 border-foreground/[0.06] hover:border-foreground/[0.18] transition-colors relative"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" className="w-full h-full object-cover block" />
                    <div className="absolute bottom-0 inset-x-0 py-1 px-1.5 bg-gradient-to-t from-background/75 to-transparent text-[9px] text-foreground/55">
                      {format(new Date(photo.submittedAt), 'd MMM')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {lightboxIdx !== null && (
          <Lightbox
            photos={sorted}
            initialIdx={lightboxIdx}
            onClose={() => setLightboxIdx(null)}
          />
        )}
      </div>
    </div>
  );
}
