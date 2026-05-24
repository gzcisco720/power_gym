'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import type { CheckInRecord } from '@/lib/check-in-stats';
import { CompareModal } from './compare-modal';

interface Props {
  checkInsWithPhotos: CheckInRecord[];
}

export function CompareCard({ checkInsWithPhotos }: Props) {
  const [beforeId, setBeforeId] = useState<string>(checkInsWithPhotos[1]?._id ?? '');
  const [afterId, setAfterId] = useState<string>(checkInsWithPhotos[0]?._id ?? '');
  const [beforePhotoIdx, setBeforePhotoIdx] = useState(0);
  const [afterPhotoIdx, setAfterPhotoIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  const beforeCheckIn = checkInsWithPhotos.find(c => c._id === beforeId) ?? null;
  const afterCheckIn  = checkInsWithPhotos.find(c => c._id === afterId)  ?? null;

  if (checkInsWithPhotos.length < 2) return null;

  return (
    <>
      <div className="bg-card ring-1 ring-foreground/10 rounded-[14px] p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-foreground/45 mb-3">
          Before / After Compare
        </div>

        {/* Selectors */}
        <div className="flex flex-col gap-1.5 mb-3">
          {[
            { label: 'Before', id: beforeId, setId: setBeforeId, colour: 'text-primary-light' },
            { label: 'After',  id: afterId,  setId: setAfterId,  colour: 'text-emerald-400' },
          ].map(({ label, id, setId, colour }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold min-w-[36px] ${colour}`}>{label}</span>
              <select
                value={id}
                onChange={e => setId(e.target.value)}
                className="flex-1 bg-foreground/[0.06] border border-foreground/10 text-foreground/65 rounded-lg px-2.5 py-1.5 text-xs outline-none appearance-none"
              >
                {checkInsWithPhotos.map(c => (
                  <option key={c._id} value={c._id}>
                    {format(new Date(c.submittedAt), 'd MMM yyyy')}
                    {c.weight ? ` · ${c.weight} kg` : ''}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Preview thumbnails */}
        {beforeCheckIn && afterCheckIn && (
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {[
              { checkIn: beforeCheckIn, idx: beforePhotoIdx, setIdx: setBeforePhotoIdx },
              { checkIn: afterCheckIn,  idx: afterPhotoIdx,  setIdx: setAfterPhotoIdx  },
            ].map(({ checkIn, idx, setIdx }) => (
              <button
                type="button"
                key={checkIn._id}
                className="aspect-[3/4] rounded-lg overflow-hidden border border-foreground/[0.07] relative cursor-pointer"
                onClick={() => setIdx((idx + 1) % checkIn.photos.length)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={checkIn.photos[idx]}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 py-1 px-1.5 bg-background/80 text-[9px] text-foreground/55 text-center">
                  {format(new Date(checkIn.submittedAt), 'd MMM')}
                  {checkIn.weight ? ` · ${checkIn.weight} kg` : ''}
                </div>
              </button>
            ))}
          </div>
        )}

        <p className="text-[10px] text-foreground/25 text-center mb-2.5">Tap a photo to switch angle</p>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          disabled={!beforeCheckIn || !afterCheckIn}
          className="w-full bg-primary/10 border border-primary/[0.28] text-primary-light rounded-lg py-2 text-xs font-semibold hover:bg-primary/15 transition-colors disabled:opacity-40"
        >
          Open Full Comparison →
        </button>
      </div>

      <CompareModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        beforeCheckIn={beforeCheckIn}
        afterCheckIn={afterCheckIn}
      />
    </>
  );
}
