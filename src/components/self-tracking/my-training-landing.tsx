import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { redirect } from 'next/navigation';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoSelfPersonalBestRepository } from '@/lib/repositories/self-personal-best.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { detectLandingState } from '@/lib/self-tracking/landing-state';
import { ActivityStrip } from './activity-strip';
import { TemplatePathCard, type UserTemplate } from './template-path-card';
import { FreestylePathCard } from './freestyle-path-card';
import { MiniWorkoutCalendar } from './mini-workout-calendar';
import { PageHeader } from '@/components/shared/page-header';
import { ActiveSessionPrompt } from '@/components/shared/active-session-prompt';
import { WorkoutCalendarHeaderTrigger } from './workout-calendar-header-trigger';
import { PathCardsGrid, PathCardItem } from './path-cards-grid';
import type { ISelfWorkoutLog } from '@/lib/db/models/self-workout-log.model';
import type { IPlanTemplate } from '@/lib/db/models/plan-template.model';

type BasePath = '/trainer/my-training' | '/owner/my-training' | '/member/my-training';

export async function MyTrainingLanding({ basePath }: { basePath: BasePath }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = session.user.id;

  await connectDB();
  const logRepo = new MongoSelfWorkoutLogRepository();
  const pbRepo = new MongoSelfPersonalBestRepository();
  const templateRepo = new MongoPlanTemplateRepository();

  const now = new Date();
  const [activeLog, monthLogs, recent, pbs, userTemplates] = await Promise.all([
    logRepo.findActive(userId),
    logRepo.findByUserMonth(userId, now.getFullYear(), now.getMonth() + 1),
    logRepo.findRecent(userId, 10),
    pbRepo.findByUser(userId),
    templateRepo.findByCreator(userId),
  ]);

  const completedSessionCount = recent.length;
  const hasUsedTemplate = recent.some((r) => r.sourceTemplateId !== null);
  const state = detectLandingState({ completedSessionCount, hasUsedTemplate });

  // 14-day heatmap
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const last14Days: boolean[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(today.getTime() - i * 86400000);
    const next = new Date(day.getTime() + 86400000);
    last14Days.push(
      recent.some((r) => r.completedAt && r.completedAt >= day && r.completedAt < next),
    );
  }

  const headerSubtitle =
    state === 'full'
      ? `${monthLogs.length} sessions in ${now.toLocaleString('en-US', { month: 'long' })}`
      : state === 'light'
        ? `${completedSessionCount} sessions logged`
        : "Track your own sessions here — kept separate from your members'.";

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStats = {
    sessions: monthLogs.length,
    sets: monthLogs.reduce((acc, l) => acc + l.sets.length, 0),
    avgRpe: avgRpe(monthLogs),
    prs: pbs.filter((pb) => pb.achievedAt >= startOfMonth).length,
  };

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Training"
        subtitle={headerSubtitle}
        actions={<WorkoutCalendarHeaderTrigger basePath={basePath} />}
      />
      <div className="px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
        {activeLog && (
          <div className="mb-4">
            <ActiveSessionPrompt
              dayName={activeLog.dayName}
              startedAtIso={activeLog.startedAt.toISOString()}
              lastActivityAtIso={(activeLog.lastActivityAt ?? activeLog.startedAt).toISOString()}
              continueHref={`${basePath}/session/${activeLog._id.toString()}`}
              sealEndpoint={`/api/me/workout-logs/${activeLog._id.toString()}/seal`}
              deleteEndpoint={`/api/me/workout-logs/${activeLog._id.toString()}`}
            />
          </div>
        )}
        {state === 'full' && (
          <ActivityStrip state="full" last14Days={last14Days} monthStats={monthStats} />
        )}
        {state === 'light' && (
          <ActivityStrip state="light" last14Days={last14Days} sessionCount={completedSessionCount} />
        )}
        {state === 'empty' && <ActivityStrip state="empty" />}

        <PathCardsGrid>
          <PathCardItem>
            <TemplatePathCard
              templates={toUserTemplates(userTemplates)}
              basePath={basePath}
            />
          </PathCardItem>
          <PathCardItem>
            {state === 'empty' ? (
              <FreestylePathCard state="empty" basePath={basePath} />
            ) : (
              renderFreestyleCard(state, recent, basePath)
            )}
          </PathCardItem>
        </PathCardsGrid>

        <MiniWorkoutCalendar basePath={basePath} />
      </div>
    </div>
  );
}

function toUserTemplates(templates: IPlanTemplate[]): UserTemplate[] {
  return templates.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
    days: t.days.map((d) => ({
      dayNumber: d.dayNumber,
      name: d.name,
      exercises: d.exercises.map((ex) => ({
        groupId: ex.groupId,
        isSuperset: ex.isSuperset,
        exerciseId: ex.exerciseId.toString(),
        exerciseName: ex.exerciseName,
        isBodyweight: ex.isBodyweight,
        sets: ex.sets,
        repsMin: ex.repsMin,
        repsMax: ex.repsMax,
      })),
    })),
  }));
}

function avgRpe(logs: ISelfWorkoutLog[]): number {
  const withRpe = logs.filter((l) => l.rpe != null);
  if (withRpe.length === 0) return 0;
  const total = withRpe.reduce((acc, l) => acc + (l.rpe ?? 0), 0);
  return total / withRpe.length;
}

function renderFreestyleCard(state: 'full' | 'light', recent: ISelfWorkoutLog[], basePath: BasePath) {
  const lastFreestyleLog = recent.find((r) => r.sourceTemplateId == null);
  if (!lastFreestyleLog) return <FreestylePathCard state="empty" basePath={basePath} />;

  const dateLabel = lastFreestyleLog.completedAt
    ? lastFreestyleLog.completedAt.toLocaleDateString('en-US', { weekday: 'short' })
    : '—';
  const startedMs = lastFreestyleLog.startedAt.getTime();
  const endedMs = (lastFreestyleLog.completedAt ?? new Date()).getTime();
  const durationMin = Math.max(1, Math.round((endedMs - startedMs) / 60000));
  const topSets = lastFreestyleLog.sets.slice(0, 3).map((s) => ({
    exerciseName: s.exerciseName,
    weight: s.actualWeight,
    reps: s.actualReps,
    isPR: false,
  }));
  const remainingSets = Math.max(0, lastFreestyleLog.sets.length - 3);

  const lastFreestyle = {
    dateLabel,
    durationMin,
    rpe: lastFreestyleLog.rpe,
    topSets,
    remainingSets,
  };

  if (state === 'full') {
    const freestyleCount = recent.filter((r) => r.sourceTemplateId == null).length;
    const weeklyFrequency = Math.round((freestyleCount / 14) * 7);
    return (
      <FreestylePathCard
        state="full"
        lastFreestyle={lastFreestyle}
        weeklyFrequency={weeklyFrequency}
        basePath={basePath}
      />
    );
  }

  return <FreestylePathCard state="light" lastFreestyle={lastFreestyle} basePath={basePath} />;
}
