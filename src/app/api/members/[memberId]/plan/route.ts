import { connectDB } from '@/lib/db/connect';
import { auth } from '@/lib/auth/auth';
import { MongoMemberPlanRepository } from '@/lib/repositories/member-plan.repository';
import { MongoPlanTemplateRepository } from '@/lib/repositories/plan-template.repository';
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
  const repo = new MongoMemberPlanRepository();
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

  const templateRepo = new MongoPlanTemplateRepository();
  const template = await templateRepo.findById(body.templateId);
  if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });

  const memberPlanRepo = new MongoMemberPlanRepository();
  await memberPlanRepo.deactivateAll(memberId);

  const plan = await memberPlanRepo.create({
    memberId,
    trainerId: session.user.id,
    templateId: body.templateId,
    name: template.name,
    days: JSON.parse(JSON.stringify(template.days)) as typeof template.days,
    assignedAt: new Date(),
  });

  return Response.json(plan, { status: 201 });
}
