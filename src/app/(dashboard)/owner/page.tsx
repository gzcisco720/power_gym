import Link from 'next/link';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { StatCard } from '@/components/shared/stat-card';
import { PageHeader } from '@/components/shared/page-header';
import { TrainerBreakdownTable } from './_components/trainer-breakdown-table';

export default async function OwnerDashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

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
  const sessionsThisMonth = await sessionRepo.countByMemberIdsSince(memberIds, startOfMonth);

  const trainerRows = await Promise.all(
    trainers.map(async (trainer) => {
      const trainerMembers = await userRepo.findAllMembers(trainer._id.toString());
      const trainerMemberIds = trainerMembers.map((m) => m._id.toString());
      const trainerSessions = await sessionRepo.countByMemberIdsSince(
        trainerMemberIds,
        startOfMonth,
      );
      return {
        _id: trainer._id.toString(),
        name: trainer.name,
        email: trainer.email,
        memberCount: trainerMembers.length,
        sessionsThisMonth: trainerSessions,
      };
    }),
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Gym overview"
        actions={
          <Link
            href="/dashboard/owner/invites"
            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-white px-2.5 text-sm font-semibold text-black hover:bg-white/90 transition-all"
          >
            + Invite Trainer
          </Link>
        }
      />

      <div className="px-8 py-7 space-y-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Trainers" value={String(trainers.length)} />
          <StatCard label="Members" value={String(members.length)} />
          <StatCard label="Sessions / mo" value={String(sessionsThisMonth)} />
          <StatCard label="Pending Invites" value={String(pendingInviteCount)} />
        </div>

        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#2a2a2a] mb-3.5">
            Trainer Breakdown
          </h2>
          <TrainerBreakdownTable trainers={trainerRows} />
        </div>
      </div>
    </div>
  );
}
