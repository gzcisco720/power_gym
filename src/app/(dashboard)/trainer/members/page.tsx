import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { TrainerMembersClient } from './_components/trainer-members-client';

export default async function TrainerMembersPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const members = await userRepo.findAllMembers(session.user.id);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const memberIds = members.map((m) => m._id.toString());
  const sessionsThisMonth = await sessionRepo.countByMemberIdsSince(memberIds, startOfMonth);

  const newThisMonth = members.filter(
    (m) => new Date(m.createdAt) >= startOfMonth,
  ).length;

  const memberRows = members.map((m) => ({
    _id: m._id.toString(),
    name: m.name,
    email: m.email,
  }));

  if (members.length === 0) {
    return (
      <div>
        <PageHeader title="Members" subtitle="0 members" />
        <div className="px-4 sm:px-8 py-7">
          <EmptyState
            heading="No members yet"
            description="Members assigned to you will appear here."
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle={`${memberRows.length} member${memberRows.length !== 1 ? 's' : ''} assigned to you`}
      />
      <div className="px-4 sm:px-8 py-7">
        <TrainerMembersClient
          members={memberRows}
          totalCount={memberRows.length}
          sessionsThisMonth={sessionsThisMonth}
          newThisMonth={newThisMonth}
        />
      </div>
    </div>
  );
}
