import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoWorkoutSessionRepository } from '@/lib/repositories/workout-session.repository';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import type { UserRole } from '@/types/auth';

export async function POST(req: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const url = new URL(req.url);
  const overwrite = url.searchParams.get('overwrite') === 'true';
  const body = (await req.json()) as { memberPlanId: string; dayNumber: number; memberId?: string };

  const role = session.user.role as UserRole;
  const targetMemberId =
    (role === 'trainer' || role === 'owner') && body.memberId
      ? body.memberId
      : session.user.id;
  const loggedBy = targetMemberId !== session.user.id ? session.user.id : null;

  const memberPlanRepo = new MongoMemberPlanRepository();
  const plan = await memberPlanRepo.findActive(targetMemberId);
  if (!plan) return Response.json({ error: 'No active plan' }, { status: 404 });

  const day = plan.days.find((d) => d.dayNumber === body.dayNumber);
  if (!day) return Response.json({ error: 'Day not found' }, { status: 404 });

  const sessionRepo = new MongoWorkoutSessionRepository();
  const todaySession = await sessionRepo.findToday(targetMemberId);

  if (todaySession) {
    if (todaySession.completedAt === null && todaySession.dayNumber === body.dayNumber) {
      return Response.json(todaySession, { status: 200 });
    }
    if (!overwrite) {
      return Response.json(
        {
          error: 'TODAY_ALREADY_LOGGED',
          existingSession: {
            _id: todaySession._id.toString(),
            dayName: todaySession.dayName,
            dayNumber: todaySession.dayNumber,
            startedAt: todaySession.startedAt,
          },
        },
        { status: 409 },
      );
    }
    await sessionRepo.delete(todaySession._id.toString());
  }

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

  const workoutSession = await sessionRepo.create({
    memberId: targetMemberId,
    memberPlanId: body.memberPlanId,
    dayNumber: body.dayNumber,
    dayName: day.name,
    startedAt: new Date(),
    sets,
    loggedBy,
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
  const resolvedMemberId = memberId === 'me' ? session.user.id : memberId;

  if (role === 'member' && session.user.id !== resolvedMemberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const yearParam = url.searchParams.get('year');
  const monthParam = url.searchParams.get('month');

  await connectDB();
  const sessionRepo = new MongoWorkoutSessionRepository();

  if (yearParam && monthParam) {
    const sessions = await sessionRepo.findByMonth(resolvedMemberId, parseInt(yearParam, 10), parseInt(monthParam, 10));
    return Response.json(sessions);
  }

  const sessions = await sessionRepo.findByMember(resolvedMemberId);
  return Response.json(sessions);
}
