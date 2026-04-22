import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import type { UserRole } from '@/types/auth';

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role !== 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  await connectDB();
  const body = (await req.json()) as { memberPlanId: string; dayNumber: number };

  const memberPlanRepo = new MongoMemberPlanRepository();
  const plan = await memberPlanRepo.findActive(session.user.id);
  if (!plan) return Response.json({ error: 'No active plan' }, { status: 404 });

  const day = plan.days.find((d) => d.dayNumber === body.dayNumber);
  if (!day) return Response.json({ error: 'Day not found' }, { status: 404 });

  const sets = day.exercises.flatMap((ex) =>
    Array.from({ length: ex.sets }, (_, i) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      groupId: ex.groupId,
      isSuperset: ex.isSuperset,
      isBodyweight: ex.isBodyweight,
      setNumber: i + 1,
      prescribedRepsMin: ex.repsMin,
      prescribedRepsMax: ex.repsMax,
      isExtraSet: false,
      actualWeight: null,
      actualReps: null,
      completedAt: null,
    })),
  );

  const sessionRepo = new MongoWorkoutSessionRepository();
  const workoutSession = await sessionRepo.create({
    memberId: session.user.id,
    memberPlanId: body.memberPlanId,
    dayNumber: body.dayNumber,
    dayName: day.name,
    startedAt: new Date(),
    sets,
  });

  return Response.json(workoutSession, { status: 201 });
}

export async function GET(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const memberId = url.searchParams.get('memberId');
  if (!memberId) return Response.json({ error: 'memberId required' }, { status: 400 });

  const role = session.user.role as UserRole;
  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const sessionRepo = new MongoWorkoutSessionRepository();
  const sessions = await sessionRepo.findByMember(memberId);
  return Response.json(sessions);
}
