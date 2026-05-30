import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import { MongoInviteRepository } from '@/lib/repositories/invite.repository';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'owner') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const userRepo = new MongoUserRepository();
  const inviteRepo = new MongoInviteRepository();
  const sessionRepo = new MongoWorkoutSessionRepository();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [trainers, members, pendingInviteCount] = await Promise.all([
    userRepo.findByRole('trainer'),
    userRepo.findAllMembers(),
    inviteRepo.countPending(now),
  ]);
  const memberIds = members.map((m) => m._id.toString());
  const sessionsThisMonth = await sessionRepo.countByMemberIdsSince(memberIds, startOfMonth);

  return Response.json({
    trainerCount: trainers.length,
    memberCount: members.length,
    pendingInviteCount,
    sessionsThisMonth,
  });
}
