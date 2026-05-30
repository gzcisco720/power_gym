import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoCheckInRepository } from '@/lib/repositories/check-in.repository';
import { StatCard } from '@/components/shared/stat-card';

export async function DashboardStats() {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const inviteRepo = new MongoInviteRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const checkInRepo = new MongoCheckInRepository();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  const startOfLastWeek = new Date(now);
  startOfLastWeek.setDate(now.getDate() - 14);

  const [trainers, members, invites, checkInsThisWeek, checkInsLastWeek] = await Promise.all([
    userRepo.findByRole('trainer'),
    userRepo.findAllMembers(),
    inviteRepo.findAll(),
    checkInRepo.countSince(startOfWeek),
    checkInRepo.countSince(startOfLastWeek),
  ]);

  const memberIds = members.map((m) => m._id.toString());
  const [sessionsThisMonth, sessionsLastMonth, sessionsToday, membersThisMonth] = await Promise.all([
    sessionRepo.countByMemberIdsSince(memberIds, startOfMonth),
    sessionRepo.countByMemberIdsSince(memberIds, startOfLastMonth),
    sessionRepo.countByMemberIdsSince(memberIds, startOfDay),
    userRepo.findMembersJoinedByMonth(1).then((r) => r[0]?.newCount ?? 0),
  ]);

  const pendingInvites = invites.filter((i) => i.usedAt === null && i.expiresAt > now);
  const expiringSoon = pendingInvites.filter(
    (i) => i.expiresAt < new Date(now.getTime() + 3 * 86400000),
  );

  const sessionGrowth =
    sessionsLastMonth > 0
      ? Math.round(((sessionsThisMonth - sessionsLastMonth) / sessionsLastMonth) * 100)
      : 0;

  const checkInRate =
    checkInsLastWeek > 0 ? Math.round((checkInsThisWeek / checkInsLastWeek) * 100) - 100 : 0;

  const checkInDelta =
    checkInRate >= 0
      ? `↑ ${checkInRate}% vs last week`
      : `↓ ${Math.abs(checkInRate)}% vs last week`;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label="Trainers" value={String(trainers.length)} accentColor="primary" />
      <StatCard
        label="Members"
        value={String(members.length)}
        delta={`↑ ${membersThisMonth} joined this month`}
      />
      <StatCard
        label="Sessions / Month"
        value={String(sessionsThisMonth)}
        accentColor="success"
        delta={
          sessionGrowth >= 0
            ? `↑ ${sessionGrowth}% vs last month`
            : `↓ ${Math.abs(sessionGrowth)}% vs last month`
        }
      />
      <StatCard label="Active Today" value={String(sessionsToday)} delta="sessions started today" />
      <StatCard
        label="Check-in Rate"
        value={`${Math.min(Math.round((checkInsThisWeek / Math.max(members.length, 1)) * 100), 100)}%`}
        accentColor="achievement"
        delta={checkInDelta}
      />
      <StatCard
        label="Pending Invites"
        value={String(pendingInvites.length)}
        delta={expiringSoon.length > 0 ? `${expiringSoon.length} expiring soon` : 'all valid'}
      />
    </div>
  );
}
