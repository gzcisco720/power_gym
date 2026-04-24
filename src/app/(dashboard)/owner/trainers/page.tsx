import { auth } from '@/lib/auth/auth';
import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { PageHeader } from '@/components/shared/page-header';
import { TrainerListClient } from './_components/trainer-list-client';

export default async function OwnerTrainersPage() {
  const session = await auth();
  if (!session?.user) return null;

  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const trainers = await userRepo.findByRole('trainer');
  const allMembers = await userRepo.findAllMembers();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const membersByTrainer = new Map<string, (typeof allMembers)[0][]>();
  for (const member of allMembers) {
    const tid = member.trainerId?.toString() ?? '__none__';
    const arr = membersByTrainer.get(tid) ?? [];
    arr.push(member);
    membersByTrainer.set(tid, arr);
  }

  const trainerRows = await Promise.all(
    trainers.map(async (trainer) => {
      const trainerMembers = membersByTrainer.get(trainer._id.toString()) ?? [];
      const trainerMemberIds = trainerMembers.map((m) => m._id.toString());
      const sessionsThisMonth = await sessionRepo.countByMemberIdsSince(trainerMemberIds, startOfMonth);
      return {
        _id: trainer._id.toString(),
        name: trainer.name,
        email: trainer.email,
        createdAt: trainer.createdAt.toISOString(),
        memberCount: trainerMembers.length,
        sessionsThisMonth,
        members: trainerMembers.map((m) => ({
          _id: m._id.toString(),
          name: m.name,
          email: m.email,
          trainerId: m.trainerId?.toString() ?? null,
          createdAt: m.createdAt.toISOString(),
        })),
      };
    }),
  );

  return (
    <div>
      <PageHeader
        title="Trainers"
        subtitle={`${trainerRows.length} trainer${trainerRows.length !== 1 ? 's' : ''}`}
      />
      <div className="px-8 py-7">
        <TrainerListClient trainers={trainerRows} allTrainers={trainerRows} />
      </div>
    </div>
  );
}
