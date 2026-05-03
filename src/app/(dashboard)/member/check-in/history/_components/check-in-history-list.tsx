'use client';

import type { ICheckIn } from '@/lib/db/models/check-in.model';

interface Props {
  checkIns: ICheckIn[];
}

const RATING_LABELS: { key: keyof ICheckIn; label: string }[] = [
  { key: 'sleepQuality', label: 'Sleep' },
  { key: 'energy', label: 'Energy' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'stress', label: 'Stress' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'hunger', label: 'Hunger' },
  { key: 'digestion', label: 'Digestion' },
];

function formatDate(val: string | Date) {
  return new Date(val).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

const DIET_LABEL: Record<string, string> = {
  yes: 'Stuck to diet',
  no: 'Did not stick to diet',
  partial: 'Partially stuck to diet',
};

export function CheckInHistoryList({ checkIns }: Props) {
  if (checkIns.length === 0) {
    return (
      <p className="text-[14px] text-[#555]">No check-ins yet. Submit your first one above.</p>
    );
  }

  return (
    <div className="space-y-4">
      {checkIns.map((ci) => {
        const id = String((ci as ICheckIn & { _id: unknown })._id);
        return (
          <div key={id} className="rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] p-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[13px] font-semibold text-white">
                {formatDate(ci.submittedAt)}
              </span>
              <span className="text-[11px] text-[#555]">{DIET_LABEL[ci.stuckToDiet]}</span>
            </div>

            <div className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
              {RATING_LABELS.map(({ key, label }) => (
                <div key={key} className="text-center">
                  <div className="text-[18px] font-bold text-white">
                    {String(ci[key])}
                  </div>
                  <div className="text-[9px] uppercase tracking-[1px] text-[#555]">{label}</div>
                </div>
              ))}
            </div>

            {(ci.weight || ci.sleepHours) && (
              <div className="flex flex-wrap gap-3 text-[12px] text-[#666]">
                {ci.weight && <span>Weight: <strong className="text-[#999]">{ci.weight} kg</strong></span>}
                {ci.waist && <span>Waist: <strong className="text-[#999]">{ci.waist} cm</strong></span>}
                {ci.sleepHours && <span>Sleep: <strong className="text-[#999]">{ci.sleepHours} hrs</strong></span>}
                {ci.steps && <span>Steps: <strong className="text-[#999]">{ci.steps}</strong></span>}
              </div>
            )}

            {ci.photos && ci.photos.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {ci.photos.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={url} alt={`Photo ${i + 1}`} className="h-16 w-16 rounded object-cover" />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
