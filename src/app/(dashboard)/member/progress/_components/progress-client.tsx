'use client';

import { MemberHeatmapClient } from '@/app/(dashboard)/member/_components/member-heatmap-client';
import { MemberStrengthSelectorClient } from '@/app/(dashboard)/member/_components/member-strength-selector-client';

interface ProgressClientProps {
  heatmapData: { date: string }[];
  exercises: { exerciseId: string; exerciseName: string }[];
  memberId: string;
  title?: string;
}

export function ProgressClient({
  heatmapData,
  exercises,
  memberId,
  title,
}: ProgressClientProps) {
  return (
    <div>
      {title && (
        <div className="px-4 sm:px-8 pt-6 pb-2">
          <h1 className="text-[20px] font-semibold text-foreground">{title}</h1>
        </div>
      )}
      <div className="space-y-8 py-6">
        <section className="px-4 sm:px-8">
          <MemberHeatmapClient heatmapData={heatmapData} />
        </section>

        <section className="px-4 sm:px-8">
          <MemberStrengthSelectorClient exercises={exercises} memberId={memberId} />
        </section>
      </div>
    </div>
  );
}
