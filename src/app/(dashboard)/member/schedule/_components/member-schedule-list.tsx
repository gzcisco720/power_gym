'use client';

import type { SessionDto } from './types';
import { MemberScheduleHero, daysUntil } from './member-schedule-hero';
import { MemberScheduleTimeline } from './member-schedule-timeline';
import { MemberScheduleHistory } from './member-schedule-history';

interface Props {
  upcoming: SessionDto[];
  history: SessionDto[];
}

export function MemberScheduleList({ upcoming, history }: Props) {
  const hero = upcoming[0] ?? null;
  const timeline = upcoming.slice(1);
  const heroIsToday = hero ? daysUntil(hero.date) === 0 : false;

  return (
    <div className="px-4 sm:px-8 py-6 space-y-5">
      <MemberScheduleHero session={hero} />
      <MemberScheduleTimeline sessions={timeline} heroIsToday={heroIsToday} />
      <MemberScheduleHistory sessions={history} defaultOpen={!hero} />
    </div>
  );
}
