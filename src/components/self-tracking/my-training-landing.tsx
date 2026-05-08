import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { redirect } from 'next/navigation';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoSelfPersonalBestRepository } from '@/lib/repositories/self-personal-best.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { detectLandingState } from '@/lib/self-tracking/landing-state';
import { ActivityStrip } from './activity-strip';
import { TemplatePathCard } from './template-path-card';
import { FreestylePathCard } from './freestyle-path-card';
import { RecentSessionsList, type SessionRow } from './recent-sessions-list';
import { PageHeader } from '@/components/shared/page-header';
import { WorkoutCalendarHeaderTrigger } from './workout-calendar-header-trigger';
import type { ISelfWorkoutLog, ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';
import type { IPlanTemplate } from '@/lib/db/models/plan-template.model';

type BasePath = '/trainer/my-training' | '/owner/my-training';

export async function MyTrainingLanding({ basePath }: { basePath: BasePath }) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = session.user.id;

  await connectDB();
  const logRepo = new MongoSelfWorkoutLogRepository();
  const pbRepo = new MongoSelfPersonalBestRepository();
  const templateRepo = new MongoPlanTemplateRepository();

  const now = new Date();
  const [, monthLogs, recent, lastByTemplate, pbs] = await Promise.all([
    logRepo.findActive(userId),
    logRepo.findByUserMonth(userId, now.getFullYear(), now.getMonth() + 1),
    logRepo.findRecent(userId, 10),
    logRepo.findLastByTemplate(userId),
    pbRepo.findByUser(userId),
  ]);

  const completedSessionCount = recent.length;
  const hasUsedTemplate = lastByTemplate !== null;
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

  // Recent rows (top 5)
  const pbLogIds = new Set(pbs.map((pb) => pb.logId.toString()));
  const sessionRows: SessionRow[] = recent.slice(0, 5).map((r) => {
    const startedMs = r.startedAt.getTime();
    const endedMs = (r.completedAt ?? new Date()).getTime();
    const durationMin = Math.max(1, Math.round((endedMs - startedMs) / 60000));
    return {
      id: r._id.toString(),
      dateLabel: r.completedAt
        ? r.completedAt.toLocaleDateString('en-US', { weekday: 'short' })
        : '—',
      dayName: r.dayName,
      setCount: r.sets.length,
      durationMin,
      rpe: r.rpe,
      hasPR: pbLogIds.has(r._id.toString()),
    };
  });

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
        {state === 'full' && (
          <ActivityStrip state="full" last14Days={last14Days} monthStats={monthStats} />
        )}
        {state === 'light' && (
          <ActivityStrip state="light" last14Days={last14Days} sessionCount={completedSessionCount} />
        )}
        {state === 'empty' && <ActivityStrip state="empty" />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {state === 'empty' ? (
            <TemplatePathCard state="empty" basePath={basePath} />
          ) : (
            await renderTemplateCard(state, lastByTemplate, templateRepo, basePath)
          )}
          {state === 'empty' ? (
            <FreestylePathCard state="empty" basePath={basePath} />
          ) : (
            renderFreestyleCard(state, recent, basePath)
          )}
        </div>

        {state === 'empty' ? (
          <RecentSessionsList state="empty" basePath={basePath} />
        ) : (
          <RecentSessionsList state={state} sessions={sessionRows} basePath={basePath} />
        )}
      </div>
    </div>
  );
}

function avgRpe(logs: ISelfWorkoutLog[]): number {
  const withRpe = logs.filter((l) => l.rpe != null);
  if (withRpe.length === 0) return 0;
  const total = withRpe.reduce((acc, l) => acc + (l.rpe ?? 0), 0);
  return total / withRpe.length;
}

async function renderTemplateCard(
  state: 'full' | 'light',
  lastByTemplate: ISelfWorkoutLog | null,
  templateRepo: MongoPlanTemplateRepository,
  basePath: BasePath,
) {
  if (!lastByTemplate || !lastByTemplate.sourceTemplateId) {
    return <TemplatePathCard state="empty" basePath={basePath} />;
  }
  const tpl: IPlanTemplate | null = await templateRepo.findById(lastByTemplate.sourceTemplateId.toString());
  if (!tpl) return <TemplatePathCard state="empty" basePath={basePath} />;

  const lastDayNumber = lastByTemplate.sourceTemplateDayNumber ?? 1;
  const nextDayNumber = (lastDayNumber % tpl.days.length) + 1;
  const nextDay = tpl.days.find((d) => d.dayNumber === nextDayNumber) ?? tpl.days[0];

  const exercisePreview = nextDay.exercises.slice(0, 4).map((ex) => ({
    name: ex.exerciseName,
    prescribed: `${ex.sets}×${ex.repsMin === ex.repsMax ? ex.repsMin : `${ex.repsMin}-${ex.repsMax}`}`,
    lastWeight: null as number | null,
  }));

  // plannedSets shape expected by /api/me/workout-logs.
  // Reference: src/components/self-tracking/template-day-picker-dialog.tsx pickDay().
  const plannedSets: ISelfWorkoutSet[] = nextDay.exercises.flatMap((ex) =>
    Array.from({ length: ex.sets }, (_, i) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      groupId: ex.groupId,
      isSuperset: ex.isSuperset,
      isBodyweight: ex.isBodyweight,
      setNumber: i + 1,
      prescribedRepsMin: ex.repsMin,
      prescribedRepsMax: ex.repsMax,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    })),
  );

  return (
    <TemplatePathCard
      state={state}
      templateId={tpl._id.toString()}
      templateName={tpl.name}
      nextDay={{ dayNumber: nextDay.dayNumber, dayName: nextDay.name }}
      cycleSize={tpl.days.length}
      completedDayNumbers={[lastDayNumber]}
      exercisePreview={exercisePreview}
      plannedSets={JSON.parse(JSON.stringify(plannedSets))}
      basePath={basePath}
    />
  );
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
