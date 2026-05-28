import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { TrainerBreakdownTable } from './trainer-breakdown-table';

export async function TrainerBreakdownSection() {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const [trainers, members] = await Promise.all([
    userRepo.findByRole('trainer'),
    userRepo.findAllMembers(),
  ]);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const membersByTrainer = new Map<string, (typeof members)[0][]>();
  for (const member of members) {
    const tid = member.trainerId?.toString() ?? '__none__';
    const arr = membersByTrainer.get(tid) ?? [];
    arr.push(member);
    membersByTrainer.set(tid, arr);
  }

  const trainerRows = await Promise.all(
    trainers.map(async (trainer) => {
      const trainerMembers = membersByTrainer.get(trainer._id.toString()) ?? [];
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
      <h2 className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#555] mb-3.5">
        Trainer Breakdown
      </h2>
      <TrainerBreakdownTable trainers={trainerRows} />
    </div>
  );
}
