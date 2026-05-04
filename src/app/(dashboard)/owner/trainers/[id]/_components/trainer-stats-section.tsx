import { connectDB } from '@/lib/db/connect';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { StatCard } from '@/components/shared/stat-card';

export async function TrainerStatsSection({ trainerId }: { trainerId: string }) {
  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const planTemplateRepo = new MongoPlanTemplateRepository();

  const members = await userRepo.findAllMembers(trainerId);
  const memberIds = members.map((m) => m._id.toString());

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [sessionsThisMonth, templateCount] = await Promise.all([
    memberIds.length > 0
      ? sessionRepo.countByMemberIdsSince(memberIds, startOfMonth)
      : Promise.resolve(0),
    planTemplateRepo.countByCreator(trainerId),
  ]);

  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Members" value={String(members.length)} />
      <StatCard label="Sessions This Month" value={String(sessionsThisMonth)} />
      <StatCard label="Plan Templates" value={String(templateCount)} />
    </div>
  );
}
