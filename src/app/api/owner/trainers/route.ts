import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const userRepo = new MongoUserRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const trainers = await userRepo.findByRole('trainer');
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const results = await Promise.all(
    trainers.map(async (trainer) => {
      const members = await userRepo.findAllMembers(trainer._id.toString());
      const memberIds = members.map((m) => m._id.toString());
      const sessionsThisMonth = await sessionRepo.countByMemberIdsSince(memberIds, startOfMonth);
      return {
        _id: trainer._id.toString(),
        name: trainer.name,
        email: trainer.email,
        createdAt: trainer.createdAt,
        memberCount: members.length,
        sessionsThisMonth,
      };
    }),
  );

  return Response.json(results);
}
