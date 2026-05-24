'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PhotoItem {
  key: string;
  photoUrl: string;
  submittedAt: string;
  weight: number | null;
}

interface Props {
  photos: PhotoItem[];
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function PhotosClient({ photos }: Props) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<PhotoItem[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  function enterSelect() {
    setSelectMode(true);
    setSelected([]);
  }

  function exitSelect() {
    setSelectMode(false);
    setSelected([]);
    setCompareOpen(false);
  }

  function togglePhoto(photo: PhotoItem) {
    if (!selectMode) return;
    const idx = selected.findIndex((s) => s.key === photo.key);
    if (idx !== -1) {
      setSelected((prev) => prev.filter((s) => s.key !== photo.key));
    } else if (selected.length < 2) {
      setSelected((prev) => [...prev, photo]);
    }
  }

  function badgeFor(photo: PhotoItem): number | null {
    const idx = selected.findIndex((s) => s.key === photo.key);
    return idx === -1 ? null : idx + 1;
  }

  // Sort selected by date: left = older, right = newer
  const sortedSelected = [...selected].sort(
    (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime(),
  );
  const compareLeft = sortedSelected[0];
  const compareRight = sortedSelected[1];

  if (photos.length === 0) {
    return (
      <div className="px-4 sm:px-8 py-7">
        <p className="text-sm text-foreground/40">No photos submitted in any check-in yet.</p>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-7 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {selectMode ? (
          <>
            <span className="text-[13px] text-primary-light font-medium">
              {selected.length === 0 ? 'Tap to select photos' : `${selected.length} of 2 selected`}
            </span>
            <button
              type="button"
              onClick={exitSelect}
              className="text-[12px] text-foreground/45 hover:text-foreground/70 transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <span className="text-[12px] text-foreground/40">{photos.length} photos</span>
            <button
              type="button"
              onClick={enterSelect}
              className="bg-primary/12 border border-primary/25 text-primary-light rounded-lg px-3 py-1.5 text-[12px] font-semibold hover:bg-primary/20 transition-colors"
            >
              Select
            </button>
          </>
        )}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-4 gap-2">
        {photos.map((photo) => {
          const badge = badgeFor(photo);
          const isSelected = badge !== null;
          const isDimmed = selectMode && selected.length === 2 && !isSelected;

          return (
            <button
              key={photo.key}
              type="button"
              onClick={() => togglePhoto(photo)}
              className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all text-left ${
                isSelected
                  ? 'border-primary'
                  : 'border-transparent'
              } ${isDimmed ? 'opacity-35' : 'opacity-100'} ${!selectMode ? 'cursor-default' : 'cursor-pointer'}`}
            >
              <Image
                src={photo.photoUrl}
                alt={`Check-in photo ${formatDate(photo.submittedAt)}`}
                fill
                className="object-cover"
              />
              {/* Date label */}
              <div className="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent">
                <span className="text-[9px] text-white/80">{formatDate(photo.submittedAt)}</span>
              </div>
              {/* Selection badge */}
              {isSelected && (
                <div className="absolute top-1.5 left-1.5 size-5 bg-primary rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                  {badge}
                </div>
              )}
              {/* Empty circle in select mode (unselected, not dimmed) */}
              {selectMode && !isSelected && !isDimmed && (
                <div className="absolute top-1.5 left-1.5 size-5 border-2 border-white/50 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Compare bar — sticky at bottom when 2 photos selected */}
      {selectMode && selected.length === 2 && (
        <div className="sticky bottom-0 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 bg-background/95 backdrop-blur-sm border-t border-border/60 flex items-center justify-between mt-4">
          <span className="text-[12px] text-foreground/50">
            {compareLeft && formatDate(compareLeft.submittedAt)} · {compareRight && formatDate(compareRight.submittedAt)}
          </span>
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="bg-primary text-white rounded-lg px-5 py-2 text-[13px] font-semibold hover:bg-primary/90 transition-colors"
          >
            Compare Photos
          </button>
        </div>
      )}

      {/* Compare popup */}
      {compareOpen && compareLeft && compareRight && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="button"
          tabIndex={-1}
          aria-label="Close comparison"
          onClick={(e) => { if (e.target === e.currentTarget) setCompareOpen(false); }}
          onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) setCompareOpen(false); }}
        >
          <div className="bg-card border border-foreground/10 rounded-2xl p-6 w-full max-w-xl">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[15px] font-bold text-foreground">Photo Comparison</span>
              <button
                type="button"
                onClick={() => setCompareOpen(false)}
                className="size-7 rounded-md bg-muted flex items-center justify-center text-foreground/50 hover:text-foreground transition-colors"
                aria-label="Close comparison"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[compareLeft, compareRight].map((photo) => (
                <div key={photo.key}>
                  <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-3">
                    <Image
                      src={photo.photoUrl}
                      alt={`Check-in ${formatDate(photo.submittedAt)}`}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="text-[11px] text-foreground/40 mb-2">{formatDate(photo.submittedAt)}</div>
                  {photo.weight !== null ? (
                    <div>
                      <div className="text-[18px] font-bold text-foreground leading-none">
                        {photo.weight}
                        <span className="text-[11px] font-medium text-foreground/40 ml-1">kg</span>
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-foreground/30 mt-0.5">Weight</div>
                    </div>
                  ) : (
                    <div className="text-[12px] text-foreground/30">No weight recorded</div>
                  )}
                </div>
              ))}
            </div>

            {/* Delta row */}
            {compareLeft.weight !== null && compareRight.weight !== null && (() => {
              const delta = compareRight.weight - compareLeft.weight;
              const isDown = delta < 0;
              const weeksApart = Math.abs(
                Math.round(
                  (new Date(compareRight.submittedAt).getTime() - new Date(compareLeft.submittedAt).getTime()) /
                    (1000 * 60 * 60 * 24 * 7),
                ),
              );
              return (
                <div className="mt-4 pt-4 border-t border-foreground/8 flex items-center gap-4">
                  <span className={`text-[13px] font-medium ${isDown ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isDown ? '▼' : '▲'} {Math.abs(delta).toFixed(1)} kg
                  </span>
                  <span className="text-[11px] text-foreground/30 ml-auto">
                    {weeksApart} {weeksApart === 1 ? 'week' : 'weeks'} apart
                  </span>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
