import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { MongoPersonalBestRepository } from '@/lib/repositories/personal-best.repository';
import { MongoScheduledSessionRepository } from '@/lib/repositories/scheduled-session.repository';
import { StatCard } from '@/components/shared/stat-card';
import dynamic from 'next/dynamic';
const TrainerSessionsChartClient = dynamic(
  () => import('./trainer-sessions-chart-client').then((m) => m.TrainerSessionsChartClient),
  { ssr: false },
);
import { TrainerWeeklyScheduleClient } from './trainer-weekly-schedule-client';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export async function TrainerStatsSection({ trainerId }: { trainerId: string }) {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const planTemplateRepo = new MongoPlanTemplateRepository();
  const pbRepo = new MongoPersonalBestRepository();

  const members = await userRepo.findAllMembers(trainerId);
  const memberIds = members.map((m) => m._id.toString());

  const now = new Date();
  const startOfMonth = new Date(now);
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Monday-anchored week range
  const dow = now.getDay(); // 0=Sun
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const [sessionsThisMonth, templateCount, activeThisMonth, newPRs, chartData, streaks, weekSessions] =
    await Promise.all([
      memberIds.length > 0
        ? sessionRepo.countByMemberIdsSince(memberIds, startOfMonth)
        : Promise.resolve(0),
      planTemplateRepo.countByCreator(trainerId),
      memberIds.length > 0
        ? sessionRepo.countActiveMembersSince(memberIds, startOfMonth)
        : Promise.resolve(0),
      memberIds.length > 0
        ? pbRepo.findByMemberIdsSince(memberIds, startOfMonth)
        : Promise.resolve([]),
      memberIds.length > 0
        ? sessionRepo.countByMemberIdsByMonth(memberIds, 6)
        : Promise.resolve([]),
      memberIds.length > 0
        ? Promise.all(memberIds.map((id) => sessionRepo.findConsecutiveStreakDays(id)))
        : Promise.resolve([]),
      new MongoScheduledSessionRepository().findByDateRange(weekStart, weekEnd, { trainerId }),
    ]);

  const avgStreak =
    streaks.length > 0
      ? Math.round(streaks.reduce((a, b) => a + b, 0) / streaks.length)
      : 0;

  // Group scheduled sessions by Mon=0 … Sun=6
  const todayDowIndex = dow === 0 ? 6 : dow - 1; // Mon=0, Sun=6
  const weekBuckets = DAY_LABELS.map((label, i) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    const count = weekSessions.filter((s) => {
      const d = new Date(s.date);
      return (
        s.status !== 'cancelled' &&
        d.getFullYear() === dayDate.getFullYear() &&
        d.getMonth() === dayDate.getMonth() &&
        d.getDate() === dayDate.getDate()
      );
    }).length;
    return { label, count, isToday: i === todayDowIndex };
  });
  const weekTotal = weekBuckets.reduce((a, b) => a + b.count, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Members" value={String(members.length)} accentColor="primary" />
        <StatCard label="Sessions / Mo" value={String(sessionsThisMonth)} />
        <StatCard label="Templates" value={String(templateCount)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Active / Mo"
          value={String(activeThisMonth)}
          delta={`of ${members.length} members`}
          accentColor="success"
        />
        <StatCard label="New PRs / Mo" value={String(newPRs.length)} />
        <StatCard label="Avg Streak" value={String(avgStreak)} unit="d" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
          <div className="text-[9px] uppercase tracking-[2px] text-foreground/65 font-semibold mb-3">
            This Week — Scheduled Sessions
          </div>
          <TrainerWeeklyScheduleClient days={weekBuckets} total={weekTotal} />
        </div>
        <div className="bg-white/[.03] ring-1 ring-white/[.07] rounded-xl p-4">
          <div className="text-[9px] uppercase tracking-[2px] text-foreground/65 font-semibold mb-3">
            Sessions — Last 6 Months
          </div>
          <TrainerSessionsChartClient data={chartData} />
        </div>
      </div>
    </div>
  );
}
