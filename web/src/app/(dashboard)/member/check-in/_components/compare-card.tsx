'use client';

import { useReducer } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import type { CheckInRecord } from '@/lib/check-in-stats';
import { CompareModal } from './compare-modal';

interface Props {
  checkInsWithPhotos: CheckInRecord[];
}

interface CompareCardState {
  beforeId: string;
  afterId: string;
  beforePhotoIdx: number;
  afterPhotoIdx: number;
  modalOpen: boolean;
}

type CompareCardAction =
  | { type: 'SET_BEFORE_ID'; value: string }
  | { type: 'SET_AFTER_ID'; value: string }
  | { type: 'CYCLE_BEFORE_PHOTO'; max: number }
  | { type: 'CYCLE_AFTER_PHOTO'; max: number }
  | { type: 'SET_MODAL'; value: boolean };

function compareCardReducer(state: CompareCardState, action: CompareCardAction): CompareCardState {
  switch (action.type) {
    case 'SET_BEFORE_ID': return { ...state, beforeId: action.value, beforePhotoIdx: 0 };
    case 'SET_AFTER_ID': return { ...state, afterId: action.value, afterPhotoIdx: 0 };
    case 'CYCLE_BEFORE_PHOTO': return { ...state, beforePhotoIdx: (state.beforePhotoIdx + 1) % action.max };
    case 'CYCLE_AFTER_PHOTO': return { ...state, afterPhotoIdx: (state.afterPhotoIdx + 1) % action.max };
    case 'SET_MODAL': return { ...state, modalOpen: action.value };
    default: return state;
  }
}

export function CompareCard({ checkInsWithPhotos }: Props) {
  const [state, dispatch] = useReducer(compareCardReducer, {
    beforeId: checkInsWithPhotos[1]?._id ?? '',
    afterId: checkInsWithPhotos[0]?._id ?? '',
    beforePhotoIdx: 0,
    afterPhotoIdx: 0,
    modalOpen: false,
  });
  const { beforeId, afterId, beforePhotoIdx, afterPhotoIdx, modalOpen } = state;

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
            { label: 'Before', id: beforeId, onSet: (v: string) => dispatch({ type: 'SET_BEFORE_ID', value: v }), colour: 'text-primary-light' },
            { label: 'After',  id: afterId,  onSet: (v: string) => dispatch({ type: 'SET_AFTER_ID', value: v }),  colour: 'text-emerald-400' },
          ].map(({ label, id, onSet, colour }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold min-w-[36px] ${colour}`}>{label}</span>
              <select
                value={id}
                onChange={e => onSet(e.target.value)}
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
              { checkIn: beforeCheckIn, idx: beforePhotoIdx, onCycle: () => dispatch({ type: 'CYCLE_BEFORE_PHOTO', max: beforeCheckIn?.photos.length ?? 1 }) },
              { checkIn: afterCheckIn,  idx: afterPhotoIdx,  onCycle: () => dispatch({ type: 'CYCLE_AFTER_PHOTO',  max: afterCheckIn?.photos.length ?? 1 }) },
            ].map(({ checkIn, idx, onCycle }) => (
              <button
                type="button"
                key={checkIn._id}
                className="aspect-[3/4] rounded-lg overflow-hidden border border-foreground/[0.07] relative cursor-pointer"
                onClick={onCycle}
              >
                <Image
                  src={checkIn.photos[idx]}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover"
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
          onClick={() => dispatch({ type: 'SET_MODAL', value: true })}
          disabled={!beforeCheckIn || !afterCheckIn}
          className="w-full bg-primary/10 border border-primary/[0.28] text-primary-light rounded-lg py-2 text-xs font-semibold hover:bg-primary/15 transition-colors disabled:opacity-40"
        >
          Open Full Comparison →
        </button>
      </div>

      <CompareModal
        open={modalOpen}
        onClose={() => dispatch({ type: 'SET_MODAL', value: false })}
        beforeCheckIn={beforeCheckIn}
        afterCheckIn={afterCheckIn}
      />
    </>
  );
}
