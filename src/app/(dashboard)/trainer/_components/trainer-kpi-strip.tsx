import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { StatCard } from '@/components/shared/stat-card';
import { auth } from '@/lib/auth/auth';

export async function TrainerKpiStrip() {
  const session = await auth();
  if (!session?.user) return null;
  const trainerId = session.user.id;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const checkInRepo = new MongoCheckInRepository();

  const members = await userRepo.findAllMembers(trainerId);
  const memberIds = members.map((m) => m._id.toString());

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  const [sessionsToday, recentCheckIns] = await Promise.all([
    memberIds.length > 0
      ? sessionRepo.countByMemberIdsSince(memberIds, todayStart)
      : Promise.resolve(0),
    checkInRepo.findRecentByTrainer(trainerId, sevenDaysAgo),
  ]);

  const idleMembers = memberIds.length > 0
    ? await Promise.all(
        members.map(async (m) => {
          const count = await sessionRepo.countCompletedByMemberSince(m._id.toString(), sevenDaysAgo);
          return count === 0;
        }),
      )
    : [];
  const needsAttentionCount = idleMembers.filter(Boolean).length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Members" value={String(members.length)} accentColor="primary" />
      <StatCard
        label="Sessions Today"
        value={String(sessionsToday)}
        accentColor="success"
      />
      <StatCard
        label="Check-ins"
        value={String(recentCheckIns.length)}
        accentColor="achievement"
        delta="last 7 days"
      />
      <StatCard
        label="Needs Attention"
        value={String(needsAttentionCount)}
        delta="7+ days no session"
      />
    </div>
  );
}
