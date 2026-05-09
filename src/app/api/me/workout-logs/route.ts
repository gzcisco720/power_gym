import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
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

  const body = (await req.json()) as PostBody;
  if (!body.dayName || typeof body.dayName !== 'string') {
    return Response.json({ error: 'dayName is required' }, { status: 400 });
  }

  await connectDB();

  if (body.sourceTemplateId) {
    const tplRepo = new MongoPlanTemplateRepository();
    const tpl = await tplRepo.findById(body.sourceTemplateId);
    if (!tpl) return Response.json({ error: 'Template not found' }, { status: 404 });
  }

  const repo = new MongoSelfWorkoutLogRepository();

  // Refuse to spawn a second active log. The cockpit's ActiveSessionPrompt
  // is responsible for surfacing the existing one to the user (resume,
  // discard, or seal it before starting fresh).
  const existingActive = await repo.findActive(guard.userId);
  if (existingActive) {
    return Response.json(
      {
        error: 'ACTIVE_SESSION_CONFLICT',
        activeSession: {
          _id: existingActive._id.toString(),
          dayName: existingActive.dayName,
          startedAt: existingActive.startedAt,
          lastActivityAt: existingActive.lastActivityAt,
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
