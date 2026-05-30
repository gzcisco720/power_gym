import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/shared/page-header';
import { ActivityStrip } from '@/components/self-tracking/activity-strip';
import { FreestylePathCard } from '@/components/self-tracking/freestyle-path-card';
import { TemplatePathCard, type UserTemplate } from '@/components/self-tracking/template-path-card';
import { PathCardsGrid, PathCardItem } from '@/components/self-tracking/path-cards-grid';
import { ActiveSessionPrompt } from '@/components/self-tracking/active-session-prompt';
import { MiniWorkoutCalendar } from '@/components/self-tracking/mini-workout-calendar';
import { request } from '@/api/client';
import type { SelfWorkoutLog } from '@/api/self-training';

type BasePath = '/owner/my-training';

interface LandingData {
  activeLog: SelfWorkoutLog | null;
  recent: SelfWorkoutLog[];
  monthLogs: SelfWorkoutLog[];
  templates: UserTemplate[];
}

function detectLandingState(completedCount: number, hasUsedTemplate: boolean): 'full' | 'light' | 'empty' {
  if (completedCount >= 5 || (completedCount >= 2 && hasUsedTemplate)) return 'full';
  if (completedCount >= 1) return 'light';
  return 'empty';
}

function avgRpe(logs: SelfWorkoutLog[]): number {
  const withRpe = logs.filter((l) => l.rpe != null);
  if (withRpe.length === 0) return 0;
  return withRpe.reduce((acc, l) => acc + (l.rpe ?? 0), 0) / withRpe.length;
}

export function OwnerMyTrainingPage() {
  const navigate = useNavigate();
  const basePath: BasePath = '/owner/my-training';
  const [data, setData] = useState<LandingData | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    Promise.all([
      request<SelfWorkoutLog | null>('/api/me/workout-logs/active').catch(() => null),
      request<SelfWorkoutLog[]>(`/api/me/workout-logs?year=${year}&month=${month}`).catch(() => []),
      request<UserTemplate[]>('/api/plan-templates').catch(() => []),
    ]).then(([activeLog, monthLogs, templates]) => {
      const recent = monthLogs.filter((l) => l.completedAt !== null).slice(0, 10);
      setData({ activeLog, recent, monthLogs, templates });
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

  const { activeLog, recent, monthLogs, templates } = data;
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
        : "Track your own sessions here — kept separate from your members'.";

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
            href={`${basePath}/calendar`}
            className="text-xs text-foreground/65 hover:text-foreground transition-colors"
            onClick={(e) => { e.preventDefault(); navigate(`${basePath}/calendar`); }}
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
              continueHref={`${basePath}/session/${activeLog._id}`}
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
            <TemplatePathCard templates={templates as UserTemplate[]} basePath={basePath} />
          </PathCardItem>
          <PathCardItem>
            {state === 'empty' ? (
              <FreestylePathCard state="empty" basePath={basePath} />
            ) : lastFreestyleLog ? (
              state === 'full' ? (
                <FreestylePathCard
                  state="full"
                  lastFreestyle={toLastFreestyle(lastFreestyleLog)}
                  weeklyFrequency={Math.round((recent.filter((r) => r.sourceTemplateId === null).length / 14) * 7)}
                  basePath={basePath}
                />
              ) : (
                <FreestylePathCard
                  state="light"
                  lastFreestyle={toLastFreestyle(lastFreestyleLog)}
                  basePath={basePath}
                />
              )
            ) : (
              <FreestylePathCard state="empty" basePath={basePath} />
            )}
          </PathCardItem>
        </PathCardsGrid>

        <MiniWorkoutCalendar basePath={basePath} />
      </div>
    </div>
  );
}

