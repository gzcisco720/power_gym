import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { StatCard } from '@/components/shared/stat-card';
import { auth } from '@/lib/auth/auth';

export async function TrainerKpiStrip() {
  const session = await auth();
  if (!session?.user) return null;
  const trainerId = session.user.id;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const members = await userRepo.findAllMembers(trainerId);
  const memberIds = members.map((m) => m._id.toString());

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  const [sessionsThisMonth, sessionsToday, completedLast30] = await Promise.all([
    memberIds.length > 0
      ? sessionRepo.countByMemberIdsSince(memberIds, startOfMonth)
      : Promise.resolve(0),
    memberIds.length > 0
      ? sessionRepo.countByMemberIdsSince(memberIds, startOfDay)
      : Promise.resolve(0),
    memberIds.length > 0
      ? Promise.all(
          memberIds.map((id) => sessionRepo.countCompletedByMemberSince(id, thirtyDaysAgo)),
        )
      : Promise.resolve([]),
  ]);

  const idleMembers = await Promise.all(
    members.map(async (m) => {
      const sessions = await sessionRepo.countCompletedByMemberSince(
        m._id.toString(),
        sevenDaysAgo,
      );
      return sessions === 0;
    }),
  );
  const needsAttentionCount = idleMembers.filter(Boolean).length;

  const totalScheduled = Math.max(memberIds.length * 4, 1);
  const completedSum = (completedLast30 as number[]).reduce((a, b) => a + b, 0);
  const complianceRate = Math.min(Math.round((completedSum / totalScheduled) * 100), 100);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Members" value={String(members.length)} accentColor="primary" />
      <StatCard
        label="Sessions Today"
        value={String(sessionsToday)}
        accentColor="success"
        delta={`↑ ${sessionsThisMonth} this month`}
      />
      <StatCard
        label="30-day Compliance"
        value={`${complianceRate}%`}
        accentColor="achievement"
        delta="sessions completed"
      />
      <StatCard
        label="Needs Attention"
        value={String(needsAttentionCount)}
        delta="7+ days no session"
      />
    </div>
  );
}
