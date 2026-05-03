'use client';

import Link from 'next/link';
import type { ICheckIn } from '@/lib/db/models/check-in.model';

interface Props {
  memberId: string;
  checkIns: ICheckIn[];
}

function formatDate(val: string | Date) {
  return new Date(val).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

const DIET_LABEL: Record<string, string> = {
  yes: 'Stuck to diet',
  no: 'Did not stick',
  partial: 'Partial',
};

export function CheckInList({ memberId, checkIns }: Props) {
  if (checkIns.length === 0) {
    return (
      <section>
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#555]">
          Check-In History
        </h3>
        <p className="text-[14px] text-[#555]">No check-ins submitted yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[1.5px] text-[#555]">
        Check-In History ({checkIns.length})
      </h3>
      <div className="space-y-3">
        {checkIns.map((ci) => {
          const id = String((ci as ICheckIn & { _id: unknown })._id);
          const avgRating = Math.round(
            (ci.sleepQuality + ci.energy + ci.recovery + ci.stress + ci.fatigue + ci.hunger + ci.digestion) / 7,
          );
          return (
            <Link
              key={id}
              href={`/trainer/members/${memberId}/check-ins/${id}`}
              className="block rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] p-4 transition-colors hover:border-[#333]"
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-white">
                  {formatDate(ci.submittedAt)}
                </span>
                <div className="flex items-center gap-4 text-[12px] text-[#666]">
                  <span>Avg rating: <strong className="text-[#999]">{avgRating}/10</strong></span>
                  {ci.weight && <span>Weight: <strong className="text-[#999]">{ci.weight} kg</strong></span>}
                  <span>{DIET_LABEL[ci.stuckToDiet]}</span>
                  {ci.photos?.length > 0 && (
                    <span className="text-[#555]">{ci.photos.length} photo{ci.photos.length > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
