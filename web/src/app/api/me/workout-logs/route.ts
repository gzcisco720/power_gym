import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import type { ISelfWorkoutSet } from '@/lib/db/models/self-workout-log.model';

interface PostBody {
  dayName?: string;
  sourceTemplateId?: string | null;
  sourceTemplateDayNumber?: number | null;
  plannedSets?: ISelfWorkoutSet[];
}

export async function POST(req: Request): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const deleteActive = url.searchParams.get('deleteActive') === 'true';
  const body = (await req.json()) as PostBody;
  if (!body.dayName || typeof body.dayName !== 'string') {
    return Response.json({ error: 'dayName is required' }, { status: 400 });
  }

  await connectDB();

  const repo = new MongoSelfWorkoutLogRepository();
  const activeLog = await repo.findActive(guard.userId);

  if (activeLog) {
    if (!deleteActive) {
      return Response.json(
        {
          error: 'ACTIVE_SESSION_EXISTS',
          activeSession: {
            _id: activeLog._id.toString(),
            dayName: activeLog.dayName,
            startedAt: activeLog.startedAt,
            setCount: activeLog.sets.filter((s) => s.completedAt !== null).length,
          },
        },
        { status: 409 },
      );
    }
    await repo.delete(activeLog._id.toString(), guard.userId);
  }

  const completedToday = await repo.findCompletedToday(guard.userId);
  if (completedToday) {
    return Response.json(
      {
        error: 'DAY_ALREADY_LOGGED',
        session: {
          _id: completedToday._id.toString(),
          dayName: completedToday.dayName,
        },
      },
      { status: 409 },
    );
  }

  const log = await repo.create({
    userId: guard.userId,
    startedAt: new Date(),
    sourceTemplateId: body.sourceTemplateId ?? null,
    sourceTemplateDayNumber: body.sourceTemplateDayNumber ?? null,
    dayName: body.dayName,
    sets: body.plannedSets ?? [],
  });

  return Response.json(log, { status: 201 });
}

export async function GET(req: Request): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;

  const url = new URL(req.url);
  const yearParam = url.searchParams.get('year');
  const monthParam = url.searchParams.get('month');
  if (!yearParam || !monthParam) {
    return Response.json({ error: 'year and month required' }, { status: 400 });
  }

  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const logs = await repo.findByUserMonth(guard.userId, parseInt(yearParam, 10), parseInt(monthParam, 10));
  return Response.json(logs);
}
