// src/app/api/me/workout-logs/[id]/complete/route.ts
import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfWorkoutLogRepository } from '@/lib/repositories/self-workout-log.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
import { setsToPlanDays } from '@/lib/self-tracking/template-snapshot';

type RouteContext = { params: Promise<{ id: string }> };

interface SaveAsTemplate {
  name: string;
  description?: string;
}

interface CompleteBody {
  rpe?: number | null;
  note?: string | null;
  saveAsTemplate?: SaveAsTemplate;
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { id } = await params;

  let body: CompleteBody = {};
  try {
    body = (await req.json()) as CompleteBody;
  } catch {
    // empty body is fine
  }

  if (body.saveAsTemplate !== undefined) {
    if (!body.saveAsTemplate.name || body.saveAsTemplate.name.trim() === '') {
      return Response.json({ error: 'Template name is required' }, { status: 400 });
    }
  }

  await connectDB();
  const repo = new MongoSelfWorkoutLogRepository();
  const log = await repo.complete(id, guard.userId, body.rpe ?? null, body.note ?? null);
  if (!log) return Response.json({ error: 'Not found' }, { status: 404 });

  let createdTemplateId: string | undefined;
  if (body.saveAsTemplate) {
    const tplRepo = new MongoPlanTemplateRepository();
    const days = setsToPlanDays(log.sets, log.dayName);
    const tpl = await tplRepo.create({
      name: body.saveAsTemplate.name.trim(),
      description: body.saveAsTemplate.description ?? null,
      createdBy: guard.userId,
      days,
    });
    createdTemplateId = tpl._id.toString();
  }

  return Response.json({ ...log.toObject(), createdTemplateId });
}
