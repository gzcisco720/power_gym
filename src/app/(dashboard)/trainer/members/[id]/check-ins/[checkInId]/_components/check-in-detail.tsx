'use client';

import { useState } from 'react';
import type { ICheckIn } from '@/lib/db/models/check-in.model';

interface Props {
  checkIn: ICheckIn;
  otherCheckIns: ICheckIn[];
}

const RATINGS: { key: keyof ICheckIn; label: string }[] = [
  { key: 'sleepQuality', label: 'Sleep Quality' },
  { key: 'energy', label: 'Energy' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'stress', label: 'Stress' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'digestion', label: 'Digestion' },
];

const DIET_LABEL: Record<string, string> = {
  yes: 'Stuck to diet',
  no: 'Did not stick to diet',
  partial: 'Partially stuck to diet',
};

function formatDate(val: string | Date) {
  return new Date(val).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

function RatingBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-[#1a1a1a]">
        <div
          className="h-1.5 rounded-full bg-white"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="w-4 text-right text-[12px] font-semibold text-white">{value}</span>
    </div>
  );
}

export function CheckInDetail({ checkIn, otherCheckIns }: Props) {
  const checkInId = String((checkIn as ICheckIn & { _id: unknown })._id);
  const [compareId, setCompareId] = useState<string>('');
  const compareCheckIn = otherCheckIns.find(
    (c) => String((c as ICheckIn & { _id: unknown })._id) === compareId,
  ) ?? null;

  return (
    <div className="space-y-8">
      {/* Ratings */}
      <section>
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#555]">
          Ratings
        </h3>
        <div className="space-y-3">
          {RATINGS.map(({ key, label }) => (
            <div key={key}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[12px] text-[#666]">{label}</span>
              </div>
              <RatingBar value={checkIn[key] as number} />
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section>
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#555]">
          Stats
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: 'Weight', value: checkIn.weight, unit: 'kg' },
            { label: 'Waist', value: checkIn.waist, unit: 'cm' },
            { label: 'Steps', value: checkIn.steps, unit: '' },
            { label: 'Exercise', value: checkIn.exerciseMinutes, unit: 'min' },
            { label: 'Walk/Run', value: checkIn.walkRunDistance, unit: 'km' },
            { label: 'Sleep', value: checkIn.sleepHours, unit: 'hrs' },
          ].map(({ label, value, unit }) => (
            <div key={label} className="rounded-md border border-[#1a1a1a] bg-[#0d0d0d] p-3">
              <div className="text-[11px] uppercase tracking-[1px] text-[#555]">{label}</div>
              <div className="mt-1 text-[18px] font-semibold text-white">
                {value != null ? `${value}${unit ? ` ${unit}` : ''}` : '—'}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Diet */}
      <section>
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#555]">
          Diet
        </h3>
        <p className="mb-2 text-[13px] font-medium text-[#999]">{DIET_LABEL[checkIn.stuckToDiet]}</p>
        {checkIn.dietDetails && (
          <p className="text-[13px] text-[#666]">{checkIn.dietDetails}</p>
        )}
      </section>

      {/* Wellbeing & Notes */}
      {(checkIn.wellbeing || checkIn.notes) && (
        <section className="space-y-3">
          {checkIn.wellbeing && (
            <div>
              <h4 className="mb-1 text-[11px] uppercase tracking-[1px] text-[#555]">Wellbeing</h4>
              <p className="text-[13px] text-[#888]">{checkIn.wellbeing}</p>
            </div>
          )}
          {checkIn.notes && (
            <div>
              <h4 className="mb-1 text-[11px] uppercase tracking-[1px] text-[#555]">Notes</h4>
              <p className="text-[13px] text-[#888]">{checkIn.notes}</p>
            </div>
          )}
        </section>
      )}

      {/* Photos + Comparison */}
      {checkIn.photos && checkIn.photos.length > 0 && (
        <section>
          <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#555]">
            Photos
          </h3>

          {otherCheckIns.length > 0 && (
            <div className="mb-4">
              <label className="mb-1 block text-[12px] text-[#666]">
                Compare with another check-in
              </label>
              <select
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
                className="rounded-md border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 text-[13px] text-white"
              >
                <option value="">— No comparison —</option>
                {otherCheckIns.map((c) => {
                  const cid = String((c as ICheckIn & { _id: unknown })._id);
                  return (
                    <option key={cid} value={cid}>
                      {formatDate(c.submittedAt)}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className={compareCheckIn ? 'grid grid-cols-2 gap-4' : 'flex flex-wrap gap-3'}>
            {compareCheckIn ? (
              <>
                {/* Current check-in photos */}
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-[1px] text-[#555]">
                    {formatDate(checkIn.submittedAt)}
                  </p>
                  <div className="space-y-2">
                    {checkIn.photos.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={`${checkInId}-${i}`} src={url} alt={`Photo ${i + 1}`} className="w-full rounded object-cover" />
                    ))}
                  </div>
                </div>
                {/* Comparison photos */}
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-[1px] text-[#555]">
                    {formatDate(compareCheckIn.submittedAt)}
                  </p>
                  <div className="space-y-2">
                    {compareCheckIn.photos.map((url, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={`compare-${i}`} src={url} alt={`Comparison photo ${i + 1}`} className="w-full rounded object-cover" />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              checkIn.photos.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-40 w-40 rounded object-cover" />
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
}
