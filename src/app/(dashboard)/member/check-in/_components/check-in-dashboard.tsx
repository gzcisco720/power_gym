'use client';

import type { CheckInRecord, Achievements, BodyMetricsResult, HeatmapCell } from '@/lib/check-in-stats';
import { avgWellnessScore } from '@/lib/check-in-stats';
import { format } from 'date-fns';
import { AchievementCards } from './achievement-cards';
import { WellnessBreakdown } from './wellness-breakdown';
import { BodyMetrics } from './body-metrics';
import { HistoryList } from './history-list';
import { ThisWeekCard } from './this-week-card';
import { CompareCard } from './compare-card';
import { RecentPhotos } from './recent-photos';

interface PhotoEntry { url: string; submittedAt: string }

interface Props {
  checkIns: CheckInRecord[];
  hasThisWeek: boolean;
  achievements: Achievements;
  bodyMetrics: BodyMetricsResult;
  heatmap: HeatmapCell[];
  checkInsWithPhotos: CheckInRecord[];
  allPhotos: PhotoEntry[];
}

export function CheckInDashboard({
  checkIns,
  hasThisWeek,
  achievements,
  bodyMetrics,
  heatmap,
  checkInsWithPhotos,
  allPhotos,
}: Props) {
  const latestCheckIn = checkIns[0] ?? null;
  const thisWeekCheckIn = hasThisWeek ? latestCheckIn : null;
  const recentFive = checkIns.slice(0, 5);
  const recentSixPhotos = allPhotos.slice(-6).reverse();

  return (
    <div className="px-4 sm:px-8 py-6 max-w-[1200px] mx-auto">
      <AchievementCards achievements={achievements} />

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3.5 items-start">

        {/* Left column */}
        <div className="flex flex-col gap-3.5 order-2 lg:order-1">
          <WellnessBreakdown checkIn={latestCheckIn} />
          <BodyMetrics metrics={bodyMetrics} />
          <HistoryList checkIns={recentFive} totalCount={checkIns.length} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3.5 order-1 lg:order-2">
          <ThisWeekCard
            hasThisWeek={hasThisWeek}
            heatmap={heatmap}
            submittedDate={thisWeekCheckIn ? format(new Date(thisWeekCheckIn.submittedAt), 'd MMM') : undefined}
            avgWellness={thisWeekCheckIn ? avgWellnessScore(thisWeekCheckIn) : undefined}
            weight={thisWeekCheckIn?.weight}
          />
          <CompareCard checkInsWithPhotos={checkInsWithPhotos} />
          <RecentPhotos
            recentPhotos={recentSixPhotos}
            allPhotos={allPhotos}
            totalCount={allPhotos.length}
          />
        </div>

      </div>
    </div>
  );
}
