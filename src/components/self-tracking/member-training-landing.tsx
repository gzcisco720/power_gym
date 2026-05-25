import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { redirect } from 'next/navigation';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoSelfPersonalBestRepository } from '@/lib/repositories/self-personal-best.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { detectLandingState } from '@/lib/self-tracking/landing-state';
import { ActivityStrip } from './activity-strip';
import { MemberPlanPathCard } from './member-plan-path-card';
import { FreestylePathCard } from './freestyle-path-card';
import { MiniWorkoutCalendar } from './mini-workout-calendar';
import { PageHeader } from '@/components/shared/page-header';
import { ActiveSessionPrompt } from '@/components/shared/active-session-prompt';
import { WorkoutCalendarHeaderTrigger } from './workout-calendar-header-trigger';
import { ExportCsvButton } from '@/components/shared/export-csv-button';
import { PathCardsGrid, PathCardItem } from './path-cards-grid';
import type { ISelfWorkoutLog } from '@/lib/db/models/self-workout-log.model';
import type { IMemberPlan } from '@/lib/db/models/member-plan.model';
import type { MemberPlan } from './member-plan-path-card';

const BASE_PATH = '/member/my-training' as const;

export async function MemberTrainingLanding() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const userId = session.user.id;

  await connectDB();
  const logRepo = new MongoSelfWorkoutLogRepository();
  const pbRepo = new MongoSelfPersonalBestRepository();
  const planRepo = new MongoMemberPlanRepository();

  const now = new Date();
  const [activeLog, monthLogs, recent, pbs, rawPlan] = await Promise.all([
    logRepo.findActive(userId),
    logRepo.findByUserMonth(userId, now.getFullYear(), now.getMonth() + 1),
    logRepo.findRecent(userId, 10),
    pbRepo.findByUser(userId),
    planRepo.findActive(userId),
  ]);

  const completedSessionCount = recent.length;
  const hasUsedTemplate = recent.some((r) => r.sourceTemplateId !== null);
  const state = detectLandingState({ completedSessionCount, hasUsedTemplate });

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
        : 'Track your own workouts here.';

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStats = {
    sessions: monthLogs.length,
    sets: monthLogs.reduce((acc, l) => acc + l.sets.length, 0),
    avgRpe: avgRpe(monthLogs),
    prs: pbs.filter((pb) => pb.achievedAt >= startOfMonth).length,
  };

  const plan = rawPlan ? toMemberPlan(rawPlan) : null;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="My Training"
        subtitle={headerSubtitle}
        actions={
          <div className="flex items-center gap-2">
            <ExportCsvButton url="/api/me/sessions/export" filename="my-sessions.csv" />
            <WorkoutCalendarHeaderTrigger basePath={BASE_PATH} />
          </div>
        }
      />
      <div className="px-4 sm:px-8 py-6 max-w-5xl mx-auto w-full">
        {activeLog && (
          <div className="mb-4">
            <ActiveSessionPrompt
              dayName={activeLog.dayName}
              startedAtIso={activeLog.startedAt.toISOString()}
              lastActivityAtIso={(activeLog.lastActivityAt ?? activeLog.startedAt).toISOString()}
              continueHref={`${BASE_PATH}/session/${activeLog._id.toString()}`}
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
            <MemberPlanPathCard plan={plan} basePath={BASE_PATH} />
          </PathCardItem>
          <PathCardItem>
            {state === 'empty' ? (
              <FreestylePathCard state="empty" basePath={BASE_PATH} />
            ) : (
              renderFreestyleCard(state, recent)
            )}
          </PathCardItem>
        </PathCardsGrid>

        <MiniWorkoutCalendar basePath={BASE_PATH} />
      </div>
    </div>
  );
}

function toMemberPlan(plan: IMemberPlan): MemberPlan {
  return {
    _id: plan._id.toString(),
    templateId: plan.templateId.toString(),
    name: plan.name,
    days: plan.days.map((d) => ({
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
  };
}

function avgRpe(logs: ISelfWorkoutLog[]): number {
  const withRpe = logs.filter((l) => l.rpe != null);
  if (withRpe.length === 0) return 0;
  return withRpe.reduce((acc, l) => acc + (l.rpe ?? 0), 0) / withRpe.length;
}

function renderFreestyleCard(state: 'full' | 'light', recent: ISelfWorkoutLog[]) {
  const lastFreestyleLog = recent.find((r) => r.sourceTemplateId == null);
  if (!lastFreestyleLog) return <FreestylePathCard state="empty" basePath={BASE_PATH} />;

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
  const lastFreestyle = { dateLabel, durationMin, rpe: lastFreestyleLog.rpe, topSets, remainingSets };

  if (state === 'full') {
    const freestyleCount = recent.filter((r) => r.sourceTemplateId == null).length;
    const weeklyFrequency = Math.round((freestyleCount / 14) * 7);
    return (
      <FreestylePathCard
        state="full"
        lastFreestyle={lastFreestyle}
        weeklyFrequency={weeklyFrequency}
        basePath={BASE_PATH}
      />
    );
  }
  return <FreestylePathCard state="light" lastFreestyle={lastFreestyle} basePath={BASE_PATH} />;
}
