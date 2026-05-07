'use client';

import Link from 'next/link';
import { SectionHeader } from '@/components/shared/section-header';
import type { ICheckIn } from '@/lib/db/models/check-in.model';

interface Props {
  memberId: string;
  checkIns: ICheckIn[];
}

function formatDate(val: string | Date) {
  return new Date(val).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

const DIET_LABEL: Record<string, string> = {
  yes: 'Stuck',
  no: 'Off track',
  partial: 'Partial',
};

export function CheckInList({ memberId, checkIns }: Props) {
  return (
    <section className="px-4 sm:px-8">
      <SectionHeader title={`Check-In History${checkIns.length ? ` (${checkIns.length})` : ''}`} />
      {checkIns.length === 0 ? (
        <div className="mt-3 rounded-xl bg-card ring-1 ring-foreground/10 px-4 py-4">
          <p className="text-sm text-foreground/65">No check-ins submitted yet.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {checkIns.map((ci) => {
            const id = String((ci as ICheckIn & { _id: unknown })._id);
            const avgRating = Math.round(
              (ci.sleepQuality + ci.energy + ci.recovery + ci.stress + ci.fatigue + ci.hunger + ci.digestion) / 7,
            );
            return (
              <li key={id}>
                <Link
                  href={`/trainer/members/${memberId}/check-ins/${id}`}
                  className="block rounded-xl bg-card ring-1 ring-foreground/10 px-3 py-2 hover:ring-foreground/25 transition-colors"
                >
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-foreground">
                      {formatDate(ci.submittedAt)}
                    </span>
                    <div className="ml-auto flex items-center gap-3 text-xs text-foreground/65 tabular-nums">
                      <span>
                        Avg <strong className="text-foreground">{avgRating}</strong>/10
                      </span>
                      {ci.weight !== null && ci.weight !== undefined && (
                        <>
                          <span className="text-foreground/40">·</span>
                          <span>
                            <strong className="text-foreground">{ci.weight}</strong> kg
                          </span>
                        </>
                      )}
                      <span className="text-foreground/40">·</span>
                      <span>{DIET_LABEL[ci.stuckToDiet]}</span>
                      {ci.photos?.length > 0 && (
                        <>
                          <span className="text-foreground/40">·</span>
                          <span>{ci.photos.length} 📷</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
