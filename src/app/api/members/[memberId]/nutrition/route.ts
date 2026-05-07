import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { IDayType } from '@/lib/db/models/nutrition-template.model';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

interface AssignFromTemplate { templateId: string }
interface AssignDirect { name: string; dayTypes: IDayType[] }
type AssignBody = AssignFromTemplate | AssignDirect;

function isFromTemplate(b: AssignBody): b is AssignFromTemplate {
  return typeof (b as AssignFromTemplate).templateId === 'string';
}
function isDirect(b: AssignBody): b is AssignDirect {
  return typeof (b as AssignDirect).name === 'string' && Array.isArray((b as AssignDirect).dayTypes);
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
  const body = (await req.json()) as AssignBody;

  if (!isFromTemplate(body) && !isDirect(body)) {
    return Response.json({ error: 'Body must be {templateId} or {name, dayTypes}' }, { status: 400 });
  }

  await connectDB();

  const userRepo = new MongoUserRepository();
  const member = await userRepo.findById(memberId);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const planRepo = new MongoMemberNutritionPlanRepository();

  let name: string;
  let dayTypes: IDayType[];
  let templateId: string | null;

  if (isFromTemplate(body)) {
    const templateRepo = new MongoNutritionTemplateRepository();
    const template = await templateRepo.findById(body.templateId);
    if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });
    name = template.name;
    dayTypes = template.toObject().dayTypes;
    templateId = body.templateId;
  } else {
    name = body.name;
    dayTypes = body.dayTypes;
    templateId = null;
  }

  await planRepo.deactivateAll(memberId);
  const plan = await planRepo.create({
    memberId,
    assignedById: session.user.id,
    templateId,
    name,
    dayTypes,
    assignedAt: new Date(),
  });

  try {
    await getEmailService().sendNutritionPlanAssigned({
      to: member.email,
      trainerName: session.user.name ?? 'Your trainer',
      planName: name,
    });
  } catch (e) {
    console.error('sendNutritionPlanAssigned failed:', e);
  }

  return Response.json(plan, { status: 201 });
}
