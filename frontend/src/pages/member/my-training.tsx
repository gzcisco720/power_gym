import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header';
import { ActivityStrip } from '@/components/self-tracking/activity-strip';
import { FreestylePathCard } from '@/components/self-tracking/freestyle-path-card';
import { MemberPlanPathCard, type MemberPlan } from '@/components/self-tracking/member-plan-path-card';
import { PathCardsGrid, PathCardItem } from '@/components/self-tracking/path-cards-grid';
import { ActiveSessionPrompt } from '@/components/self-tracking/active-session-prompt';
import { MiniWorkoutCalendar } from '@/components/self-tracking/mini-workout-calendar';
import { request } from '@/api/client';
import { fetchMemberActivePlan } from '@/api/member-portal';
import type { SelfWorkoutLog } from '@/api/self-training';

const BASE_PATH = '/member/my-training' as const;

interface LandingData {
  activeLog: SelfWorkoutLog | null;
  recent: SelfWorkoutLog[];
  monthLogs: SelfWorkoutLog[];
  plan: MemberPlan | null;
}

function detectLandingState(
  completedCount: number,
  hasUsedTemplate: boolean,
): 'full' | 'light' | 'empty' {
  if (completedCount >= 5 || (completedCount >= 2 && hasUsedTemplate)) return 'full';
  if (completedCount >= 1) return 'light';
  return 'empty';
}

function avgRpe(logs: SelfWorkoutLog[]): number {
  const withRpe = logs.filter((l) => l.rpe != null);
  if (withRpe.length === 0) return 0;
  return withRpe.reduce((acc, l) => acc + (l.rpe ?? 0), 0) / withRpe.length;
}

export function MemberMyTrainingPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<LandingData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    Promise.all([
      request<SelfWorkoutLog | null>('/api/me/workout-logs/active').catch(() => null),
      request<SelfWorkoutLog[]>(`/api/me/workout-logs?year=${year}&month=${month}`).catch(() => []),
      fetchMemberActivePlan().catch(() => null),
    ]).then(([activeLog, monthLogs, plan]) => {
      const recent = (monthLogs ?? []).filter((l) => l.completedAt !== null).slice(0, 10);
      setData({ activeLog, recent, monthLogs: monthLogs ?? [], plan });
    }).catch(() => { /* silent */ });
  }, [refreshKey]);

  if (!data) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="My Training" />
        <div className="p-6 text-foreground/65 text-sm">Loading…</div>
      </div>
    );
  }

  const { activeLog, recent, monthLogs, plan } = data;
  const completedCount = recent.length;
  const hasUsedTemplate = recent.some((r) => r.sourceTemplateId !== null);
  const state = detectLandingState(completedCount, hasUsedTemplate);

  const now = new Date();

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const last14Days: boolean[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86400000);
    const next = new Date(day.getTime() + 86400000);
    last14Days.push(
      recent.some((r) => r.completedAt && new Date(r.completedAt) >= day && new Date(r.completedAt) < next),
    );
  }

  const monthStats = {
    sessions: monthLogs.length,
    sets: monthLogs.reduce((acc, l) => acc + l.sets.length, 0),
    avgRpe: avgRpe(monthLogs),
    prs: 0,
  };

  const headerSubtitle =
    state === 'full'
      ? `${monthLogs.length} sessions in ${now.toLocaleString('en-US', { month: 'long' })}`
      : state === 'light'
        ? `${completedCount} sessions logged`
        : 'Track your own workouts here.';

  const lastFreestyleLog = recent.find((r) => r.sourceTemplateId === null);
  function toLastFreestyle(log: SelfWorkoutLog) {
    const dateLabel = log.completedAt
      ? new Date(log.completedAt).toLocaleDateString('en-US', { weekday: 'short' })
      : '—';
    const startedMs = new Date(log.startedAt).getTime();
    const endedMs = log.completedAt ? new Date(log.completedAt).getTime() : Date.now();
    const durationMin = Math.max(1, Math.round((endedMs - startedMs) / 60000));
    const topSets = log.sets.slice(0, 3).map((s) => ({
      exerciseName: s.exerciseName,
      weight: s.actualWeight,
      reps: s.actualReps,
      isPR: false,
    }));
    return { dateLabel, durationMin, rpe: log.rpe, topSets, remainingSets: Math.max(0, log.sets.length - 3) };
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Training"
        subtitle={headerSubtitle}
        actions={
          <a
            href={`${BASE_PATH}/calendar`}
            className="text-xs text-foreground/65 hover:text-foreground transition-colors"
            onClick={(e) => { e.preventDefault(); navigate(`${BASE_PATH}/calendar`); }}
          >
            Calendar →
          </a>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
        {activeLog && (
          <div className="mb-4">
            <ActiveSessionPrompt
              dayName={activeLog.dayName}
              startedAtIso={activeLog.startedAt}
              lastActivityAtIso={activeLog.lastActivityAt ?? activeLog.startedAt}
              continueHref={`${BASE_PATH}/session/${activeLog._id}`}
              sealEndpoint={`/api/me/workout-logs/${activeLog._id}/seal`}
              deleteEndpoint={`/api/me/workout-logs/${activeLog._id}`}
              onRefresh={() => setRefreshKey((k) => k + 1)}
            />
          </div>
        )}

        {state === 'full' && <ActivityStrip state="full" last14Days={last14Days} monthStats={monthStats} />}
        {state === 'light' && <ActivityStrip state="light" last14Days={last14Days} sessionCount={completedCount} />}
        {state === 'empty' && <ActivityStrip state="empty" />}

        <PathCardsGrid>
          <PathCardItem>
            <MemberPlanPathCard plan={plan} basePath={BASE_PATH} />
          </PathCardItem>
          <PathCardItem>
            {state === 'empty' ? (
              <FreestylePathCard state="empty" basePath={BASE_PATH} />
            ) : lastFreestyleLog ? (
              state === 'full' ? (
                <FreestylePathCard
                  state="full"
                  lastFreestyle={toLastFreestyle(lastFreestyleLog)}
                  weeklyFrequency={Math.round((recent.filter((r) => r.sourceTemplateId === null).length / 14) * 7)}
                  basePath={BASE_PATH}
                />
              ) : (
                <FreestylePathCard
                  state="light"
                  lastFreestyle={toLastFreestyle(lastFreestyleLog)}
                  basePath={BASE_PATH}
                />
              )
            ) : (
              <FreestylePathCard state="empty" basePath={BASE_PATH} />
            )}
          </PathCardItem>
        </PathCardsGrid>

        <MiniWorkoutCalendar basePath={BASE_PATH} />
      </div>
    </div>
  );
}
