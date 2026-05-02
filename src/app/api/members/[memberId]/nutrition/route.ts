import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { getEmailService } from '@/lib/email/index';
import { MongoMemberNutritionPlanRepository } from '@/lib/repositories/member-nutrition-plan.repository';
import { MongoNutritionTemplateRepository } from '@/lib/repositories/nutrition-template.repository';
import { MongoUserRepository } from '@/lib/repositories/user.repository';
import type { UserRole } from '@/types/auth';

type RouteContext = { params: Promise<{ memberId: string }> };

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
  const body = (await req.json()) as { templateId: string };

  await connectDB();

  const userRepo = new MongoUserRepository();
  const member = await userRepo.findById(memberId);
  if (!member) return Response.json({ error: 'Member not found' }, { status: 404 });

  if (role === 'trainer' && member.trainerId?.toString() !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const templateRepo = new MongoNutritionTemplateRepository();
  const template = await templateRepo.findById(body.templateId);
  if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });

  const planRepo = new MongoMemberNutritionPlanRepository();
  await planRepo.deactivateAll(memberId);

  const plan = await planRepo.create({
    memberId,
    trainerId: session.user.id,
    templateId: body.templateId,
    name: template.name,
    dayTypes: JSON.parse(JSON.stringify(template.dayTypes)) as typeof template.dayTypes,
    assignedAt: new Date(),
  });

  try {
    await getEmailService().sendNutritionPlanAssigned({
      to: member.email,
      trainerName: session.user.name ?? 'Your trainer',
      planName: template.name,
    });
  } catch (e) {
    console.error('sendNutritionPlanAssigned failed:', e);
  }

  return Response.json(plan, { status: 201 });
}
