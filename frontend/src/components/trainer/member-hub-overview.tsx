import { useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { MemberStatStrip } from './member-stat-strip';
import { MemberPlanCard } from './member-plan-card';
import { MemberHealthPanel } from './member-health-panel';
import { useBodyTestsStore } from '@/stores/bodyTestsStore';
import { useTrainingStore } from '@/stores/trainingStore';
import { useMemberHealthStore } from '@/stores/memberHealthStore';
import { fetchSessions } from '@/api/training';
import type { WorkoutSession } from '@/api/training';
import type { BodyTest } from '@/api/body-tests';
import type { Injury } from '@/api/member-health';

interface MemberHubOverviewProps {
  memberId: string;
}

interface OverviewData {
  sessions: WorkoutSession[];
  bodyTests: BodyTest[];
  injuries: Injury[];
}

export function MemberHubOverview({ memberId }: MemberHubOverviewProps) {
  const fetchTests = useBodyTestsStore((s) => s.fetchTests);
  const fetchMemberPlan = useTrainingStore((s) => s.fetchMemberPlan);
  const fetchHealth = useMemberHealthStore((s) => s.fetchHealth);
  const plan = useTrainingStore((s) => s.memberPlans[memberId] ?? null);

  const [data, setData] = useState<OverviewData | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const sessionFetch: { value: WorkoutSession[] } = { value: [] };

    void Promise.allSettled([
      fetchTests(memberId),
      fetchMemberPlan(memberId),
      fetchHealth(memberId),
      fetchSessions(memberId)
        .then((s) => { sessionFetch.value = s; })
        .catch(() => { sessionFetch.value = []; }),
    ]).then(() => {
      // Read from store via getState() to avoid stale closure
      const bodyTests = useBodyTestsStore.getState().testsByMember[memberId] ?? [];
      const injuries = useMemberHealthStore.getState().injuriesByMember[memberId] ?? [];
      setData({ sessions: sessionFetch.value, bodyTests, injuries });
    });
  }, [memberId, fetchTests, fetchMemberPlan, fetchHealth]);

  if (data === null) {
    return (
      <div className="px-4 sm:px-8 py-7 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[80px] rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-[88px] rounded-xl" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-8 py-7">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
        <div className="flex flex-col gap-3">
          <MemberStatStrip bodyTests={data.bodyTests} sessions={data.sessions} />
          <MemberPlanCard memberId={memberId} plan={plan} sessions={data.sessions} />
        </div>
        <MemberHealthPanel memberId={memberId} injuries={data.injuries} />
      </div>
    </div>
  );
}
