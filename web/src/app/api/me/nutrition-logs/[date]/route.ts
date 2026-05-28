import { connectDB } from '@/lib/db/connect';
import { requireSelfTrackingRole } from '@/lib/auth/self-tracking-access';
import { MongoSelfNutritionLogRepository } from '@/lib/repositories/self-nutrition-log.repository';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { mealsToDayType } from '@/lib/self-tracking/template-snapshot';
import type { ISelfMeal } from '@/lib/db/models/self-nutrition-log.model';

type RouteContext = { params: Promise<{ date: string }> };

interface PutBody {
  sourceTemplateId: string | null;
  sourceTemplateDayTypeName: string | null;
  dayLabel: string;
  meals: ISelfMeal[];
  dayCompleted: boolean;
  saveAsTemplate?: { name: string; description?: string };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { date } = await params;
  if (!DATE_RE.test(date)) return Response.json({ error: 'Invalid date' }, { status: 400 });
  await connectDB();
  const repo = new MongoSelfNutritionLogRepository();
  const log = await repo.findByDate(guard.userId, date);
  return Response.json(log);
}

export async function PUT(req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { date } = await params;
  if (!DATE_RE.test(date)) return Response.json({ error: 'Invalid date' }, { status: 400 });

  const body = (await req.json()) as PutBody;
  if (body.saveAsTemplate !== undefined) {
    if (!body.saveAsTemplate.name || body.saveAsTemplate.name.trim() === '') {
      return Response.json({ error: 'Template name is required' }, { status: 400 });
    }
  }

  await connectDB();
  const repo = new MongoSelfNutritionLogRepository();
  const log = await repo.upsertByDate(guard.userId, date, {
    sourceTemplateId: body.sourceTemplateId,
    sourceTemplateDayTypeName: body.sourceTemplateDayTypeName,
    dayLabel: body.dayLabel,
    meals: body.meals,
    dayCompleted: body.dayCompleted,
  });

  let createdTemplateId: string | undefined;
  if (body.saveAsTemplate) {
    const tplRepo = new MongoNutritionTemplateRepository();
    const dayType = mealsToDayType(log.meals, body.dayLabel);
    const tpl = await tplRepo.create({
      name: body.saveAsTemplate.name.trim(),
      description: body.saveAsTemplate.description ?? null,
      createdBy: guard.userId,
      dayTypes: [dayType],
    });
    createdTemplateId = tpl._id.toString();
  }

  return Response.json({ ...log.toObject(), createdTemplateId });
}

export async function DELETE(_req: Request, { params }: RouteContext): Promise<Response> {
  const guard = await requireSelfTrackingRole();
  if (!guard.ok) return guard.response;
  const { date } = await params;
  if (!DATE_RE.test(date)) return Response.json({ error: 'Invalid date' }, { status: 400 });
  await connectDB();
  const repo = new MongoSelfNutritionLogRepository();
  const ok = await repo.delete(guard.userId, date);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return new Response(null, { status: 204 });
}
