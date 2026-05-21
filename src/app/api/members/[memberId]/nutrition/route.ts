import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';
import type { ISchedule } from '@/lib/db/models/member-nutrition-plan.model';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

interface AssignBody {
  name: string;
  dayTypes: IDayType[];
  schedule: ISchedule;
  templateId?: string;
}

function isValidBody(b: unknown): b is AssignBody {
  if (!b || typeof b !== 'object') return false;
  const body = b as Record<string, unknown>;
  return (
    typeof body.name === 'string' &&
    body.name.trim().length > 0 &&
    Array.isArray(body.dayTypes) &&
    body.schedule !== null &&
    typeof body.schedule === 'object'
  );
}

export async function GET(_req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { memberId } = await params;
  const role = session.user.role as UserRole;

  if (role === 'member' && session.user.id !== memberId) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await connectDB();
  const repo = new MongoMemberNutritionPlanRepository();
  const plan = await repo.findActive(memberId);
  return Response.json(plan);
}

export async function POST(req: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role as UserRole;
  if (role === 'member') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const { memberId } = await params;
  const raw = await req.json();

  if (!isValidBody(raw)) {
    return Response.json({ error: 'Body must be {name, dayTypes, schedule}' }, { status: 400 });
  }

  const body: AssignBody = raw;

  await connectDB();

  const userRepo = new MongoUserRepository();
  const member = await userRepo.findById(memberId);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const planRepo = new MongoMemberNutritionPlanRepository();
  await planRepo.deactivateAll(memberId);

  const plan = await planRepo.create({
    memberId,
    assignedById: session.user.id,
    templateId: body.templateId ?? null,
    name: body.name,
    dayTypes: body.dayTypes,
    schedule: body.schedule,
    assignedAt: new Date(),
  });

  try {
    await getEmailService().sendNutritionPlanAssigned({
      to: member.email,
      trainerName: session.user.name ?? 'Your trainer',
      planName: body.name,
    });
  } catch (e) {
    console.error('sendNutritionPlanAssigned failed:', e);
  }

  return Response.json(plan, { status: 201 });
}
