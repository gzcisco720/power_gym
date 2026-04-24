import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { PageHeader } from '@/components/shared/page-header';
import { MemberListClient } from './_components/member-list-client';

export default async function OwnerMembersPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const userRepo = new MongoUserRepository();

  const [members, trainers] = await Promise.all([
    userRepo.findAllMembers(),
    userRepo.findByRole('trainer'),
  ]);

  const trainerMap = new Map(trainers.map((t) => [t._id.toString(), t.name]));

  const memberRows = members.map((m) => ({
    _id: m._id.toString(),
    name: m.name,
    email: m.email,
    trainerId: m.trainerId?.toString() ?? null,
    trainerName: m.trainerId ? (trainerMap.get(m.trainerId.toString()) ?? null) : null,
    createdAt: m.createdAt.toISOString(),
  }));

  const trainerOptions = trainers.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
  }));

  return (
    <div>
      <PageHeader
        title="Members"
        subtitle={`${memberRows.length} member${memberRows.length !== 1 ? 's' : ''} across all trainers`}
      />
      <div className="px-8 py-7">
        <MemberListClient members={memberRows} trainers={trainerOptions} />
      </div>
    </div>
  );
}
