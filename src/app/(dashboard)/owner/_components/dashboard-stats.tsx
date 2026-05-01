import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { StatCard } from '@/components/shared/stat-card';

export async function DashboardStats() {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const inviteRepo = new MongoInviteRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const [trainers, members, invites] = await Promise.all([
    userRepo.findByRole('trainer'),
    userRepo.findAllMembers(),
    inviteRepo.findAll(),
  ]);

  const now = new Date();
  const pendingInviteCount = invites.filter(
    (inv) => inv.usedAt === null && inv.expiresAt > now,
  ).length;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const memberIds = members.map((m) => m._id.toString());
  const sessionsThisMonth = await sessionRepo.countByMemberIdsSince(
    memberIds,
    startOfMonth,
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Trainers" value={String(trainers.length)} />
      <StatCard label="Members" value={String(members.length)} />
      <StatCard label="Sessions / mo" value={String(sessionsThisMonth)} />
      <StatCard label="Pending Invites" value={String(pendingInviteCount)} />
    </div>
  );
}
