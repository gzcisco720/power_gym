import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { TrainerHubMembersClient } from './_components/trainer-hub-members-client';

export default async function TrainerHubMembersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'owner') redirect('/');

  const { id: trainerId } = await params;

  await connectDB();
  const userRepo = new MongoUserRepository();

  const [members, allTrainers] = await Promise.all([
    userRepo.findAllMembers(trainerId),
    userRepo.findByRole('trainer'),
  ]);

  const memberDtos = members.map((m) => ({
    _id: m._id.toString(),
    name: m.name,
    email: m.email,
    trainerId: m.trainerId?.toString() ?? null,
  }));

  const trainerDtos = allTrainers.map((t) => ({
    _id: t._id.toString(),
    name: t.name,
  }));

  return (
    <div className="px-4 sm:px-8 py-7">
      <TrainerHubMembersClient
        members={memberDtos}
        trainers={trainerDtos}
        currentTrainerId={trainerId}
      />
    </div>
  );
}
